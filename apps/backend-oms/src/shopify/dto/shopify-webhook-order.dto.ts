/**
 * Subset del payload que Shopify envía en el webhook `orders/paid`.
 *
 * Solo incluye los campos que el OMS necesita para crear el Pedido,
 * las PedidoLineas y reservar stock. No se usa class-validator aquí
 * porque es un payload de sistema externo (ya validado por HMAC).
 *
 * Referencia: https://shopify.dev/docs/api/admin-rest/2024-01/resources/webhook
 */
export type ShopifyWebhookOrderPayload = {
  /** ID numérico del pedido en Shopify (ej: 820982911946154500) */
  id: number;
  /** Número de pedido visible al cliente (ej: 1001 → "#1001") */
  order_number: number;
  /** Estado financiero: 'paid', 'pending', 'refunded', etc. */
  financial_status: string;
  /** Estado de fulfillment: null | 'partial' | 'fulfilled' */
  fulfillment_status: string | null;
  /** Código de moneda ISO (ej: 'COP', 'USD') */
  currency: string;
  /** Email del cliente (puede ser null si compró como invitado) */
  email: string | null;
  /** Subtotal sin impuestos ni envío */
  subtotal_price: string;
  /** Impuestos totales */
  total_tax: string;
  /** Descuentos totales */
  total_discounts: string;
  /** Total del pedido */
  total_price: string;
  /** Costo de envío (estructura anidada de Shopify) */
  total_shipping_price_set?: {
    shop_money?: { amount: string };
  };
  /** Datos del cliente */
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  /** Dirección de envío */
  shipping_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    country_code?: string;
    phone?: string;
  };
  /** Líneas de productos del pedido */
  line_items: ShopifyWebhookLineItem[];
};

export type ShopifyWebhookLineItem = {
  /** ID numérico del line item en Shopify */
  id: number;
  /** ID de variante en Shopify (null si el producto fue eliminado) */
  variant_id: number | null;
  /** ID de producto en Shopify */
  product_id: number | null;
  /** Título del producto */
  title: string;
  /** Nombre completo (producto + variante) */
  name: string;
  /** SKU de la variante */
  sku: string | null;
  /** Cantidad comprada */
  quantity: number;
  /** Precio unitario como string (ej: "36900.00") */
  price: string;
};
