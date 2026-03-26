// ============================================================
// Tipos para la Fase 2: Sync real OMS -> Shopify
// ============================================================

// ------------------------------------------------------------
// ConfigJson de oms.IntegracionSaliente para proveedor Shopify
// ------------------------------------------------------------

export type ShopifyOutboundPricePriority = {
  /** Canal comercial exacto tal como aparece en oms.TarifaPrecio.ComercialChannel */
  comercialChannel: string;
  /** Código de moneda exacto tal como aparece en oms.TarifaPrecio.MonedaCodigo */
  monedaCodigo: string;
};

export type ShopifyOutboundCatalogConfig = {
  /** Estado con el que se publican los productos en Shopify. Default: 'DRAFT'. */
  publishStatus: 'DRAFT' | 'ACTIVE';
  /**
   * Lista ordenada de prioridades de precio.
   * Se selecciona la primera tarifa que coincida para cada variante.
   * Si ninguna coincide, el sync se bloquea con 409.
   */
  pricePriority: ShopifyOutboundPricePriority[];
  /** Vendor por defecto cuando el producto no tiene marca. */
  defaultVendor?: string;
  /** ProductType por defecto cuando el producto no tiene categoría. */
  defaultProductType?: string;
};

export type ShopifyOutboundInventoryConfig = {
  /**
   * Shopify Location ID para sync de stock.
   * Si no está, usa SHOPIFY_LOCATION_ID de ENV.
   * Reservado para la fase de sync de inventario.
   */
  locationId?: string;
};

/** Contrato completo del ConfigJson almacenado en oms.IntegracionSaliente */
export type ShopifyOutboundConfigJson = {
  flowType: 'OUTBOUND';
  providerCode: 'SHOPIFY';
  catalog: ShopifyOutboundCatalogConfig;
  inventory?: ShopifyOutboundInventoryConfig;
};

// ------------------------------------------------------------
// Fila mapeada de oms.IntegracionSaliente
// ------------------------------------------------------------

export type ShopifyIntegracionSalienteRow = {
  integracionSalienteId: number;
  empresaId: number;
  providerCode: string;
  nombre: string;
  estado: string;
  config: ShopifyOutboundConfigJson;
};

// ------------------------------------------------------------
// Agregado OMS de producto listo para sync
// ------------------------------------------------------------

export type ShopifyOmsVariantAggregate = {
  varianteId: number;
  sku: string;
  ean: string | null;
  nombre: string | null;
  /** Precio seleccionado según pricePriority, ya como string '99900.00' */
  price: string | null;
  stockDisponible: number;
};

export type ShopifyOmsProductAggregate = {
  productoId: number;
  empresaId: number;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  variants: ShopifyOmsVariantAggregate[];
};

// ------------------------------------------------------------
// Filas de BD para mappings externos
// ------------------------------------------------------------

export type ExternalProductMappingRow = {
  integracionProductoExternoId: number;
  integracionSalienteId: number;
  productoId: number;
  externalProductId: string;
  estado: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type ExternalVariantMappingRow = {
  integracionVarianteExternaId: number;
  integracionSalienteId: number;
  productoId: number;
  varianteId: number;
  externalVariantId: string;
  inventoryItemId: string | null;
  estado: string;
  createdAt: Date;
  updatedAt: Date | null;
};

// ------------------------------------------------------------
// Inputs para upsert de mappings
// ------------------------------------------------------------

export type UpsertProductMappingInput = {
  integracionSalienteId: number;
  productoId: number;
  externalProductId: string;
  estado: string;
};

export type UpsertVariantMappingInput = {
  integracionSalienteId: number;
  productoId: number;
  varianteId: number;
  externalVariantId: string;
  inventoryItemId: string | null;
  estado: string;
};

// ------------------------------------------------------------
// Respuesta pública del endpoint POST /shopify/products/sync/:productoId
// ------------------------------------------------------------

export type ShopifySyncVariantResult = {
  varianteId: number;
  shopifyVariantId: string;
  inventoryItemId: string | null;
};

export type ShopifySyncProductResult = {
  ok: true;
  mode: 'CREATED' | 'UPDATED';
  integracionId: number;
  productoId: number;
  shopifyProductId: string;
  variants: ShopifySyncVariantResult[];
  warnings: string[];
};

// ------------------------------------------------------------
// Respuesta pública del endpoint POST /shopify/products/archive/:productoId
// ------------------------------------------------------------

export type ShopifyArchiveProductResult = {
  ok: true;
  productoId: number;
  shopifyProductId: string;
};

// ------------------------------------------------------------
// Respuesta pública del endpoint POST /shopify/inventory/sync/:productoId
// ------------------------------------------------------------

export type ShopifySyncInventoryVariantResult = {
  varianteId: number;
  inventoryItemId: string;
  quantity: number;
};

export type ShopifySyncInventoryResult = {
  ok: true;
  productoId: number;
  locationId: string;
  quantitiesSet: number;
  variants: ShopifySyncInventoryVariantResult[];
  warnings: string[];
};

// ------------------------------------------------------------
// Respuesta pública de los endpoints bulk sync-all
// ------------------------------------------------------------

export type ShopifySyncAllProductEntry = {
  productoId: number;
  ok: boolean;
  mode?: 'CREATED' | 'UPDATED';
  warnings?: string[];
  error?: string;
};

export type ShopifySyncAllProductsResult = {
  total: number;
  sincronizados: number;
  errores: number;
  resultados: ShopifySyncAllProductEntry[];
};

export type ShopifySyncAllInventoryEntry = {
  productoId: number;
  ok: boolean;
  quantitiesSet?: number;
  error?: string;
};

export type ShopifySyncAllInventoryResult = {
  total: number;
  sincronizados: number;
  errores: number;
  resultados: ShopifySyncAllInventoryEntry[];
};
