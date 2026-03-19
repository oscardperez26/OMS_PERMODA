import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../database/database.service';
import { ZiCatalogQueryDto } from './zi-catalog-query.dto';
import type {
  ZiCatalogListResult,
  ZiCatalogProductoDetalle,
} from './zi-catalog.types';

type ListProductoRow = {
  ProductoId: number;
  SKUBase: string | null;
  Nombre: string;
  Marca: string | null;
  Activo: boolean;
  CategoriaNombre: string | null;
  CategoriaId: number | null;
  TotalVariantes: number;
  PrecioMin: number | string | null;
  PrecioMax: number | string | null;
  StockTotal: number;
  ZiSyncedAt: Date | null;
};

type CountRow = {
  Total: number;
};

type ProductoDetalleRow = {
  ProductoId: number;
  SKUBase: string | null;
  Nombre: string;
  Marca: string | null;
  Activo: boolean;
  Descripcion: string | null;
  DescripcionCorta: string | null;
  MetaTitulo: string | null;
  MetaDescripcion: string | null;
  Url: string | null;
  CategoriaNombre: string | null;
  InstruccionesCuidado: string | null;
  ZiSyncedAt: Date | null;
};

type VarianteRow = {
  VarianteId: number;
  SKU: string | null;
  EAN: string | null;
  TallaId: string | null;
  ColorId: string | null;
  NombreTalla: string | null;
  NombreColor: string | null;
  StockTotal: number | null;
  StockDisponible: number | null;
};

type TarifaRow = {
  TarifaPrecioId: number;
  ComercialChannel: string;
  MonedaCodigo: string;
  ImpuestoPct: number | string;
  PrecioBase: number | string;
  TieneOfertaActiva: boolean | number;
  PrecioOferta: number | string | null;
};

type MarcaRow = {
  Marca: string;
};

type CategoriaRow = {
  CategoriaId: number;
  Nombre: string;
  Total: number;
};

