import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateProductoVarianteInput,
  ProductoVarianteBootstrapData,
  ProductoVarianteEmpresaListItem,
  ProductoVarianteListItem,
  ProductoVarianteProductoListItem,
  UpdateProductoVarianteInput,
} from './producto-variante.types';

type VarianteRow = {
  VarianteId: string | number;
  EmpresaId: number;
  ProductoId: number;
  SKU: string;
  EAN: string | null;
  Nombre: string | null;
  PesoKg: string | number | null;
  LargoCm: string | number | null;
  AnchoCm: string | number | null;
  AltoCm: string | number | null;
  Activo: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type VarianteIdentityRow = {
  VarianteId: string | number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type ProductoRow = {
  ProductoId: number;
  EmpresaId: number;
  SKUBase: string | null;
  Nombre: string;
  Activo: boolean;
};

@Injectable()
export class ProductoVarianteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<ProductoVarianteListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<VarianteRow>>(
      (pool) =>
        pool.request().query<VarianteRow>(`
          SELECT
            [VarianteId],
            [EmpresaId],
            [ProductoId],
            [SKU],
            [EAN],
            [Nombre],
            [PesoKg],
            [LargoCm],
            [AnchoCm],
            [AltoCm],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[ProductoVariante]
          ORDER BY [VarianteId] DESC
        `),
      'productoVariante.list',
    );

    return result.recordset.map((row) => this.mapVarianteRow(row));
  }

  async listBootstrapData(): Promise<ProductoVarianteBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [VarianteId],
            [EmpresaId],
            [ProductoId],
            [SKU],
            [EAN],
            [Nombre],
            [PesoKg],
            [LargoCm],
            [AnchoCm],
            [AltoCm],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[ProductoVariante]
          ORDER BY [VarianteId] DESC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [ProductoId],
            [EmpresaId],
            [SKUBase],
            [Nombre],
            [Activo]
          FROM [oms].[Producto]
          ORDER BY [Nombre] ASC, [ProductoId] ASC;
        `),
      'productoVariante.listBootstrapData',
    );

    const varianteRows = (result.recordsets?.[0] ?? []) as VarianteRow[];
    const empresaRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const productoRows = (result.recordsets?.[2] ?? []) as ProductoRow[];

    return {
      variantes: varianteRows.map((row) => this.mapVarianteRow(row)),
      empresas: empresaRows.map((row) => this.mapEmpresaRow(row)),
      productos: productoRows.map((row) => this.mapProductoRow(row)),
    };
  }

  async findById(varianteId: number): Promise<ProductoVarianteListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<VarianteRow>>(
      (pool) =>
        pool
          .request()
          .input('varianteId', sql.BigInt, varianteId)
          .query<VarianteRow>(`
            SELECT
              [VarianteId],
              [EmpresaId],
              [ProductoId],
              [SKU],
              [EAN],
              [Nombre],
              [PesoKg],
              [LargoCm],
              [AnchoCm],
              [AltoCm],
              [Activo],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[ProductoVariante]
            WHERE [VarianteId] = @varianteId
          `),
      'productoVariante.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapVarianteRow(row);
  }

  async existsByEmpresaAndSku(
    empresaId: number,
    sku: string,
    excludeVarianteId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('sku', sql.NVarChar(120), sku)
          .input('excludeVarianteId', sql.BigInt, excludeVarianteId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[ProductoVariante]
            WHERE [EmpresaId] = @empresaId
              AND [SKU] = @sku
              AND (@excludeVarianteId IS NULL OR [VarianteId] <> @excludeVarianteId)
          `),
      'productoVariante.existsByEmpresaAndSku',
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
      'productoVariante.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsProductoByIdAndEmpresaId(
    productoId: number,
    empresaId: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('productoId', sql.Int, productoId)
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Producto]
            WHERE [ProductoId] = @productoId
              AND [EmpresaId] = @empresaId
          `),
      'productoVariante.existsProductoByIdAndEmpresaId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateProductoVarianteInput): Promise<{ varianteId: number }> {
    const result = await this.databaseService.execute<sql.IResult<VarianteIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('ProductoId', sql.Int, input.productoId)
          .input('SKU', sql.NVarChar(120), input.sku)
          .input('EAN', sql.NVarChar(120), input.ean)
          .input('Nombre', sql.NVarChar(255), input.nombre)
          .input('PesoKg', sql.Decimal(18, 4), input.pesoKg)
          .input('LargoCm', sql.Decimal(18, 4), input.largoCm)
          .input('AnchoCm', sql.Decimal(18, 4), input.anchoCm)
          .input('AltoCm', sql.Decimal(18, 4), input.altoCm)
          .input('Activo', sql.Bit, input.activo)
          .query<VarianteIdentityRow>(`
            INSERT INTO [oms].[ProductoVariante]
            (
              [EmpresaId],
              [ProductoId],
              [SKU],
              [EAN],
              [Nombre],
              [PesoKg],
              [LargoCm],
              [AnchoCm],
              [AltoCm],
              [Activo],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[VarianteId]
            VALUES
            (
              @EmpresaId,
              @ProductoId,
              @SKU,
              @EAN,
              @Nombre,
              @PesoKg,
              @LargoCm,
              @AnchoCm,
              @AltoCm,
              @Activo,
              NULL
            )
          `),
      'productoVariante.create',
    );

    return { varianteId: Number(result.recordset[0].VarianteId) };
  }

  async update(varianteId: number, input: UpdateProductoVarianteInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('varianteId', sql.BigInt, varianteId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('productoId', sql.Int, input.productoId)
          .input('sku', sql.NVarChar(120), input.sku)
          .input('ean', sql.NVarChar(120), input.ean)
          .input('nombre', sql.NVarChar(255), input.nombre)
          .input('pesoKg', sql.Decimal(18, 4), input.pesoKg)
          .input('largoCm', sql.Decimal(18, 4), input.largoCm)
          .input('anchoCm', sql.Decimal(18, 4), input.anchoCm)
          .input('altoCm', sql.Decimal(18, 4), input.altoCm)
          .input('activo', sql.Bit, input.activo)
          .query(`
            UPDATE [oms].[ProductoVariante]
            SET
              [EmpresaId] = @empresaId,
              [ProductoId] = @productoId,
              [SKU] = @sku,
              [EAN] = @ean,
              [Nombre] = @nombre,
              [PesoKg] = @pesoKg,
              [LargoCm] = @largoCm,
              [AnchoCm] = @anchoCm,
              [AltoCm] = @altoCm,
              [Activo] = @activo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [VarianteId] = @varianteId
          `),
      'productoVariante.update',
    );
  }

  private mapVarianteRow(row: VarianteRow): ProductoVarianteListItem {
    return {
      varianteId: Number(row.VarianteId),
      empresaId: row.EmpresaId,
      productoId: row.ProductoId,
      sku: row.SKU,
      ean: row.EAN ?? undefined,
      nombre: row.Nombre ?? undefined,
      pesoKg: row.PesoKg === null ? undefined : Number(row.PesoKg),
      largoCm: row.LargoCm === null ? undefined : Number(row.LargoCm),
      anchoCm: row.AnchoCm === null ? undefined : Number(row.AnchoCm),
      altoCm: row.AltoCm === null ? undefined : Number(row.AltoCm),
      activo: row.Activo,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): ProductoVarianteEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapProductoRow(row: ProductoRow): ProductoVarianteProductoListItem {
    return {
      productoId: row.ProductoId,
      empresaId: row.EmpresaId,
      skuBase: row.SKUBase ?? undefined,
      nombre: row.Nombre,
      activo: row.Activo,
    };
  }
}
