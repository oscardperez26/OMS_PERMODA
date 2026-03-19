/// <reference types="vite/client" />

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const CATALOG_BASE = `${API_URL}/configuracion-general/catalogo-zi/catalog`;

export type ZiCatalogListResult = {
  items: ZiCatalogProductoListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

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
  stockTotal: number;
  ziSyncedAt: string | null;
};

export type ZiCatalogVarianteItem = {
  varianteId: number | string;
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
  tarifaId: number | string;
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

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const fallback = 'No se pudo completar la operacion';
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function listZiCatalogo(
  accessToken: string,
  params: {
    search?: string;
    categoriaId?: string;
    marca?: string;
    soloConStock?: boolean;
    page?: number;
    pageSize?: number;
  },
): Promise<ZiCatalogListResult> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.categoriaId) qs.set('categoriaId', params.categoriaId);
  if (params.marca) qs.set('marca', params.marca);
  if (params.soloConStock) qs.set('soloConStock', 'true');
  if (params.page != null) qs.set('page', String(params.page));
  if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));

  const response = await fetch(`${CATALOG_BASE}?${qs.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return parseJsonResponse<ZiCatalogListResult>(response);
}

export async function getZiProductoDetalle(
  accessToken: string,
  productoId: number,
): Promise<ZiCatalogProductoDetalle> {
  const response = await fetch(`${CATALOG_BASE}/${productoId}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return parseJsonResponse<ZiCatalogProductoDetalle>(response);
}

export async function getZiMarcas(accessToken: string): Promise<string[]> {
  const response = await fetch(`${CATALOG_BASE}/filters/marcas`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return parseJsonResponse<string[]>(response);
}

export async function getZiCategorias(
  accessToken: string,
): Promise<{ categoriaId: number; nombre: string; total: number }[]> {
  const response = await fetch(`${CATALOG_BASE}/filters/categorias`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return parseJsonResponse<{ categoriaId: number; nombre: string; total: number }[]>(response);
}