@Injectable()
export class ZiCatalogRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listProductos(
    empresaId: number,
    query: ZiCatalogQueryDto,
  ): Promise<ZiCatalogListResult> {
    const normalizedSearch = query.search?.trim() || null;
    const normalizedCategoriaId = query.categoriaId?.trim() || null;
    const normalizedMarca = query.marca?.trim() || null;
    const soloConStock = query.soloConStock === true;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const offsetRows = (page - 1) * pageSize;

    const cte = `
      WITH
      VariantesCTE AS (
        SELECT [ProductoId], COUNT(*) AS [TotalVariantes]
        FROM [oms].[ProductoVariante]
        WHERE [EmpresaId] = @EmpresaId
          AND [OrigenDatos] = 'ZI'
        GROUP BY [ProductoId]
      ),
      StockCTE AS (
        SELECT
          pv.[ProductoId],
          SUM(i.[StockTotal]) AS [StockTotal]
        FROM [oms].[Inventario] i
        INNER JOIN [oms].[ProductoVariante] pv
          ON pv.[VarianteId] = i.[VarianteId]
          AND pv.[EmpresaId] = @EmpresaId
          AND pv.[OrigenDatos] = 'ZI'
        WHERE i.[EmpresaId] = @EmpresaId
        GROUP BY pv.[ProductoId]
      ),
      PrecioCTE AS (
        SELECT
          pv.[ProductoId],
          MIN(tpd.[Precio]) AS [PrecioMin],
          MAX(tpd.[Precio]) AS [PrecioMax]
        FROM [oms].[TarifaPrecio] tp
        INNER JOIN [oms].[TarifaPrecioDetalle] tpd
          ON tpd.[TarifaPrecioId] = tp.[TarifaPrecioId]
        INNER JOIN [oms].[ProductoVariante] pv
          ON pv.[VarianteId] = tpd.[VarianteId]
          AND pv.[EmpresaId] = @EmpresaId
          AND pv.[OrigenDatos] = 'ZI'
        WHERE tp.[EmpresaId] = @EmpresaId
          AND tp.[Activo] = 1
        GROUP BY pv.[ProductoId]
      )
    `;

    const baseSelect = `
      SELECT
        p.[ProductoId],
        p.[SKUBase],
        p.[Nombre],
        p.[Marca],
        p.[Activo],
        p.[ZiSyncedAt],
        p.[CategoriaId],
        c.[Nombre] AS [CategoriaNombre],
        ISNULL(v.[TotalVariantes], 0) AS [TotalVariantes],
        ISNULL(s.[StockTotal], 0) AS [StockTotal],
        pr.[PrecioMin],
        pr.[PrecioMax]
      FROM [oms].[Producto] p
      LEFT JOIN [oms].[Categoria] c
        ON c.[CategoriaId] = p.[CategoriaId]
      LEFT JOIN VariantesCTE v
        ON v.[ProductoId] = p.[ProductoId]
      LEFT JOIN StockCTE s
        ON s.[ProductoId] = p.[ProductoId]
      LEFT JOIN PrecioCTE pr
        ON pr.[ProductoId] = p.[ProductoId]
      WHERE p.[EmpresaId] = @EmpresaId
        AND p.[OrigenDatos] = 'ZI'
        AND (
          @Search IS NULL OR (
            p.[SKUBase] LIKE '%' + @Search + '%'
            OR p.[Nombre] LIKE '%' + @Search + '%'
            OR p.[Marca] LIKE '%' + @Search + '%'
          )
        )
        AND (
          @CategoriaId IS NULL
          OR CAST(p.[CategoriaId] AS NVARCHAR(50)) = @CategoriaId
        )
        AND (
          @Marca IS NULL
          OR p.[Marca] = @Marca
        )
    `;

    const stockClause = soloConStock
      ? 'WHERE base.[StockTotal] > 0'
      : '';

    const listQuery = `
      SET NOCOUNT ON;
      ${cte}
      SELECT *
      FROM (
        ${baseSelect}
      ) AS base
      ${stockClause}
      ORDER BY base.[Nombre] ASC
      OFFSET @OffsetRows ROWS
      FETCH NEXT @PageSize ROWS ONLY;
    `;

    const countQuery = `
      SET NOCOUNT ON;
      ${cte}
      SELECT COUNT(1) AS [Total]
      FROM (
        ${baseSelect}
      ) AS base
      ${stockClause};
    `;

    const [itemsResult, totalResult] = await Promise.all([
      this.databaseService.execute<sql.IResult<ListProductoRow>>(
        (pool) =>
          pool
            .request()
            .input('EmpresaId', sql.Int, empresaId)
            .input('Search', sql.NVarChar(120), normalizedSearch)
            .input('CategoriaId', sql.NVarChar(50), normalizedCategoriaId)
            .input('Marca', sql.NVarChar(120), normalizedMarca)
            .input('OffsetRows', sql.Int, offsetRows)
            .input('PageSize', sql.Int, pageSize)
            .query<ListProductoRow>(listQuery),
        'zi.catalog.listProductos',
      ),
      this.databaseService.execute<sql.IResult<CountRow>>(
        (pool) =>
          pool
            .request()
            .input('EmpresaId', sql.Int, empresaId)
            .input('Search', sql.NVarChar(120), normalizedSearch)
            .input('CategoriaId', sql.NVarChar(50), normalizedCategoriaId)
            .input('Marca', sql.NVarChar(120), normalizedMarca)
            .query<CountRow>(countQuery),
        'zi.catalog.listProductos.count',
      ),
    ]);

    const total = totalResult.recordset[0]?.Total ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

    return {
      items: itemsResult.recordset.map((row) => ({
        productoId: row.ProductoId,
        skuBase: row.SKUBase ?? '',
        nombre: row.Nombre,
        marca: row.Marca ?? null,
        activo: row.Activo,
        categoriaNombre: row.CategoriaNombre ?? null,
        categoriaId: row.CategoriaId ?? null,
        totalVariantes: row.TotalVariantes ?? 0,
        precioBaseMin: this.toNumberOrNull(row.PrecioMin),
        precioBaseMax: this.toNumberOrNull(row.PrecioMax),
        stockTotal: row.StockTotal ?? 0,
        ziSyncedAt: row.ZiSyncedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getProductoDetalle(
    empresaId: number,
    productoId: number,
  ): Promise<ZiCatalogProductoDetalle | null> {
    const [productoResult, variantesResult, tarifasResult] = await Promise.all([
      this.databaseService.execute<sql.IResult<ProductoDetalleRow>>(
        (pool) =>
          pool
            .request()
            .input('ProductoId', sql.Int, productoId)
            .input('EmpresaId', sql.Int, empresaId)
            .query<ProductoDetalleRow>(`
              SET NOCOUNT ON;
              SELECT
                p.[ProductoId],
                p.[SKUBase],
                p.[Nombre],
                p.[Marca],
                p.[Activo],
                p.[ZiSyncedAt],
                pt.[Descripcion],
                pt.[DescripcionCorta],
                pt.[MetaTitulo],
                pt.[MetaDescripcion],
                pt.[Url],
                c.[Nombre] AS [CategoriaNombre],
                CAST(NULL AS NVARCHAR(255)) AS [InstruccionesCuidado]
              FROM [oms].[Producto] p
              LEFT JOIN [oms].[ProductoTexto] pt
                ON pt.[ProductoId] = p.[ProductoId]
                AND pt.[Idioma] = 'es'
              LEFT JOIN [oms].[Categoria] c
                ON c.[CategoriaId] = p.[CategoriaId]
              WHERE p.[ProductoId] = @ProductoId
                AND p.[EmpresaId] = @EmpresaId
                AND p.[OrigenDatos] = 'ZI';
            `),
        'zi.catalog.getProductoDetalle.producto',
      ),
      this.databaseService.execute<sql.IResult<VarianteRow>>(
        (pool) =>
          pool
            .request()
            .input('ProductoId', sql.Int, productoId)
            .input('EmpresaId', sql.Int, empresaId)
            .query<VarianteRow>(`
              SET NOCOUNT ON;
              SELECT
                pv.[VarianteId],
                pv.[SKU],
                pv.[EAN],
                skuParts.[TallaId],
                skuParts.[ColorId],
                t.[Nombre] AS [NombreTalla],
                col.[Nombre] AS [NombreColor],
                ISNULL(SUM(i.[StockTotal]), 0) AS [StockTotal],
                ISNULL(SUM(i.[StockTotal] - i.[StockReservado]), 0) AS [StockDisponible]
              FROM [oms].[ProductoVariante] pv
              CROSS APPLY (
                SELECT
                  CHARINDEX('-', pv.[SKU]) AS [FirstDash],
                  CASE
                    WHEN CHARINDEX('-', pv.[SKU]) > 0
                      THEN CHARINDEX('-', pv.[SKU], CHARINDEX('-', pv.[SKU]) + 1)
                    ELSE 0
                  END AS [SecondDash]
              ) dash
              CROSS APPLY (
                SELECT
                  CASE
                    WHEN dash.[FirstDash] > 0
                      AND dash.[SecondDash] > dash.[FirstDash]
                      THEN SUBSTRING(
                        pv.[SKU],
                        dash.[FirstDash] + 1,
                        dash.[SecondDash] - dash.[FirstDash] - 1
                      )
                    ELSE NULL
                  END AS [TallaId],
                  CASE
                    WHEN dash.[SecondDash] > 0
                      AND LEN(pv.[SKU]) > dash.[SecondDash]
                      THEN SUBSTRING(
                        pv.[SKU],
                        dash.[SecondDash] + 1,
                        LEN(pv.[SKU]) - dash.[SecondDash]
                      )
                    ELSE NULL
                  END AS [ColorId]
              ) skuParts
              LEFT JOIN [oms].[Talla] t
                ON t.[ExternalTallaId] = skuParts.[TallaId]
                AND t.[EmpresaId] = @EmpresaId
              LEFT JOIN [oms].[Color] col
                ON col.[ExternalColorId] = skuParts.[ColorId]
                AND col.[EmpresaId] = @EmpresaId
              LEFT JOIN [oms].[Inventario] i
                ON i.[VarianteId] = pv.[VarianteId]
                AND i.[EmpresaId] = @EmpresaId
              WHERE pv.[ProductoId] = @ProductoId
                AND pv.[EmpresaId] = @EmpresaId
                AND pv.[OrigenDatos] = 'ZI'
              GROUP BY
                pv.[VarianteId],
                pv.[SKU],
                pv.[EAN],
                skuParts.[TallaId],
                skuParts.[ColorId],
                t.[Nombre],
                col.[Nombre]
              ORDER BY pv.[VarianteId] ASC;
            `),
        'zi.catalog.getProductoDetalle.variantes',
      ),
      this.databaseService.execute<sql.IResult<TarifaRow>>(
        (pool) =>
          pool
            .request()
            .input('ProductoId', sql.Int, productoId)
            .input('EmpresaId', sql.Int, empresaId)
            .query<TarifaRow>(`
              SET NOCOUNT ON;
              SELECT
                tp.[TarifaPrecioId],
                tp.[ComercialChannel],
                tp.[MonedaCodigo],
                tp.[ImpuestoPct],
                MIN(CAST(tpd.[Precio] AS DECIMAL(18,2))) AS [PrecioBase],
                CASE
                  WHEN COUNT(op.[OfertaPrecioId]) > 0 THEN 1
                  ELSE 0
                END AS [TieneOfertaActiva],
                MIN(CAST(opd.[Precio] AS DECIMAL(18,2))) AS [PrecioOferta]
              FROM [oms].[TarifaPrecio] tp
              INNER JOIN [oms].[TarifaPrecioDetalle] tpd
                ON tpd.[TarifaPrecioId] = tp.[TarifaPrecioId]
              INNER JOIN [oms].[ProductoVariante] pv
                ON pv.[VarianteId] = tpd.[VarianteId]
                AND pv.[ProductoId] = @ProductoId
                AND pv.[EmpresaId] = @EmpresaId
                AND pv.[OrigenDatos] = 'ZI'
              LEFT JOIN [oms].[OfertaPrecio] op
                ON op.[TarifaPrecioId] = tp.[TarifaPrecioId]
                AND op.[Activo] = 1
                AND GETUTCDATE() BETWEEN op.[FechaInicio] AND op.[FechaFin]
              LEFT JOIN [oms].[OfertaPrecioDetalle] opd
                ON opd.[OfertaPrecioId] = op.[OfertaPrecioId]
                AND opd.[ExternalTallaId] = tpd.[ExternalTallaId]
                AND opd.[ExternalColorId] = tpd.[ExternalColorId]
              WHERE tp.[EmpresaId] = @EmpresaId
                AND tp.[Activo] = 1
              GROUP BY
                tp.[TarifaPrecioId],
                tp.[ComercialChannel],
                tp.[MonedaCodigo],
                tp.[ImpuestoPct]
              ORDER BY tp.[ComercialChannel] ASC;
            `),
        'zi.catalog.getProductoDetalle.tarifas',
      ),
    ]);

    const producto = productoResult.recordset[0];
    if (!producto) {
      return null;
    }

    return {
      productoId: producto.ProductoId,
      skuBase: producto.SKUBase ?? '',
      nombre: producto.Nombre,
      marca: producto.Marca ?? null,
      activo: producto.Activo,
      descripcion: producto.Descripcion ?? null,
      descripcionCorta: producto.DescripcionCorta ?? null,
      metaTitulo: producto.MetaTitulo ?? null,
      metaDescripcion: producto.MetaDescripcion ?? null,
      url: producto.Url ?? null,
      categoriaNombre: producto.CategoriaNombre ?? null,
      instruccionesCuidado: producto.InstruccionesCuidado ?? null,
      ziSyncedAt: producto.ZiSyncedAt?.toISOString() ?? null,
      variantes: variantesResult.recordset.map((row) => ({
        varianteId: row.VarianteId,
        sku: row.SKU ?? '',
        ean: row.EAN ?? '',
        talla: row.TallaId ?? null,
        color: row.ColorId ?? null,
        nombreTalla: row.NombreTalla ?? null,
        nombreColor: row.NombreColor ?? null,
        stockTotal: row.StockTotal ?? 0,
        stockDisponible: row.StockDisponible ?? 0,
      })),
      tarifas: tarifasResult.recordset.map((row) => ({
        tarifaId: row.TarifaPrecioId,
        comercialChannel: row.ComercialChannel,
        monedaCodigo: row.MonedaCodigo,
        impuestoPct: this.toNumber(row.ImpuestoPct),
        precioBase: this.toNumber(row.PrecioBase),
        tieneOfertaActiva: this.toBoolean(row.TieneOfertaActiva),
        precioOferta: this.toNumberOrNull(row.PrecioOferta),
      })),
    };
  }

  async getMarcas(empresaId: number): Promise<string[]> {
    const result = await this.databaseService.execute<sql.IResult<MarcaRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, empresaId)
          .query<MarcaRow>(`
            SET NOCOUNT ON;
            SELECT DISTINCT [Marca]
            FROM [oms].[Producto]
            WHERE [OrigenDatos] = 'ZI'
              AND [EmpresaId] = @EmpresaId
              AND [Marca] IS NOT NULL
            ORDER BY [Marca] ASC;
          `),
      'zi.catalog.getMarcas',
    );

    return result.recordset.map((row) => row.Marca);
  }

  async getCategorias(
    empresaId: number,
  ): Promise<{ categoriaId: number; nombre: string; total: number }[]> {
    const result = await this.databaseService.execute<sql.IResult<CategoriaRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, empresaId)
          .query<CategoriaRow>(`
            SET NOCOUNT ON;
            SELECT
              c.[CategoriaId],
              c.[Nombre],
              COUNT(p.[ProductoId]) AS [Total]
            FROM [oms].[Categoria] c
            INNER JOIN [oms].[Producto] p
              ON p.[CategoriaId] = c.[CategoriaId]
              AND p.[EmpresaId] = @EmpresaId
              AND p.[OrigenDatos] = 'ZI'
            WHERE c.[EmpresaId] = @EmpresaId
              AND c.[Activo] = 1
            GROUP BY c.[CategoriaId], c.[Nombre]
            HAVING COUNT(p.[ProductoId]) > 0
            ORDER BY c.[Nombre] ASC;
          `),
      'zi.catalog.getCategorias',
    );

    return result.recordset.map((row) => ({
      categoriaId: row.CategoriaId,
      nombre: row.Nombre,
      total: row.Total,
    }));
  }

  private toNumberOrNull(value: number | string | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return this.toNumber(value);
  }

  private toNumber(value: number | string): number {
    if (typeof value === 'number') {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toBoolean(value: boolean | number): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    return value === 1;
  }
}
