import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type {
  ShopifyOmsProductAggregate,
  ShopifyOmsVariantAggregate,
  ShopifyOutboundPricePriority,
} from './shopify-sync.types';

// ------------------------------------------------------------
// Tipos de filas de BD (internos)
// ------------------------------------------------------------

type ProductoBaseRow = {
  ProductoId: number;
  EmpresaId: number;
  Nombre: string;
  Marca: string | null;
  Descripcion: string | null;
  DescripcionCorta: string | null;
  CategoriaNombre: string | null;
};

type VarianteRow = {
  VarianteId: number;
  SKU: string;
  EAN: string | null;
  Nombre: string | null;
};

/** Fila de tarifa de precio — expuesta para tests unitarios de resolvePrices */
export type ShopifyTarifaRow = {
  VarianteId: number;
  ComercialChannel: string;
  MonedaCodigo: string;
  Precio: number;
};

type StockRow = {
  VarianteId: number;
  StockDisponible: number;
};

/**
 * Lee el agregado OMS de un producto listo para sync outbound a Shopify.
 * Ejecuta 3 queries independientes:
 *   1. Producto base + texto localizado (es) + categoría
 *   2. Variantes activas
 *   3. Precios activos de las variantes + stock disponible
 *
 * La selección de precio según pricePriority se resuelve con el método estático
 * `resolvePrices`, que puede testearse sin BD.
 */
