export type ZiCatalogProductoListItem = {
  productoId: number;
  skuBase: string;
  nombre: string;
  marca: string | null;
  activo: boolean;
  categoriaNombre: string | null;
  categoriaId: number | null;
  totalVariantes: number;
  precioBaseMin: number | null;
  precioBaseMax: number | null;
  precioPrioritario: number | null;
  monedaPrioritaria: string | null;
  canalPrioritario: string | null;
  stockTotal: number;
  ziSyncedAt: string | null;
};

export type ZiCatalogListResult = {
  items: ZiCatalogProductoListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ZiCatalogVarianteItem = {
  varianteId: number;
  sku: string;
  ean: string;
  talla: string | null;
  color: string | null;
  nombreTalla: string | null;
  nombreColor: string | null;
  stockTotal: number;
  stockDisponible: number;
};

export type ZiCatalogTarifaItem = {
  tarifaId: number;
  comercialChannel: string;
  monedaCodigo: string;
  impuestoPct: number;
  precioBase: number;
  tieneOfertaActiva: boolean;
  precioOferta: number | null;
};

export type ZiCatalogProductoDetalle = {
  productoId: number;
  skuBase: string;
  nombre: string;
  marca: string | null;
  activo: boolean;
  descripcion: string | null;
  descripcionCorta: string | null;
  metaTitulo: string | null;
  metaDescripcion: string | null;
  url: string | null;
  categoriaNombre: string | null;
  instruccionesCuidado: string | null;
  ziSyncedAt: string | null;
  variantes: ZiCatalogVarianteItem[];
  tarifas: ZiCatalogTarifaItem[];
};
