import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../orders/orders.repository';
import { ShopifyIntegracionSalienteRepository } from './shopify-integracion-saliente.repository';
import { ShopifyOrdersRepository } from './shopify-orders.repository';
import type { ShopifyWebhookOrderPayload } from './dto/shopify-webhook-order.dto';

// ------------------------------------------------------------
// Tipos de resultado
// ------------------------------------------------------------

export type ShopifyOrderWebhookResult = {
  ok: true;
  pedidoId: number;
  shopifyOrderId: string;
  lineasCreadas: number;
  lineasFallidas: number;
  stockReservado: number;
  skipped?: boolean;
};

// ------------------------------------------------------------

/**
 * Orquesta la creación de un Pedido OMS a partir de un webhook
 * `orders/paid` de Shopify.
 *
 * Flujo:
 *  1. Resolver integración saliente activa
 *  2. Idempotencia: si el pedido ya existe, retorna sin duplicar
 *  3. Resolver FKs de contexto (estadoId, monedaId, canalVentaId)
 *  4. Crear oms.Pedido via OrdersRepository (existente)
 *  5. Por cada line_item: resolver VarianteId, insertar PedidoLinea, reservar stock
 */
@Injectable()
export class ShopifyOrdersService {
  private readonly logger = new Logger(ShopifyOrdersService.name);

  constructor(
    private readonly integracionRepo: ShopifyIntegracionSalienteRepository,
    private readonly shopifyOrdersRepo: ShopifyOrdersRepository,
    private readonly ordersRepo: OrdersRepository,
  ) {}

  /**
   * Punto de entrada del webhook orders/paid.
   * @param empresaId  ID de empresa — se resuelve desde env (SHOPIFY_SYNC_EMPRESA_ID)
   *                   o puede ser 1 como valor por defecto.
   */
  async handleOrderPaid(
    payload: ShopifyWebhookOrderPayload,
    empresaId = 1,
  ): Promise<ShopifyOrderWebhookResult> {
    const shopifyOrderId = String(payload.id);

    // 1. Resolver integración activa
    const integracion = await this.integracionRepo.findActiveForEmpresa(empresaId);
    if (!integracion) {
      throw new NotFoundException(
        `No existe integración Shopify activa para empresa ${empresaId}`,
      );
    }
    const { integracionSalienteId } = integracion;

    // 2. Idempotencia a nivel de Pedido
    const existing = await this.shopifyOrdersRepo.findPedidoByShopifyOrderId(
      integracionSalienteId,
      shopifyOrderId,
    );

    let pedidoId: number;

    if (existing) {
      // El pedido ya existe: continuar al loop de líneas para insertar las faltantes.
      // El INSERT idempotente en createPedidoLinea evita duplicados.
      this.logger.log(
        `Pedido Shopify ${shopifyOrderId} ya existe (PedidoId=${existing.pedidoId}), procesando líneas faltantes`,
      );
      pedidoId = existing.pedidoId;
    } else {
      // 3. Resolver contexto de pedido (FKs) — solo para pedidos nuevos
      const monedaCodigo = payload.currency ?? 'COP';
      const ctx = await this.shopifyOrdersRepo.resolveOrderContext(empresaId, monedaCodigo);

      // 4. Crear oms.Pedido
      const clienteNombre = this.buildClienteNombre(payload);
      const costoEnvio = parseFloat(
        payload.total_shipping_price_set?.shop_money?.amount ?? '0',
      );

      const pedidoResult = await this.ordersRepo.createPedido({
        empresaId,
        empresaClienteId: null,
        integracionId: integracionSalienteId,
        canalVentaId: ctx.canalVentaId,
        tiendaOrigenId: null,
        monedaId: ctx.monedaId,
        numeroPedido: `#${payload.order_number}`,
        numeroExterno: shopifyOrderId,
        estadoId: ctx.estadoId,
        clienteNombre,
        clienteDocumento: null,
        clienteEmail: payload.email ?? payload.customer?.email ?? null,
        clienteTelefono:
          payload.shipping_address?.phone ?? payload.customer?.phone ?? null,
        shippingPaisId: null,
        shippingCiudadId: null,
        shippingDireccion: payload.shipping_address?.address1 ?? null,
        shippingBarrio: payload.shipping_address?.address2 ?? null,
        shippingZip: payload.shipping_address?.zip ?? null,
        subtotal: parseFloat(payload.subtotal_price),
        descuento: parseFloat(payload.total_discounts),
        impuestos: parseFloat(payload.total_tax),
        costoEnvio,
        total: parseFloat(payload.total_price),
        pasarelaPagoId: null,
        pagoReferencia: null,
        pagoEstadoId: null,
        createdAt: new Date(),
      });

      pedidoId = pedidoResult.pedidoId;
    }

    // 5. Insertar líneas + reservar stock
    let lineasCreadas = 0;
    let lineasFallidas = 0;
    let stockReservado = 0;

    for (const item of payload.line_items) {
      const shopifyVariantId = item.variant_id ? String(item.variant_id) : null;
      const shopifyProductId = item.product_id ? String(item.product_id) : null;
      const shopifyLineItemId = String(item.id);

      try {
        // Resolver VarianteId OMS
        let varianteId: number | null = null;
        if (shopifyVariantId) {
          varianteId = await this.shopifyOrdersRepo.resolveVarianteId(
            integracionSalienteId,
            shopifyVariantId,
          );
          if (!varianteId) {
            this.logger.warn(
              `Pedido ${shopifyOrderId} → LineItem ${shopifyLineItemId}: ` +
                `ShopifyVariantId=${shopifyVariantId} sin mapping en IntegracionVarianteExterna`,
            );
          }
        }

        const precioUnitario = parseFloat(item.price);
        const total = precioUnitario * item.quantity;

        const inserted = await this.shopifyOrdersRepo.createPedidoLinea({
          pedidoId,
          shopifyLineItemId,
          shopifyVariantId,
          shopifyProductId,
          varianteId,
          sku: item.sku,
          nombre: item.name || item.title || `Item ${shopifyLineItemId}`,
          cantidad: item.quantity,
          precioUnitario,
          total,
        });

        if (inserted) {
          lineasCreadas++;
          // Reservar stock solo si la línea es nueva y tiene VarianteId
          if (varianteId) {
            const reserved = await this.shopifyOrdersRepo.reserveStock(
              varianteId,
              item.quantity,
            );
            if (reserved) {
              stockReservado++;
            } else {
              this.logger.warn(
                `Pedido ${shopifyOrderId} → VarianteId=${varianteId}: ` +
                  `sin registro en oms.Inventario, stock no reservado`,
              );
            }
          }
        }
      } catch (err) {
        // Un fallo en una línea no detiene el procesamiento del resto
        lineasFallidas++;
        this.logger.error(
          `Pedido ${shopifyOrderId} → LineItem ${shopifyLineItemId}: error al insertar — ${String(err)}`,
        );
      }
    }

    this.logger.log(
      `Pedido Shopify ${shopifyOrderId} procesado → PedidoId=${pedidoId}, ` +
        `lineas=${lineasCreadas}, fallidas=${lineasFallidas}, stockReservado=${stockReservado}`,
    );

    return {
      ok: true,
      pedidoId,
      shopifyOrderId,
      lineasCreadas,
      lineasFallidas,
      stockReservado,
    };
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private buildClienteNombre(payload: ShopifyWebhookOrderPayload): string {
    const first = payload.customer?.first_name?.trim() ?? '';
    const last = payload.customer?.last_name?.trim() ?? '';
    const full = `${first} ${last}`.trim();
    return full || payload.email || 'Cliente Shopify';
  }
}