@Injectable()
export class ShopifyOmsCatalogRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Devuelve el agregado del producto con precios ya resueltos según pricePriority.
   * Las variantes cuyo precio no pudo resolverse tendrán `price = null`.
   * El servicio debe bloquear con 409 si alguna variante tiene price = null.
   *
   * Devuelve null si el producto no existe, está inactivo o no pertenece a la empresa.
   */
  async findProductForSync(
    productoId: number,
    empresaId: number,
    pricePriority: ShopifyOutboundPricePriority[],
  ): Promise<ShopifyOmsProductAggregate | null> {
    // --- Query 1: producto base ---
    const productoResult = await this.databaseService.execute<
      sql.IResult<ProductoBaseRow>
    >(
      (pool) =>
        pool
          .request()
          .input('productoId', sql.Int, productoId)
          .input('empresaId', sql.Int, empresaId)
          .query<ProductoBaseRow>(`
            SELECT
              p.[ProductoId],
              p.[EmpresaId],
              p.[Nombre],
              p.[Marca],
              pt.[Descripcion],
              pt.[DescripcionCorta],
              c.[Nombre] AS [CategoriaNombre]
            FROM [oms].[Producto] p
            LEFT JOIN [oms].[ProductoTexto] pt
              ON pt.[ProductoId] = p.[ProductoId]
             AND pt.[Idioma]     = N'es'
            LEFT JOIN [oms].[Categoria] c
              ON c.[CategoriaId] = p.[CategoriaId]
            WHERE p.[ProductoId] = @productoId
              AND p.[EmpresaId]  = @empresaId
              AND p.[Activo]     = 1
          `),
      'shopifyCatalog.findProductBase',
    );

    const productoRow = productoResult.recordset[0];
    if (!productoRow) {
      return null;
    }

    // --- Query 2: variantes activas ---
    const variantesResult = await this.databaseService.execute<
      sql.IResult<VarianteRow>
    >(
      (pool) =>
        pool
          .request()
          .input('productoId', sql.Int, productoId)
          .input('empresaId', sql.Int, empresaId)
          .query<VarianteRow>(`
            SELECT
              [VarianteId],
              [SKU],
              [EAN],
              [Nombre]
            FROM [oms].[ProductoVariante]
            WHERE [ProductoId] = @productoId
              AND [EmpresaId]  = @empresaId
              AND [Activo]     = 1
            ORDER BY [VarianteId] ASC
          `),
      'shopifyCatalog.findVariantes',
    );

    const varianteRows = variantesResult.recordset;

    if (varianteRows.length === 0) {
      return this.buildAggregate(productoRow, [], [], [], pricePriority);
    }

    const varianteIds = varianteRows.map((v) => v.VarianteId);

    // --- Query 3a: precios activos para las variantes ---
    const tarifas = await this.queryTarifas(varianteIds, empresaId);

    // --- Query 3b: stock disponible por variante ---
    const stock = await this.queryStock(varianteIds);

    return this.buildAggregate(productoRow, varianteRows, tarifas, stock, pricePriority);
  }

  private async queryTarifas(
    varianteIds: number[],
    empresaId: number,
  ): Promise<ShopifyTarifaRow[]> {
    if (varianteIds.length === 0) return [];

    // Parámetros nombrados para IN — evita SQL injection sin TVP
    const idList = varianteIds.map((_, i) => `@vid${i}`).join(', ');

    const result = await this.databaseService.execute<
      sql.IResult<ShopifyTarifaRow>
    >(
      (pool) => {
        const req = pool.request();
        varianteIds.forEach((id, i) => req.input(`vid${i}`, sql.Int, id));
        req.input('empresaId', sql.Int, empresaId);
        return req.query<ShopifyTarifaRow>(`
          SELECT
            tpd.[VarianteId],
            tp.[ComercialChannel],
            tp.[MonedaCodigo],
            tpd.[Precio]
          FROM [oms].[TarifaPrecioDetalle] tpd
          INNER JOIN [oms].[TarifaPrecio] tp
            ON tp.[TarifaPrecioId] = tpd.[TarifaPrecioId]
          WHERE tpd.[VarianteId] IN (${idList})
            AND tp.[EmpresaId]   = @empresaId
            AND tp.[Activo]      = 1
          ORDER BY tpd.[VarianteId] ASC
        `);
      },
      'shopifyCatalog.queryTarifas',
    );

    return result.recordset;
  }

  private async queryStock(varianteIds: number[]): Promise<StockRow[]> {
    if (varianteIds.length === 0) return [];

    const idList = varianteIds.map((_, i) => `@sid${i}`).join(', ');

    const result = await this.databaseService.execute<sql.IResult<StockRow>>(
      (pool) => {
        const req = pool.request();
        varianteIds.forEach((id, i) => req.input(`sid${i}`, sql.Int, id));
        return req.query<StockRow>(`
          SELECT
            [VarianteId],
            SUM([StockTotal] - ISNULL([StockReservado], 0)) AS [StockDisponible]
          FROM [oms].[Inventario]
          WHERE [VarianteId] IN (${idList})
          GROUP BY [VarianteId]
        `);
      },
      'shopifyCatalog.queryStock',
    );

    return result.recordset;
  }

  private buildAggregate(
    producto: ProductoBaseRow,
    variantes: VarianteRow[],
    tarifas: ShopifyTarifaRow[],
    stock: StockRow[],
    pricePriority: ShopifyOutboundPricePriority[],
  ): ShopifyOmsProductAggregate {
    const stockByVariante = new Map<number, number>();
    for (const s of stock) {
      stockByVariante.set(Number(s.VarianteId), s.StockDisponible);
    }

    const builtVariants: ShopifyOmsVariantAggregate[] = variantes.map((v) => ({
      varianteId: Number(v.VarianteId),
      sku: v.SKU,
      ean: v.EAN,
      nombre: v.Nombre,
      price: null, // se resuelve abajo
      stockDisponible: stockByVariante.get(Number(v.VarianteId)) ?? 0,
    }));

    const aggregate: ShopifyOmsProductAggregate = {
      productoId: Number(producto.ProductoId),
      empresaId: Number(producto.EmpresaId),
      title: producto.Nombre.trim(),
      descriptionHtml:
        producto.Descripcion?.trim() ||
        producto.DescripcionCorta?.trim() ||
        '',
      vendor: producto.Marca?.trim() ?? '',
      productType: producto.CategoriaNombre?.trim() ?? '',
      variants: builtVariants,
    };

    return ShopifyOmsCatalogRepository.resolvePrices(
      aggregate,
      tarifas,
      pricePriority,
    );
  }

  /**
   * Resuelve el precio de cada variante según la lista de prioridad configurada.
   * Devuelve las variantes con `price = null` si ninguna tarifa coincide.
   * Expuesto como estático para testear sin instanciar el repositorio.
   */
  static resolvePrices(
    aggregate: ShopifyOmsProductAggregate,
    tarifas: ShopifyTarifaRow[],
    pricePriority: ShopifyOutboundPricePriority[],
  ): ShopifyOmsProductAggregate {
    const tarifasByVariante = new Map<number, ShopifyTarifaRow[]>();
    for (const t of tarifas) {
      const variantId = Number(t.VarianteId);
      const list = tarifasByVariante.get(variantId) ?? [];
      list.push(t);
      tarifasByVariante.set(variantId, list);
    }

    const resolvedVariants = aggregate.variants.map((v) => {
      const varianteTarifas = tarifasByVariante.get(Number(v.varianteId)) ?? [];
      let selectedPrice: string | null = null;

      for (const priority of pricePriority) {
        const match = varianteTarifas.find(
          (t) =>
            t.ComercialChannel === priority.comercialChannel &&
            t.MonedaCodigo === priority.monedaCodigo,
        );
        if (match) {
          selectedPrice = match.Precio.toFixed(2);
          break;
        }
      }

      return { ...v, price: selectedPrice };
    });

    return { ...aggregate, variants: resolvedVariants };
  }
}
