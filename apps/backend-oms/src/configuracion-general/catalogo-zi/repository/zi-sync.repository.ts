import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../database/database.service';

type TiendaMappingRow = {
  ZiTiendaId: string;
  BodegaId: number;
};

type CategoriaIdentityRow = {
  CategoriaId: number;
};

type ProductoMergeRow = {
  MergeAction: 'INSERT' | 'UPDATE';
  ProductoId: number;
};

type VarianteMergeRow = {
  MergeAction: 'INSERT' | 'UPDATE';
  VarianteId: number;
};

type TarifaIdentityRow = {
  TarifaPrecioId: number;
};

type OfertaIdentityRow = {
  OfertaPrecioId: number;
};

type VarianteIdentityRow = {
  VarianteId: number;
};

type ZiLogHashesRow = {
  HashProduct: string | null;
  HashPrice: string | null;
  HashStock: string | null;
};

type ZiSyncRecentLogRow = {
  Entity: string;
  ProductoZiId: number;
  Status: string;
  Error: string | null;
  RecordsUpdated: number;
  StartedAt: Date;
  FinishedAt: Date;
  CreatedAt: Date;
};

type ZiSyncSummaryRow = {
  Total: number;
  OkCount: number;
  ErrorCount: number;
  LastRunAt: Date | null;
  LastStatus: string | null;
  LastError: string | null;
};

type UpsertCategoriaInput = {
  empresaId: number;
  externalCategoryId: string;
  externalParentId: string | null;
  nombre: string;
  activo: boolean;
  level: string;
  sourceTs: Date;
  apiSuccess: boolean;
  apiStatusCode: number;
};

type UpsertProductoInput = {
  empresaId: number;
  externalProductId: number;
  skuBase: string;
  nombre: string;
  marca: string;
  activo: boolean;
  categoriaId: number | null;
  origenDatos: string;
  ziSyncedAt: Date;
};

type UpsertProductoTextoInput = {
  productoId: number;
  idioma: string;
  nombre: string;
  descripcion: string;
  descripcionCorta: string;
  metaTitulo: string;
  metaDescripcion: string;
  url: string;
};

type UpsertVarianteInput = {
  empresaId: number;
  productoId: number;
  sku: string;
  ean: string;
  activo: boolean;
  origenDatos: string;
  ziSyncedAt: Date;
  externalTallaId: string;
  externalColorId: string;
};

type UpsertTarifaInput = {
  empresaId: number;
  comercialChannel: string;
  externalTarifaId: string;
  monedaCodigo: string;
  impuestoPct: number;
};

type UpsertTarifaDetalleInput = {
  tarifaId: number;
  varianteId: number;
  externalTallaId: string;
  externalColorId: string;
  precio: number;
};

type UpsertOfertaInput = {
  tarifaId: number;
  externalOfertaId: string;
  fechaInicio: Date;
  fechaFin: Date;
  precioBase: number;
  activo: boolean;
};

type UpsertOfertaDetalleInput = {
  ofertaId: number;
  varianteId: number;
  externalTallaId: string;
  externalColorId: string;
  precio: number;
};

type UpsertInventarioInput = {
  empresaId: number;
  bodegaId: number;
  varianteId: number;
  stockTotal: number;
  origenDatos: string;
  ziSyncedAt: Date;
};

type SaveZiLogInput = {
  entity: string;
  productoZiId: number;
  hashProduct: string;
  hashPrice: string;
  hashStock: string;
  startedAt: Date;
  finishedAt: Date;
  recordsUpdated: number;
  status: 'ok' | 'error';
  error?: string;
};

