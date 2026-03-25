export type ShopifyUserError = {
  field?: string[] | null;
  message: string;
};

export type ShopifyTestProductResult = {
  ok: true;
  productId: string;
  variantId: string;
  inventoryItemId: string;
};

export type ShopifyOmsVariantSource = {
  varianteId: number;
  sku: string;
  ean: string | null;
  nombre: string | null;
  pesoKg: number | null;
  precio: number | null;
  stockDisponible: number | null;
};

export type ShopifyOmsProductSource = {
  productoId: number;
  empresaId: number;
  title: string;
  descriptionHtml: string | null;
  vendor: string | null;
  productType: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  variants: ShopifyOmsVariantSource[];
};

// Los tipos de mapping externo y el contrato de repositorios de sync
// están definidos en shopify-sync.types.ts (Phase 2).
