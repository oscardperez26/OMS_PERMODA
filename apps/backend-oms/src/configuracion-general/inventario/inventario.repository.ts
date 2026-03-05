import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateInventarioInput,
  InventarioBodegaListItem,
  InventarioBootstrapData,
  InventarioEmpresaListItem,
  InventarioListItem,
  InventarioVarianteListItem,
  UpdateInventarioInput,
} from './inventario.types';

type InventarioRow = {
  InventarioId: string | number;
  EmpresaId: number;
  BodegaId: number;
  VarianteId: string | number;
  StockTotal: number;
  StockReservado: number;
  UpdatedAt: Date;
};

type InventarioIdentityRow = {
  InventarioId: string | number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type BodegaRow = {
  BodegaId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  Activo: boolean;
};

type VarianteRow = {
  VarianteId: string | number;
  EmpresaId: number;
  ProductoId: number;
  ProductoNombre: string | null;
  ProductoSKUBase: string | null;
  SKU: string;
  Nombre: string | null;
  Activo: boolean;
};

@Injectable()
export class InventarioRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<InventarioListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<InventarioRow>>(
      (pool) =>
        pool.request().query<InventarioRow>(`
          SELECT
            [InventarioId],
            [EmpresaId],
            [BodegaId],
            [VarianteId],
            [StockTotal],
            [StockReservado],
            [UpdatedAt]
          FROM [oms].[Inventario]
          ORDER BY [InventarioId] DESC
        `),
      'inventario.list',
    );

    return result.recordset.map((row) => this.mapInventarioRow(row));
  }

  async listBootstrapData(): Promise<InventarioBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [InventarioId],
            [EmpresaId],
            [BodegaId],
            [VarianteId],
            [StockTotal],
            [StockReservado],
            [UpdatedAt]
          FROM [oms].[Inventario]
          ORDER BY [InventarioId] DESC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [BodegaId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Activo]
          FROM [oms].[Bodega]
          ORDER BY [Nombre] ASC, [BodegaId] ASC;

          SELECT
            pv.[VarianteId],
            pv.[EmpresaId],
            pv.[ProductoId],
            p.[Nombre] AS [ProductoNombre],
            p.[SKUBase] AS [ProductoSKUBase],
            pv.[SKU],
            pv.[Nombre],
            pv.[Activo]
          FROM [oms].[ProductoVariante] pv
          LEFT JOIN [oms].[Producto] p
            ON p.[ProductoId] = pv.[ProductoId]
          ORDER BY pv.[VarianteId] DESC;
        `),
      'inventario.listBootstrapData',
    );

    const inventarioRows = (result.recordsets?.[0] ?? []) as InventarioRow[];
    const empresaRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const bodegaRows = (result.recordsets?.[2] ?? []) as BodegaRow[];
    const varianteRows = (result.recordsets?.[3] ?? []) as VarianteRow[];

    return {
      inventarios: inventarioRows.map((row) => this.mapInventarioRow(row)),
      empresas: empresaRows.map((row) => this.mapEmpresaRow(row)),
      bodegas: bodegaRows.map((row) => this.mapBodegaRow(row)),
      variantes: varianteRows.map((row) => this.mapVarianteRow(row)),
    };
  }

  async findById(inventarioId: number): Promise<InventarioListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<InventarioRow>>(
      (pool) =>
        pool
          .request()
          .input('inventarioId', sql.BigInt, inventarioId)
          .query<InventarioRow>(`
            SELECT
              [InventarioId],
              [EmpresaId],
              [BodegaId],
              [VarianteId],
              [StockTotal],
              [StockReservado],
              [UpdatedAt]
            FROM [oms].[Inventario]
            WHERE [InventarioId] = @inventarioId
          `),
      'inventario.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapInventarioRow(row);
  }

  async existsByBodegaAndVariante(
    bodegaId: number,
    varianteId: number,
    excludeInventarioId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('bodegaId', sql.Int, bodegaId)
          .input('varianteId', sql.BigInt, varianteId)
          .input('excludeInventarioId', sql.BigInt, excludeInventarioId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Inventario]
            WHERE [BodegaId] = @bodegaId
              AND [VarianteId] = @varianteId
              AND (@excludeInventarioId IS NULL OR [InventarioId] <> @excludeInventarioId)
          `),
      'inventario.existsByBodegaAndVariante',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsEmpresaById(empresaId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Empresa]
            WHERE [EmpresaId] = @empresaId
          `),
      'inventario.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsBodegaByIdAndEmpresaId(
    bodegaId: number,
    empresaId: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('bodegaId', sql.Int, bodegaId)
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Bodega]
            WHERE [BodegaId] = @bodegaId
              AND [EmpresaId] = @empresaId
          `),
      'inventario.existsBodegaByIdAndEmpresaId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsVarianteByIdAndEmpresaId(
    varianteId: number,
    empresaId: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('varianteId', sql.BigInt, varianteId)
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[ProductoVariante]
            WHERE [VarianteId] = @varianteId
              AND [EmpresaId] = @empresaId
          `),
      'inventario.existsVarianteByIdAndEmpresaId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateInventarioInput): Promise<{ inventarioId: number }> {
    const result = await this.databaseService.execute<sql.IResult<InventarioIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('BodegaId', sql.Int, input.bodegaId)
          .input('VarianteId', sql.BigInt, input.varianteId)
          .input('StockTotal', sql.Int, input.stockTotal)
          .input('StockReservado', sql.Int, input.stockReservado)
          .query<InventarioIdentityRow>(`
            INSERT INTO [oms].[Inventario]
            (
              [EmpresaId],
              [BodegaId],
              [VarianteId],
              [StockTotal],
              [StockReservado],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[InventarioId]
            VALUES
            (
              @EmpresaId,
              @BodegaId,
              @VarianteId,
              @StockTotal,
              @StockReservado,
              SYSUTCDATETIME()
            )
          `),
      'inventario.create',
    );

    return { inventarioId: Number(result.recordset[0].InventarioId) };
  }

  async update(inventarioId: number, input: UpdateInventarioInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('inventarioId', sql.BigInt, inventarioId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('bodegaId', sql.Int, input.bodegaId)
          .input('varianteId', sql.BigInt, input.varianteId)
          .input('stockTotal', sql.Int, input.stockTotal)
          .input('stockReservado', sql.Int, input.stockReservado)
          .query(`
            UPDATE [oms].[Inventario]
            SET
              [EmpresaId] = @empresaId,
              [BodegaId] = @bodegaId,
              [VarianteId] = @varianteId,
              [StockTotal] = @stockTotal,
              [StockReservado] = @stockReservado,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [InventarioId] = @inventarioId
          `),
      'inventario.update',
    );
  }

  private mapInventarioRow(row: InventarioRow): InventarioListItem {
    const stockTotal = Number(row.StockTotal);
    const stockReservado = Number(row.StockReservado);
    return {
      inventarioId: Number(row.InventarioId),
      empresaId: row.EmpresaId,
      bodegaId: row.BodegaId,
      varianteId: Number(row.VarianteId),
      stockTotal,
      stockReservado,
      stockDisponible: Math.max(0, stockTotal - stockReservado),
      updatedAt: row.UpdatedAt.toISOString(),
    };
  }

  private mapEmpresaRow(row: EmpresaRow): InventarioEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapBodegaRow(row: BodegaRow): InventarioBodegaListItem {
    return {
      bodegaId: row.BodegaId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      activo: row.Activo,
    };
  }

  private mapVarianteRow(row: VarianteRow): InventarioVarianteListItem {
    return {
      varianteId: Number(row.VarianteId),
      empresaId: row.EmpresaId,
      productoId: row.ProductoId,
      productoNombre: row.ProductoNombre ?? undefined,
      productoSkuBase: row.ProductoSKUBase ?? undefined,
      sku: row.SKU,
      nombre: row.Nombre ?? undefined,
      activo: row.Activo,
    };
  }
}