@Injectable()
export class ZiSyncRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private tiendaMappingCache: Record<string, number> | null = null;
  private tiendaMappingCachedAt = 0;
  private readonly tiendaMappingTtlMs = 60 * 60 * 1000;

  async getTiendaMapping(): Promise<Record<string, number>> {
    const now = Date.now();
    if (
      this.tiendaMappingCache &&
      now - this.tiendaMappingCachedAt < this.tiendaMappingTtlMs
    ) {
      return { ...this.tiendaMappingCache };
    }

    const result = await this.databaseService.execute<
      sql.IResult<TiendaMappingRow>
    >(
      (pool) =>
        pool.request().query<TiendaMappingRow>(`
          SET NOCOUNT ON;
          SELECT [ZiTiendaId], [BodegaId]
          FROM [oms].[ZiTiendaMapping]
          WHERE [Activo] = 1
          ORDER BY [ZiTiendaId] ASC;
        `),
      'zi.getTiendaMapping',
    );

    const mapping: Record<string, number> = {};
    result.recordset.forEach((row) => {
      mapping[row.ZiTiendaId] = row.BodegaId;
    });

    this.tiendaMappingCache = mapping;
    this.tiendaMappingCachedAt = now;
    return { ...mapping };
  }

  async upsertCategoria(
    input: UpsertCategoriaInput,
  ): Promise<{ categoriaId: number }> {
    const externalCategoryId = this.toInt(
      input.externalCategoryId,
      'externalCategoryId',
    );
    const externalParentId = this.toNullableInt(
      input.externalParentId,
      'externalParentId',
    );

    const result = await this.databaseService.execute<
      sql.IResult<CategoriaIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('ExternalCategoryId', sql.Int, externalCategoryId)
          .input('ExternalParentId', sql.Int, externalParentId)
          .input('Nombre', sql.NVarChar(255), input.nombre)
          .input('Activo', sql.Bit, input.activo)
          .input('Level', sql.NVarChar(60), input.level)
          .input('SourceTs', sql.DateTime2, input.sourceTs)
          .input('ApiSuccess', sql.Bit, input.apiSuccess)
          .input('ApiStatusCode', sql.Int, input.apiStatusCode)
          .query<CategoriaIdentityRow>(`
            SET NOCOUNT ON;

            MERGE [oms].[Categoria] AS target
            USING (
              SELECT
                @EmpresaId AS [EmpresaId],
                @ExternalCategoryId AS [ExternalCategoryId]
            ) AS source
              ON target.[EmpresaId] = source.[EmpresaId]
             AND target.[ExternalCategoryId] = source.[ExternalCategoryId]
            WHEN MATCHED THEN
              UPDATE SET
                [Nombre] = @Nombre,
                [Activo] = @Activo,
                [Level] = @Level,
                [ExternalParentId] = @ExternalParentId,
                [IsActiveExternal] = @Activo,
                [SourceTs] = @SourceTs,
                [ApiSuccess] = @ApiSuccess,
                [ApiStatusCode] = @ApiStatusCode,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [EmpresaId],
                [ExternalCategoryId],
                [ExternalParentId],
                [Nombre],
                [Activo],
                [Level],
                [IsActiveExternal],
                [SourceTs],
                [ApiSuccess],
                [ApiStatusCode],
                [CreatedAt],
                [UpdatedAt]
              )
              VALUES
              (
                @EmpresaId,
                @ExternalCategoryId,
                @ExternalParentId,
                @Nombre,
                @Activo,
                @Level,
                @Activo,
                @SourceTs,
                @ApiSuccess,
                @ApiStatusCode,
                SYSUTCDATETIME(),
                NULL
              )
            OUTPUT INSERTED.[CategoriaId] AS [CategoriaId];
          `),
      'zi.upsertCategoria',
    );

    return { categoriaId: result.recordset[0].CategoriaId };
  }

  async resolverCategoriaId(
    empresaId: number,
    externalCategoryId: string,
  ): Promise<number | null> {
    const externalId = this.toInt(externalCategoryId, 'externalCategoryId');
    const result = await this.databaseService.execute<
      sql.IResult<CategoriaIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, empresaId)
          .input('ExternalCategoryId', sql.Int, externalId)
          .query<CategoriaIdentityRow>(`
            SET NOCOUNT ON;
            SELECT TOP 1 [CategoriaId]
            FROM [oms].[Categoria]
            WHERE [EmpresaId] = @EmpresaId
              AND [ExternalCategoryId] = @ExternalCategoryId
            ORDER BY [CategoriaId] ASC;
          `),
      'zi.resolverCategoriaId',
    );

    return result.recordset[0]?.CategoriaId ?? null;
  }

  async upsertProducto(
    input: UpsertProductoInput,
  ): Promise<{ productoId: number; created: boolean }> {
    const result = await this.databaseService.execute<
      sql.IResult<ProductoMergeRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('ExternalProductId', sql.Int, input.externalProductId)
          .input('SKUBase', sql.NVarChar(120), input.skuBase)
          .input('Nombre', sql.NVarChar(255), input.nombre)
          .input('Marca', sql.NVarChar(120), input.marca || null)
          .input('Activo', sql.Bit, input.activo)
          .input('CategoriaId', sql.Int, input.categoriaId)
          .input('OrigenDatos', sql.NVarChar(20), input.origenDatos)
          .input('ZiSyncedAt', sql.DateTime2, input.ziSyncedAt)
          .query<ProductoMergeRow>(`
            SET NOCOUNT ON;

            MERGE [oms].[Producto] AS target
            USING (
              SELECT
                @EmpresaId AS [EmpresaId],
                @SKUBase AS [SKUBase]
            ) AS source
              ON target.[EmpresaId] = source.[EmpresaId]
             AND target.[SKUBase] = source.[SKUBase]
            WHEN MATCHED THEN
              UPDATE SET
                [Nombre] = @Nombre,
                [Marca] = @Marca,
                [Activo] = @Activo,
                [CategoriaId] = @CategoriaId,
                [OrigenDatos] = @OrigenDatos,
                [ZiSyncedAt] = @ZiSyncedAt,
                [ExternalProductId] = @ExternalProductId,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [EmpresaId],
                [CategoriaId],
                [SKUBase],
                [Nombre],
                [Marca],
                [Activo],
                [CreatedAt],
                [UpdatedAt],
                [OrigenDatos],
                [ZiSyncedAt],
                [ExternalProductId]
              )
              VALUES
              (
                @EmpresaId,
                @CategoriaId,
                @SKUBase,
                @Nombre,
                @Marca,
                @Activo,
                SYSUTCDATETIME(),
                NULL,
                @OrigenDatos,
                @ZiSyncedAt,
                @ExternalProductId
              )
            OUTPUT
              $action AS [MergeAction],
              INSERTED.[ProductoId] AS [ProductoId];
          `),
      'zi.upsertProducto',
    );

    const row = result.recordset[0];
    return {
      productoId: row.ProductoId,
      created: row.MergeAction === 'INSERT',
    };
  }

  async upsertProductoTexto(input: UpsertProductoTextoInput): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('ProductoId', sql.Int, input.productoId)
          .input('Idioma', sql.NVarChar(10), input.idioma)
          .input('Nombre', sql.NVarChar(255), input.nombre || null)
          .input('Descripcion', sql.NVarChar(sql.MAX), input.descripcion || null)
          .input(
            'DescripcionCorta',
            sql.NVarChar(sql.MAX),
            input.descripcionCorta || null,
          )
          .input('MetaTitulo', sql.NVarChar(255), input.metaTitulo || null)
          .input(
            'MetaDescripcion',
            sql.NVarChar(sql.MAX),
            input.metaDescripcion || null,
          )
          .input('Url', sql.NVarChar(510), input.url || null)
          .query(`
            SET NOCOUNT ON;

            MERGE [oms].[ProductoTexto] AS target
            USING (
              SELECT
                @ProductoId AS [ProductoId],
                @Idioma AS [Idioma]
            ) AS source
              ON target.[ProductoId] = source.[ProductoId]
             AND target.[Idioma] = source.[Idioma]
            WHEN MATCHED THEN
              UPDATE SET
                [Nombre] = @Nombre,
                [Descripcion] = @Descripcion,
                [DescripcionCorta] = @DescripcionCorta,
                [MetaTitulo] = @MetaTitulo,
                [MetaDescripcion] = @MetaDescripcion,
                [Url] = @Url,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [ProductoId],
                [Idioma],
                [Nombre],
                [Descripcion],
                [DescripcionCorta],
                [MetaTitulo],
                [MetaDescripcion],
                [Url],
                [CreatedAt],
                [UpdatedAt]
              )
              VALUES
              (
                @ProductoId,
                @Idioma,
                @Nombre,
                @Descripcion,
                @DescripcionCorta,
                @MetaTitulo,
                @MetaDescripcion,
                @Url,
                SYSUTCDATETIME(),
                NULL
              );
          `),
      'zi.upsertProductoTexto',
    );
  }

  async upsertVariante(
    input: UpsertVarianteInput,
  ): Promise<{ varianteId: number; created: boolean }> {
    const result = await this.databaseService.execute<
      sql.IResult<VarianteMergeRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('ProductoId', sql.Int, input.productoId)
          .input('SKU', sql.NVarChar(120), input.sku)
          .input('EAN', sql.NVarChar(120), input.ean || null)
          .input('Activo', sql.Bit, input.activo)
          .input('OrigenDatos', sql.NVarChar(20), input.origenDatos)
          .input('ZiSyncedAt', sql.DateTime2, input.ziSyncedAt)
          .input('ExternalTallaId', sql.NVarChar(40), input.externalTallaId || null)
          .input('ExternalColorId', sql.NVarChar(40), input.externalColorId || null)
          .query<VarianteMergeRow>(`
            SET NOCOUNT ON;

            MERGE [oms].[ProductoVariante] AS target
            USING (
              SELECT
                @EmpresaId AS [EmpresaId],
                @SKU AS [SKU]
            ) AS source
              ON target.[EmpresaId] = source.[EmpresaId]
             AND target.[SKU] = source.[SKU]
            WHEN MATCHED THEN
              UPDATE SET
                [EAN] = @EAN,
                [Activo] = @Activo,
                [OrigenDatos] = @OrigenDatos,
                [ZiSyncedAt] = @ZiSyncedAt,
                [ExternalTallaId] = @ExternalTallaId,
                [ExternalColorId] = @ExternalColorId,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [EmpresaId],
                [ProductoId],
                [SKU],
                [EAN],
                [Activo],
                [CreatedAt],
                [UpdatedAt],
                [OrigenDatos],
                [ZiSyncedAt],
                [ExternalTallaId],
                [ExternalColorId]
              )
              VALUES
              (
                @EmpresaId,
                @ProductoId,
                @SKU,
                @EAN,
                @Activo,
                SYSUTCDATETIME(),
                NULL,
                @OrigenDatos,
                @ZiSyncedAt,
                @ExternalTallaId,
                @ExternalColorId
              )
            OUTPUT
              $action AS [MergeAction],
              INSERTED.[VarianteId] AS [VarianteId];
          `),
      'zi.upsertVariante',
    );

    const row = result.recordset[0];
    return {
      varianteId: row.VarianteId,
      created: row.MergeAction === 'INSERT',
    };
  }

  async upsertTarifa(input: UpsertTarifaInput): Promise<{ tarifaId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<TarifaIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('ComercialChannel', sql.NVarChar(60), input.comercialChannel)
          .input('ExternalTarifaId', sql.NVarChar(120), input.externalTarifaId)
          .input(
            'MonedaCodigo',
            sql.Char(3),
            input.monedaCodigo.trim().toUpperCase(),
          )
          .input('ImpuestoPct', sql.Decimal(10, 2), input.impuestoPct)
          .query<TarifaIdentityRow>(`
            SET NOCOUNT ON;

            MERGE [oms].[TarifaPrecio] AS target
            USING (
              SELECT
                @EmpresaId AS [EmpresaId],
                @ComercialChannel AS [ComercialChannel]
            ) AS source
              ON target.[EmpresaId] = source.[EmpresaId]
             AND target.[ComercialChannel] = source.[ComercialChannel]
            WHEN MATCHED THEN
              UPDATE SET
                [ExternalTarifaId] = @ExternalTarifaId,
                [ComercialChannel] = @ComercialChannel,
                [MonedaCodigo] = @MonedaCodigo,
                [ImpuestoPct] = @ImpuestoPct,
                [Activo] = 1,
                [SourceTs] = SYSUTCDATETIME(),
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [EmpresaId],
                [ComercialChannel],
                [ExternalTarifaId],
                [MonedaCodigo],
                [ImpuestoPct],
                [Activo],
                [SourceTs],
                [CreatedAt]
              )
              VALUES
              (
                @EmpresaId,
                @ComercialChannel,
                @ExternalTarifaId,
                @MonedaCodigo,
                @ImpuestoPct,
                1,
                SYSUTCDATETIME(),
                SYSUTCDATETIME()
              )
            OUTPUT INSERTED.[TarifaPrecioId] AS [TarifaPrecioId];
          `),
      'zi.upsertTarifa',
    );

    return { tarifaId: result.recordset[0].TarifaPrecioId };
  }

  async upsertTarifaDetalle(input: UpsertTarifaDetalleInput): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('TarifaPrecioId', sql.BigInt, input.tarifaId)
          .input('VarianteId', sql.BigInt, input.varianteId)
          .input('ExternalTallaId', sql.NVarChar(60), input.externalTallaId)
          .input('ExternalColorId', sql.NVarChar(60), input.externalColorId)
          .input('Precio', sql.Decimal(18, 2), input.precio)
          .query(`
            SET NOCOUNT ON;

            MERGE [oms].[TarifaPrecioDetalle] AS target
            USING (
              SELECT
                @TarifaPrecioId AS [TarifaPrecioId],
                @VarianteId AS [VarianteId]
            ) AS source
              ON target.[TarifaPrecioId] = source.[TarifaPrecioId]
             AND target.[VarianteId]     = source.[VarianteId]
            WHEN MATCHED THEN
              UPDATE SET
                [ExternalTallaId] = @ExternalTallaId,
                [ExternalColorId] = @ExternalColorId,
                [Precio] = @Precio,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [TarifaPrecioId],
                [VarianteId],
                [ExternalTallaId],
                [ExternalColorId],
                [Precio],
                [CreatedAt],
                [UpdatedAt]
              )
              VALUES
              (
                @TarifaPrecioId,
                @VarianteId,
                @ExternalTallaId,
                @ExternalColorId,
                @Precio,
                SYSUTCDATETIME(),
                NULL
              );
          `),
      'zi.upsertTarifaDetalle',
    );
  }

  async upsertOferta(input: UpsertOfertaInput): Promise<{ ofertaId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<OfertaIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('TarifaPrecioId', sql.BigInt, input.tarifaId)
          .input('ExternalOfertaId', sql.NVarChar(120), input.externalOfertaId)
          .input('FechaInicio', sql.Date, input.fechaInicio)
          .input('FechaFin', sql.Date, input.fechaFin)
          .input('PrecioBase', sql.Decimal(18, 2), input.precioBase)
          .input('Activo', sql.Bit, input.activo)
          .query<OfertaIdentityRow>(`
            SET NOCOUNT ON;

            MERGE [oms].[OfertaPrecio] AS target
            USING (
              SELECT
                @TarifaPrecioId AS [TarifaPrecioId],
                @ExternalOfertaId AS [ExternalOfertaId],
                @FechaInicio AS [FechaInicio],
                @FechaFin AS [FechaFin]
            ) AS source
              ON target.[TarifaPrecioId] = source.[TarifaPrecioId]
             AND target.[ExternalOfertaId] = source.[ExternalOfertaId]
             AND target.[FechaInicio] = source.[FechaInicio]
             AND target.[FechaFin] = source.[FechaFin]
            WHEN MATCHED THEN
              UPDATE SET
                [PrecioBase] = @PrecioBase,
                [Activo] = @Activo,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [TarifaPrecioId],
                [ExternalOfertaId],
                [FechaInicio],
                [FechaFin],
                [PrecioBase],
                [Activo],
                [CreatedAt],
                [UpdatedAt]
              )
              VALUES
              (
                @TarifaPrecioId,
                @ExternalOfertaId,
                @FechaInicio,
                @FechaFin,
                @PrecioBase,
                @Activo,
                SYSUTCDATETIME(),
                NULL
              )
            OUTPUT INSERTED.[OfertaPrecioId] AS [OfertaPrecioId];
          `),
      'zi.upsertOferta',
    );

    return { ofertaId: result.recordset[0].OfertaPrecioId };
  }

  async upsertOfertaDetalle(input: UpsertOfertaDetalleInput): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('OfertaPrecioId', sql.BigInt, input.ofertaId)
          .input('VarianteId', sql.Int, input.varianteId)
          .input('ExternalTallaId', sql.NVarChar(60), input.externalTallaId)
          .input('ExternalColorId', sql.NVarChar(60), input.externalColorId)
          .input('Precio', sql.Decimal(18, 2), input.precio)
          .query(`
            SET NOCOUNT ON;

            MERGE [oms].[OfertaPrecioDetalle] AS target
            USING (
              SELECT
                @OfertaPrecioId AS [OfertaPrecioId],
                @VarianteId AS [VarianteId]
            ) AS source
              ON target.[OfertaPrecioId] = source.[OfertaPrecioId]
             AND target.[VarianteId]     = source.[VarianteId]
            WHEN MATCHED THEN
              UPDATE SET
                [ExternalTallaId] = @ExternalTallaId,
                [ExternalColorId] = @ExternalColorId,
                [Precio] = @Precio,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [OfertaPrecioId],
                [VarianteId],
                [ExternalTallaId],
                [ExternalColorId],
                [Precio],
                [CreatedAt],
                [UpdatedAt]
              )
              VALUES
              (
                @OfertaPrecioId,
                @VarianteId,
                @ExternalTallaId,
                @ExternalColorId,
                @Precio,
                SYSUTCDATETIME(),
                NULL
              );
          `),
      'zi.upsertOfertaDetalle',
    );
  }

  async upsertInventario(input: UpsertInventarioInput): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('BodegaId', sql.Int, input.bodegaId)
          .input('VarianteId', sql.BigInt, input.varianteId)
          .input('StockTotal', sql.Int, input.stockTotal)
          .input('OrigenDatos', sql.NVarChar(20), input.origenDatos)
          .input('ZiSyncedAt', sql.DateTime2, input.ziSyncedAt)
          .query(`
            SET NOCOUNT ON;

            MERGE [oms].[Inventario] AS target
            USING (
              SELECT
                @BodegaId AS [BodegaId],
                @VarianteId AS [VarianteId]
            ) AS source
              ON target.[BodegaId] = source.[BodegaId]
             AND target.[VarianteId] = source.[VarianteId]
            WHEN MATCHED THEN
              UPDATE SET
                [StockTotal] = @StockTotal,
                [OrigenDatos] = @OrigenDatos,
                [ZiSyncedAt] = @ZiSyncedAt,
                [UpdatedAt] = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT
              (
                [EmpresaId],
                [BodegaId],
                [VarianteId],
                [StockTotal],
                [OrigenDatos],
                [ZiSyncedAt],
                [UpdatedAt]
              )
              VALUES
              (
                @EmpresaId,
                @BodegaId,
                @VarianteId,
                @StockTotal,
                @OrigenDatos,
                @ZiSyncedAt,
                SYSUTCDATETIME()
              );
          `),
      'zi.upsertInventario',
    );
  }

  async resolverVarianteIdPorTallaColor(
    empresaId: number,
    productoZiId: number,
    externalTallaId: string,
    externalColorId: string,
  ): Promise<number | null> {
    const result = await this.databaseService.execute<
      sql.IResult<VarianteIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, empresaId)
          .input('ExternalProductId', sql.Int, productoZiId)
          .input('ExternalTallaId', sql.NVarChar(40), externalTallaId)
          .input('ExternalColorId', sql.NVarChar(40), externalColorId)
          .query<VarianteIdentityRow>(`
            SET NOCOUNT ON;
            SELECT TOP 1 pv.[VarianteId]
            FROM [oms].[ProductoVariante] pv
            INNER JOIN [oms].[Producto] p
              ON p.[ProductoId] = pv.[ProductoId]
             AND p.[EmpresaId]  = pv.[EmpresaId]
            WHERE pv.[EmpresaId]       = @EmpresaId
              AND pv.[ExternalTallaId] = @ExternalTallaId
              AND pv.[ExternalColorId] = @ExternalColorId
              AND pv.[OrigenDatos]     = 'ZI'
              AND p.[ExternalProductId] = @ExternalProductId
            ORDER BY pv.[VarianteId] ASC;
          `),
      'zi.resolverVarianteIdPorTallaColor',
    );

    return result.recordset[0]?.VarianteId ?? null;
  }

  async getLastHashes(productoZiId: number): Promise<{
    hashProduct: string | null;
    hashPrice: string | null;
    hashStock: string | null;
  }> {
    const result = await this.databaseService.execute<
      sql.IResult<ZiLogHashesRow>
    >(
      (pool) =>
        pool
          .request()
          .input('ProductoZiId', sql.Int, productoZiId)
          .query<ZiLogHashesRow>(`
            SET NOCOUNT ON;
            SELECT TOP 1
              [HashProduct],
              [HashPrice],
              [HashStock]
            FROM [oms].[ZiSyncLog]
            WHERE [ProductoZiId] = @ProductoZiId
              AND [Status] = 'ok'
            ORDER BY [CreatedAt] DESC;
          `),
      'zi.getLastHashes',
    );

    const row = result.recordset[0];
    if (!row) {
      return {
        hashProduct: null,
        hashPrice: null,
        hashStock: null,
      };
    }

    return {
      hashProduct: row.HashProduct ?? null,
      hashPrice: row.HashPrice ?? null,
      hashStock: row.HashStock ?? null,
    };
  }

  async listRecentLogs(
    limit: number,
  ): Promise<
    Array<{
      entity: string;
      productoZiId: number;
      status: 'ok' | 'error';
      error: string | null;
      recordsUpdated: number;
      startedAt: string;
      finishedAt: string;
      createdAt: string;
      durationMs: number;
    }>
  > {
    const normalizedLimit = this.normalizePositiveInt(limit, 20, 100);
    const result = await this.databaseService.execute<
      sql.IResult<ZiSyncRecentLogRow>
    >(
      (pool) =>
        pool
          .request()
          .input('Limit', sql.Int, normalizedLimit)
          .query<ZiSyncRecentLogRow>(`
            SET NOCOUNT ON;
            SELECT TOP (@Limit)
              [Entity],
              [ProductoZiId],
              [Status],
              [Error],
              [RecordsUpdated],
              [StartedAt],
              [FinishedAt],
              [CreatedAt]
            FROM [oms].[ZiSyncLog]
            ORDER BY [CreatedAt] DESC;
          `),
      'zi.listRecentLogs',
    );

    return result.recordset
      .filter((row) => row.Status === 'ok' || row.Status === 'error')
      .map((row) => ({
        entity: row.Entity,
        productoZiId: row.ProductoZiId,
        status: row.Status as 'ok' | 'error',
        error: row.Error ?? null,
        recordsUpdated: row.RecordsUpdated,
        startedAt: row.StartedAt.toISOString(),
        finishedAt: row.FinishedAt.toISOString(),
        createdAt: row.CreatedAt.toISOString(),
        durationMs: Math.max(
          0,
          row.FinishedAt.getTime() - row.StartedAt.getTime(),
        ),
      }));
  }

  async getSummaryLastHours(hours: number): Promise<{
    total: number;
    ok: number;
    error: number;
    lastRunAt: string | null;
    lastStatus: 'ok' | 'error' | null;
    lastError: string | null;
  }> {
    const normalizedHours = this.normalizePositiveInt(hours, 24, 168);
    const result = await this.databaseService.execute<
      sql.IResult<ZiSyncSummaryRow>
    >(
      (pool) =>
        pool
          .request()
          .input('Hours', sql.Int, normalizedHours)
          .query<ZiSyncSummaryRow>(`
            SET NOCOUNT ON;
            SELECT
              (
                SELECT COUNT(1)
                FROM [oms].[ZiSyncLog]
                WHERE [CreatedAt] >= DATEADD(HOUR, -@Hours, SYSUTCDATETIME())
              ) AS [Total],
              (
                SELECT COUNT(1)
                FROM [oms].[ZiSyncLog]
                WHERE [CreatedAt] >= DATEADD(HOUR, -@Hours, SYSUTCDATETIME())
                  AND [Status] = 'ok'
              ) AS [OkCount],
              (
                SELECT COUNT(1)
                FROM [oms].[ZiSyncLog]
                WHERE [CreatedAt] >= DATEADD(HOUR, -@Hours, SYSUTCDATETIME())
                  AND [Status] = 'error'
              ) AS [ErrorCount],
              (
                SELECT TOP 1 [CreatedAt]
                FROM [oms].[ZiSyncLog]
                ORDER BY [CreatedAt] DESC
              ) AS [LastRunAt],
              (
                SELECT TOP 1 [Status]
                FROM [oms].[ZiSyncLog]
                ORDER BY [CreatedAt] DESC
              ) AS [LastStatus],
              (
                SELECT TOP 1 [Error]
                FROM [oms].[ZiSyncLog]
                ORDER BY [CreatedAt] DESC
              ) AS [LastError];
          `),
      'zi.getSummaryLastHours',
    );

    const row = result.recordset[0];
    const lastStatus =
      row?.LastStatus === 'ok' || row?.LastStatus === 'error'
        ? row.LastStatus
        : null;

    return {
      total: row?.Total ?? 0,
      ok: row?.OkCount ?? 0,
      error: row?.ErrorCount ?? 0,
      lastRunAt: row?.LastRunAt ? row.LastRunAt.toISOString() : null,
      lastStatus,
      lastError: row?.LastError ?? null,
    };
  }

  async saveLog(input: SaveZiLogInput): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('Entity', sql.NVarChar(60), input.entity)
          .input('ProductoZiId', sql.Int, input.productoZiId)
          .input('HashProduct', sql.NVarChar(64), input.hashProduct)
          .input('HashPrice', sql.NVarChar(64), input.hashPrice)
          .input('HashStock', sql.NVarChar(64), input.hashStock)
          .input('StartedAt', sql.DateTime2, input.startedAt)
          .input('FinishedAt', sql.DateTime2, input.finishedAt)
          .input('RecordsUpdated', sql.Int, input.recordsUpdated)
          .input('Status', sql.NVarChar(20), input.status)
          .input('Error', sql.NVarChar(sql.MAX), input.error ?? null)
          .query(`
            SET NOCOUNT ON;
            INSERT INTO [oms].[ZiSyncLog]
            (
              [Entity],
              [ProductoZiId],
              [HashProduct],
              [HashPrice],
              [HashStock],
              [StartedAt],
              [FinishedAt],
              [RecordsUpdated],
              [Status],
              [Error],
              [CreatedAt]
            )
            VALUES
            (
              @Entity,
              @ProductoZiId,
              @HashProduct,
              @HashPrice,
              @HashStock,
              @StartedAt,
              @FinishedAt,
              @RecordsUpdated,
              @Status,
              @Error,
              SYSUTCDATETIME()
            );
          `),
      'zi.saveLog',
    );
  }

  private normalizePositiveInt(
    value: number,
    fallback: number,
    maxValue: number,
  ): number {
    if (!Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return Math.min(Math.floor(value), maxValue);
  }

  private toInt(value: string, field: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Valor invalido para ${field}: ${value}`);
    }
    return parsed;
  }

  private toNullableInt(value: string | null, field: string): number | null {
    if (!value || !value.trim()) {
      return null;
    }
    return this.toInt(value, field);
  }
}
