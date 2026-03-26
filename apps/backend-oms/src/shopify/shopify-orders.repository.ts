import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';

// ------------------------------------------------------------
// Tipos internos
// ------------------------------------------------------------

export type ShopifyOrderContext = {
  estadoId: number;
  monedaId: number;
  canalVentaId: number;
};

export type CreatePedidoLineaInput = {
  pedidoId: number;
  shopifyLineItemId: string;
  shopifyVariantId: string | null;
  shopifyProductId: string | null;
  varianteId: number | null;
  sku: string | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
};

type EstadoRow = { EstadoId: number };
type MonedaRow = { MonedaId: number };
type CanalRow = { CanalVentaId: number };
type PedidoIdRow = { PedidoId: number };
type VarianteRow = { VarianteId: number };

/**
 * Operaciones de BD específicas para la integración de pedidos Shopify:
 *   - Resolución de contexto (FKs de estado, moneda, canal)
 *   - Idempotencia de pedidos
 *   - Inserción de líneas de pedido
 *   - Reserva de stock
 *   - Resolución de VarianteId desde ShopifyVariantId
 */
@Injectable()
export class ShopifyOrdersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // ----------------------------------------------------------
  // Contexto de pedido (FKs lookup)
  // ----------------------------------------------------------

  /**
   * Resuelve los IDs de FK necesarios para insertar un pedido Shopify.
   * Lanza si algún FK no se encuentra (config incompleta en BD).
   */
  async resolveOrderContext(
    empresaId: number,
    monedaCodigo: string,
  ): Promise<ShopifyOrderContext> {
    const [estadoResult, monedaResult, canalResult] = await Promise.all([
      this.databaseService.execute<sql.IResult<EstadoRow>>(
        (pool) =>
          pool
            .request()
            .query<EstadoRow>(`
              SELECT TOP 1 [EstadoId]
              FROM [oms].[Estado]
              WHERE [Entidad] = N'PEDIDO'
                AND [Codigo]  = N'PAGADO'
                AND [Activo]  = 1
            `),
        'shopifyOrders.resolveEstado',
      ),
      this.databaseService.execute<sql.IResult<MonedaRow>>(
        (pool) =>
          pool
            .request()
            .input('monedaCodigo', sql.NVarChar(10), monedaCodigo.toUpperCase())
            .query<MonedaRow>(`
              SELECT TOP 1 [MonedaId]
              FROM [oms].[Moneda]
              WHERE UPPER([Codigo]) = @monedaCodigo
            `),
        'shopifyOrders.resolveMoneda',
      ),
      this.databaseService.execute<sql.IResult<CanalRow>>(
        (pool) =>
          pool
            .request()
            .input('empresaId', sql.Int, empresaId)
            .query<CanalRow>(`
              SELECT TOP 1 [CanalVentaId]
              FROM [oms].[CanalVenta]
              WHERE [Codigo]    = N'SHOPIFY'
                AND [EmpresaId] = @empresaId
                AND [Estado]    = N'ACTIVO'
            `),
        'shopifyOrders.resolveCanalVenta',
      ),
    ]);

    const estadoId = estadoResult.recordset[0]?.EstadoId;
    const monedaId = monedaResult.recordset[0]?.MonedaId;
    const canalVentaId = canalResult.recordset[0]?.CanalVentaId;

    if (!estadoId) throw new Error("Estado 'PAGADO' para PEDIDO no encontrado en oms.Estado");
    if (!monedaId) throw new Error(`Moneda '${monedaCodigo}' no encontrada en oms.Moneda`);
    if (!canalVentaId) throw new Error("Canal 'SHOPIFY' no encontrado en oms.CanalVenta para esta empresa");

    return { estadoId, monedaId, canalVentaId };
  }

  // ----------------------------------------------------------
  // Idempotencia
  // ----------------------------------------------------------

  /**
   * Busca un pedido existente por su ShopifyOrderId (almacenado en NumeroExterno).
   * Se usa para garantizar que el mismo webhook no cree pedidos duplicados.
   */
  async findPedidoByShopifyOrderId(
    integracionSalienteId: number,
    shopifyOrderId: string,
  ): Promise<{ pedidoId: number } | null> {
    const result = await this.databaseService.execute<sql.IResult<PedidoIdRow>>(
      (pool) =>
        pool
          .request()
          .input('integracionId', sql.Int, integracionSalienteId)
          .input('shopifyOrderId', sql.NVarChar(40), shopifyOrderId)
          .query<PedidoIdRow>(`
            SELECT TOP 1 [PedidoId]
            FROM [oms].[Pedido]
            WHERE [IntegracionId]  = @integracionId
              AND [NumeroExterno]  = @shopifyOrderId
          `),
      'shopifyOrders.findPedidoByShopifyOrderId',
    );

    const row = result.recordset[0];
    return row ? { pedidoId: Number(row.PedidoId) } : null;
  }

  // ----------------------------------------------------------
  // Líneas de pedido
  // ----------------------------------------------------------

  /**
   * Inserta una línea de pedido en oms.PedidoLinea.
   * La constraint UX_PedidoLinea_Shopify garantiza idempotencia
   * si se intenta insertar la misma línea dos veces.
   */
  async createPedidoLinea(input: CreatePedidoLineaInput): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('pedidoId', sql.BigInt, input.pedidoId)
          .input('shopifyLineItemId', sql.NVarChar(40), input.shopifyLineItemId)
          .input('shopifyVariantId', sql.NVarChar(40), input.shopifyVariantId ?? null)
          .input('shopifyProductId', sql.NVarChar(40), input.shopifyProductId ?? null)
          .input('varianteId', sql.BigInt, input.varianteId ?? null)
          .input('sku', sql.NVarChar(120), input.sku ?? null)
          .input('nombre', sql.NVarChar(500), input.nombre)
          .input('cantidad', sql.Int, input.cantidad)
          .input('precioUnitario', sql.Decimal(18, 2), input.precioUnitario)
          .input('total', sql.Decimal(18, 2), input.total)
          .query(`
            INSERT INTO [oms].[PedidoLinea]
              ([PedidoId], [ShopifyLineItemId], [ShopifyVariantId], [ShopifyProductId],
               [VarianteId], [SKU], [Nombre], [Cantidad], [PrecioUnitario], [Total])
            VALUES
              (@pedidoId, @shopifyLineItemId, @shopifyVariantId, @shopifyProductId,
               @varianteId, @sku, @nombre, @cantidad, @precioUnitario, @total);
          `),
      'shopifyOrders.createPedidoLinea',
    );
  }

  // ----------------------------------------------------------
  // Stock reservation
  // ----------------------------------------------------------

  /**
   * Incrementa StockReservado en oms.Inventario para la variante dada.
   * Solo actualiza si existe registro de inventario para esa variante.
   * No lanza si no hay registro — el warn lo maneja el service.
   */
  async reserveStock(varianteId: number, cantidad: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ affected: number }>>(
      (pool) =>
        pool
          .request()
          .input('varianteId', sql.BigInt, varianteId)
          .input('cantidad', sql.Int, cantidad)
          .query<{ affected: number }>(`
            UPDATE [oms].[Inventario]
            SET    [StockReservado] = ISNULL([StockReservado], 0) + @cantidad
            WHERE  [VarianteId] = @varianteId;
            SELECT @@ROWCOUNT AS [affected];
          `),
      'shopifyOrders.reserveStock',
    );

    return (result.recordset[0]?.affected ?? 0) > 0;
  }

  // ----------------------------------------------------------
  // Resolución de VarianteId
  // ----------------------------------------------------------

  /**
   * Resuelve el VarianteId OMS a partir del ExternalVariantId de Shopify.
   * Consulta oms.IntegracionVarianteExterna — solo variantes SINCRONIZADAS.
   * Retorna null si no hay mapping (variante no sincronizada desde OMS).
   */
  async resolveVarianteId(
    integracionSalienteId: number,
    shopifyVariantId: string,
  ): Promise<number | null> {
    const result = await this.databaseService.execute<sql.IResult<VarianteRow>>(
      (pool) =>
        pool
          .request()
          .input('integracionSalienteId', sql.Int, integracionSalienteId)
          .input('shopifyVariantId', sql.NVarChar(160), shopifyVariantId)
          .query<VarianteRow>(`
            SELECT TOP 1 [VarianteId]
            FROM [oms].[IntegracionVarianteExterna]
            WHERE [IntegracionSalienteId] = @integracionSalienteId
              AND [ExternalVariantId]     = @shopifyVariantId
              AND [Estado]               = N'SINCRONIZADO'
          `),
      'shopifyOrders.resolveVarianteId',
    );

    const row = result.recordset[0];
    return row ? Number(row.VarianteId) : null;
  }
}
