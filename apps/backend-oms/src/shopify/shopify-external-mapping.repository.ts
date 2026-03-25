import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type {
  ExternalProductMappingRow,
  ExternalVariantMappingRow,
  UpsertProductMappingInput,
  UpsertVariantMappingInput,
} from './shopify-sync.types';

// ------------------------------------------------------------
// Tipos de filas de BD (internos)
// ------------------------------------------------------------

type ProductoExternoDbRow = {
  IntegracionProductoExternoId: number;
  IntegracionSalienteId: number;
  ProductoId: number;
  ExternalProductId: string;
  Estado: string;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type VarianteExternaDbRow = {
  IntegracionVarianteExternaId: number;
  IntegracionSalienteId: number;
  ProductoId: number;
  VarianteId: number;
  ExternalVariantId: string;
  InventoryItemId: string | null;
  Estado: string;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

/**
 * Gestiona la persistencia de IDs externos de Shopify:
 * - oms.IntegracionProductoExterno — mapping producto OMS ↔ Shopify GID
 * - oms.IntegracionVarianteExterna — mapping variante OMS ↔ Shopify GID + InventoryItemId
 *
 * Todas las operaciones de escritura usan MERGE para idempotencia.
 */
@Injectable()
export class ShopifyExternalMappingRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // ----------------------------------------------------------
  // Lecturas
  // ----------------------------------------------------------

  async findProductMapping(
    integracionSalienteId: number,
    productoId: number,
  ): Promise<ExternalProductMappingRow | null> {
    const result = await this.databaseService.execute<
      sql.IResult<ProductoExternoDbRow>
    >(
      (pool) =>
        pool
          .request()
          .input('integracionSalienteId', sql.Int, integracionSalienteId)
          .input('productoId', sql.Int, productoId)
          .query<ProductoExternoDbRow>(`
            SELECT TOP (1)
              [IntegracionProductoExternoId],
              [IntegracionSalienteId],
              [ProductoId],
              [ExternalProductId],
              [Estado],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[IntegracionProductoExterno]
            WHERE [IntegracionSalienteId] = @integracionSalienteId
              AND [ProductoId]            = @productoId
          `),
      'shopifyMapping.findProductMapping',
    );

    const row = result.recordset[0];
    if (!row) return null;

    return this.mapProductoRow(row);
  }

  async findVariantMappings(
    integracionSalienteId: number,
    productoId: number,
  ): Promise<ExternalVariantMappingRow[]> {
    const result = await this.databaseService.execute<
      sql.IResult<VarianteExternaDbRow>
    >(
      (pool) =>
        pool
          .request()
          .input('integracionSalienteId', sql.Int, integracionSalienteId)
          .input('productoId', sql.Int, productoId)
          .query<VarianteExternaDbRow>(`
            SELECT
              [IntegracionVarianteExternaId],
              [IntegracionSalienteId],
              [ProductoId],
              [VarianteId],
              [ExternalVariantId],
              [InventoryItemId],
              [Estado],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[IntegracionVarianteExterna]
            WHERE [IntegracionSalienteId] = @integracionSalienteId
              AND [ProductoId]            = @productoId
            ORDER BY [VarianteId] ASC
          `),
      'shopifyMapping.findVariantMappings',
    );

    return result.recordset.map((r) => this.mapVarianteRow(r));
  }

  // ----------------------------------------------------------
  // Escrituras — MERGE (idempotente)
  // ----------------------------------------------------------

  async upsertProductMapping(input: UpsertProductMappingInput): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('integracionSalienteId', sql.Int, input.integracionSalienteId)
          .input('productoId', sql.Int, input.productoId)
          .input('externalProductId', sql.NVarChar(160), input.externalProductId)
          .input('estado', sql.NVarChar(40), input.estado).query(`
            MERGE [oms].[IntegracionProductoExterno] AS target
            USING (
              SELECT
                @integracionSalienteId AS IntegracionSalienteId,
                @productoId            AS ProductoId
            ) AS source
              ON target.[IntegracionSalienteId] = source.[IntegracionSalienteId]
             AND target.[ProductoId]            = source.[ProductoId]
            WHEN MATCHED THEN
              UPDATE SET
                [ExternalProductId] = @externalProductId,
                [Estado]            = @estado,
                [UpdatedAt]         = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT (
                [IntegracionSalienteId],
                [ProductoId],
                [ExternalProductId],
                [Estado]
              )
              VALUES (
                @integracionSalienteId,
                @productoId,
                @externalProductId,
                @estado
              );
          `),
      'shopifyMapping.upsertProductMapping',
    );
  }

  /**
   * Upsert de variantes externas. Se procesa una por una para mantener
   * el código simple en esta fase (los batches son pequeños, una variante
   * de producto tiene pocas decenas de registros).
   */
  async upsertVariantMappings(
    inputs: UpsertVariantMappingInput[],
  ): Promise<void> {
    for (const input of inputs) {
      await this.upsertSingleVariantMapping(input);
    }
  }

  private async upsertSingleVariantMapping(
    input: UpsertVariantMappingInput,
  ): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('integracionSalienteId', sql.Int, input.integracionSalienteId)
          .input('productoId', sql.Int, input.productoId)
          .input('varianteId', sql.Int, input.varianteId)
          .input('externalVariantId', sql.NVarChar(160), input.externalVariantId)
          .input(
            'inventoryItemId',
            sql.NVarChar(160),
            input.inventoryItemId ?? null,
          )
          .input('estado', sql.NVarChar(40), input.estado).query(`
            MERGE [oms].[IntegracionVarianteExterna] AS target
            USING (
              SELECT
                @integracionSalienteId AS IntegracionSalienteId,
                @varianteId            AS VarianteId
            ) AS source
              ON target.[IntegracionSalienteId] = source.[IntegracionSalienteId]
             AND target.[VarianteId]            = source.[VarianteId]
            WHEN MATCHED THEN
              UPDATE SET
                [ExternalVariantId] = @externalVariantId,
                [InventoryItemId]   = @inventoryItemId,
                [Estado]            = @estado,
                [UpdatedAt]         = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT (
                [IntegracionSalienteId],
                [ProductoId],
                [VarianteId],
                [ExternalVariantId],
                [InventoryItemId],
                [Estado]
              )
              VALUES (
                @integracionSalienteId,
                @productoId,
                @varianteId,
                @externalVariantId,
                @inventoryItemId,
                @estado
              );
          `),
      'shopifyMapping.upsertVariantMapping',
    );
  }

  // ----------------------------------------------------------
  // Mappers fila DB → tipo TS
  // ----------------------------------------------------------

  private mapProductoRow(row: ProductoExternoDbRow): ExternalProductMappingRow {
    return {
      integracionProductoExternoId: Number(row.IntegracionProductoExternoId),
      integracionSalienteId: Number(row.IntegracionSalienteId),
      productoId: Number(row.ProductoId),
      externalProductId: row.ExternalProductId,
      estado: row.Estado,
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
    };
  }

  private mapVarianteRow(
    row: VarianteExternaDbRow,
  ): ExternalVariantMappingRow {
    return {
      integracionVarianteExternaId: Number(row.IntegracionVarianteExternaId),
      integracionSalienteId: Number(row.IntegracionSalienteId),
      productoId: Number(row.ProductoId),
      varianteId: Number(row.VarianteId),
      externalVariantId: row.ExternalVariantId,
      inventoryItemId: row.InventoryItemId,
      estado: row.Estado,
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
    };
  }
}
