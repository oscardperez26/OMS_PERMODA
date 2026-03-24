/// <reference types="vite/client" />

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const CATALOG_BASE = `${API_URL}/configuracion-general/catalogo-zi/catalog`;

export class ZiCatalogApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ZiCatalogApiError';
    this.status = status;
  }
}

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
  precioPrioritario?: number | null;
  monedaPrioritaria?: string | null;
  canalPrioritario?: string | null;
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

export type ZiOpsStatus = {
  status: 'OK' | 'WARN' | 'ERROR';
  message: string;
  jobs: {
    zi: {
      enabled: boolean;
      cron: {
        stock: string;
        precios: string;
        productos: string;
        categorias: string;
      };
      config: {
        empresaId: number;
        batchSize: number;
      };
    };
    inbound: {
      enabled: boolean;
      cron: string;
      initialDelayMs: number;
      limit: number;
      maxConnectors: number;
    };
    ordersLegacy: {
      enabled: boolean;
      intervalMs: number;
      initialDelayMs: number;
      limit: number;
    };
  };
  alerts: Array<{
    level: 'INFO' | 'WARN' | 'ERROR';
    code: string;
    message: string;
  }>;
  healthSummary: {
    lastRunAt: string | null;
    lastStatus: 'OK' | 'ERROR' | 'UNKNOWN';
    lastError: string | null;
    runs24h: {
      total: number;
      ok: number;
      error: number;
    };
  };
  ziLastRuns: Array<{
    entity: string;
    productoZiId: number;
    status: 'ok' | 'error';
    error: string | null;
    recordsUpdated: number;
    startedAt: string;
    finishedAt: string;
    createdAt: string;
    durationMs: number;
  }>;
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
    throw new ZiCatalogApiError(response.status, message);
  }

  return payload as T;
}

function normalizeId(value: number | string): number | string {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
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

  const search = params.search?.trim();
  const categoriaId = params.categoriaId?.trim();
  const marca = params.marca?.trim();

  if (search) qs.set('search', search);
  if (categoriaId) qs.set('categoriaId', categoriaId);
  if (marca) qs.set('marca', marca);
  if (params.soloConStock === true) qs.set('soloConStock', 'true');
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

  const payload = await parseJsonResponse<ZiCatalogProductoDetalle>(response);
  return {
    ...payload,
    variantes: payload.variantes.map((item) => ({
      ...item,
      varianteId: normalizeId(item.varianteId),
    })),
    tarifas: payload.tarifas.map((item) => ({
      ...item,
      tarifaId: normalizeId(item.tarifaId),
    })),
  };
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

export async function getZiOpsStatus(accessToken: string): Promise<ZiOpsStatus> {
  const response = await fetch(`${API_URL}/configuracion-general/catalogo-zi/ops/status`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return parseJsonResponse<ZiOpsStatus>(response);
}

export async function syncZiFull(
  accessToken: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_URL}/configuracion-general/catalogo-zi/sync/full`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return parseJsonResponse<Record<string, unknown>>(response);
}

export async function syncZiCategorias(
  accessToken: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${API_URL}/configuracion-general/catalogo-zi/sync/categorias`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  return parseJsonResponse<Record<string, unknown>>(response);
}

export async function syncZiProducto(
  accessToken: string,
  productoId: number,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${API_URL}/configuracion-general/catalogo-zi/sync/producto/${productoId}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  return parseJsonResponse<Record<string, unknown>>(response);
}
