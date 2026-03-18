import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateProductoInput,
  ProductoBootstrapData,
  ProductoCategoriaListItem,
  ProductoEmpresaListItem,
  ProductoListItem,
  UpdateProductoInput,
} from './producto.types';

type ProductoRow = {
  ProductoId: number;
  EmpresaId: number;
  CategoriaId: number | null;
  CategoriaNombre: string | null;
  SKUBase: string | null;
  Nombre: string;
  Marca: string | null;
  Descripcion: string | null;
  Activo: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
  ZiSyncedAt: Date | null;
};

type ProductoIdentityRow = {
  ProductoId: number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type CategoriaRow = {
  CategoriaId: number;
  EmpresaId: number;
  Nombre: string;
  Activo: boolean;
};

@Injectable()
export class ProductoRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(search?: string): Promise<ProductoListItem[]> {
    const searchParam = search && search.length > 0 ? `%${search}%` : null;
    const result = await this.databaseService.execute<sql.IResult<ProductoRow>>(
      (pool) =>
        pool
          .request()
          .input('search', sql.NVarChar(255), searchParam)
          .query<ProductoRow>(`
          SELECT
            p.[ProductoId],
            p.[EmpresaId],
            p.[CategoriaId],
            c.[Nombre] AS [CategoriaNombre],
            p.[SKUBase],
            p.[Nombre],
            p.[Marca],
            p.[Descripcion],
            p.[Activo],
            p.[CreatedAt],
            p.[UpdatedAt],
            p.[ZiSyncedAt]
          FROM [oms].[Producto] p
          LEFT JOIN [oms].[Categoria] c
            ON c.[CategoriaId] = p.[CategoriaId]
          WHERE (
            @search IS NULL
            OR p.[SKUBase] LIKE @search
            OR p.[Nombre] LIKE @search
            OR ISNULL(p.[Marca], '') LIKE @search
          )
          ORDER BY p.[Nombre] ASC, p.[ProductoId] ASC
        `),
      'producto.list',
    );

    return result.recordset.map((row) => this.mapProductoRow(row));
  }

  async listBootstrapData(): Promise<ProductoBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            p.[ProductoId],
            p.[EmpresaId],
            p.[CategoriaId],
            c.[Nombre] AS [CategoriaNombre],
            p.[SKUBase],
            p.[Nombre],
            p.[Marca],
            p.[Descripcion],
            p.[Activo],
            p.[CreatedAt],
            p.[UpdatedAt],
            p.[ZiSyncedAt]
          FROM [oms].[Producto] p
          LEFT JOIN [oms].[Categoria] c
            ON c.[CategoriaId] = p.[CategoriaId]
          ORDER BY p.[Nombre] ASC, p.[ProductoId] ASC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [CategoriaId],
            [EmpresaId],
            [Nombre],
            [Activo]
          FROM [oms].[Categoria]
          WHERE [Activo] = 1
          ORDER BY [Nombre] ASC, [CategoriaId] ASC;
        `),
      'producto.listBootstrapData',
    );

    const productoRows = (result.recordsets?.[0] ?? []) as ProductoRow[];
    const empresaRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const categoriaRows = (result.recordsets?.[2] ?? []) as CategoriaRow[];

    return {
      productos: productoRows.map((row) => this.mapProductoRow(row)),
      empresas: empresaRows.map((row) => this.mapEmpresaRow(row)),
      categorias: categoriaRows.map((row) => this.mapCategoriaRow(row)),
    };
  }

  async findById(productoId: number): Promise<ProductoListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<ProductoRow>>(
      (pool) =>
        pool.request().input('productoId', sql.Int, productoId)
          .query<ProductoRow>(`
            SELECT
              p.[ProductoId],
              p.[EmpresaId],
              p.[CategoriaId],
              c.[Nombre] AS [CategoriaNombre],
              p.[SKUBase],
              p.[Nombre],
              p.[Marca],
              p.[Descripcion],
              p.[Activo],
              p.[CreatedAt],
              p.[UpdatedAt],
              p.[ZiSyncedAt]
            FROM [oms].[Producto] p
            LEFT JOIN [oms].[Categoria] c
              ON c.[CategoriaId] = p.[CategoriaId]
            WHERE p.[ProductoId] = @productoId
          `),
      'producto.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapProductoRow(row);
  }

  async existsByEmpresaAndSkuBase(
    empresaId: number,
    skuBase: string,
    excludeProductoId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('skuBase', sql.NVarChar(120), skuBase)
          .input('excludeProductoId', sql.Int, excludeProductoId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Producto]
            WHERE [EmpresaId] = @empresaId
              AND [SKUBase] = @skuBase
              AND (@excludeProductoId IS NULL OR [ProductoId] <> @excludeProductoId)
          `),
      'producto.existsByEmpresaAndSkuBase',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsEmpresaById(empresaId: number): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool.request().input('empresaId', sql.Int, empresaId).query<{
          count: number;
        }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Empresa]
            WHERE [EmpresaId] = @empresaId
          `),
      'producto.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateProductoInput): Promise<{ productoId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<ProductoIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('SKUBase', sql.NVarChar(120), input.skuBase)
          .input('Nombre', sql.NVarChar(255), input.nombre)
          .input('Activo', sql.Bit, input.activo).query<ProductoIdentityRow>(`
            INSERT INTO [oms].[Producto]
            (
              [EmpresaId],
              [SKUBase],
              [Nombre],
              [Activo],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[ProductoId]
            VALUES
            (
              @EmpresaId,
              @SKUBase,
              @Nombre,
              @Activo,
              NULL
            )
          `),
      'producto.create',
    );

    return { productoId: result.recordset[0].ProductoId };
  }

  async update(productoId: number, input: UpdateProductoInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('productoId', sql.Int, productoId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('skuBase', sql.NVarChar(120), input.skuBase)
          .input('nombre', sql.NVarChar(255), input.nombre)
          .input('activo', sql.Bit, input.activo).query(`
            UPDATE [oms].[Producto]
            SET
              [EmpresaId] = @empresaId,
              [SKUBase] = @skuBase,
              [Nombre] = @nombre,
              [Activo] = @activo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [ProductoId] = @productoId
          `),
      'producto.update',
    );
  }

  private mapProductoRow(row: ProductoRow): ProductoListItem {
    return {
      productoId: row.ProductoId,
      empresaId: row.EmpresaId,
      categoriaId: row.CategoriaId ?? null,
      categoriaNombre: row.CategoriaNombre ?? null,
      skuBase: row.SKUBase ?? undefined,
      nombre: row.Nombre,
      marca: row.Marca ?? null,
      descripcion: row.Descripcion ?? null,
      activo: row.Activo,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
      ziSyncedAt: row.ZiSyncedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): ProductoEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapCategoriaRow(row: CategoriaRow): ProductoCategoriaListItem {
    return {
      categoriaId: row.CategoriaId,
      empresaId: row.EmpresaId,
      nombre: row.Nombre,
      activo: row.Activo,
    };
  }
}
