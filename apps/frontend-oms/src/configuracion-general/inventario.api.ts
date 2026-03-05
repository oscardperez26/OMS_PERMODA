import type { EmpresaListItem } from './empresa.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type BodegaOption = {
  bodegaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
};

type VarianteOption = {
  varianteId: number;
  empresaId: number;
  productoId: number;
  productoNombre?: string;
  productoSkuBase?: string;
  sku: string;
  nombre?: string;
  activo: boolean;
};

export type InventarioListItem = {
  inventarioId: number;
  empresaId: number;
  bodegaId: number;
  varianteId: number;
  stockTotal: number;
  stockReservado: number;
  stockDisponible: number;
  updatedAt: string;
};

export type InventarioBootstrapResponse = {
  inventarios: InventarioListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  bodegas: BodegaOption[];
  variantes: VarianteOption[];
};

export type CreateInventarioRequest = {
  empresaId: number;
  bodegaId: number;
  varianteId: number;
  stockTotal: number;
  stockReservado?: number;
};

export type UpdateInventarioRequest = {
  empresaId?: number;
  bodegaId?: number;
  varianteId?: number;
  stockTotal?: number;
  stockReservado?: number;
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

export async function listInventarios(accessToken: string): Promise<InventarioListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/inventario`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ inventarios: InventarioListItem[] }>(response);
  return payload.inventarios;
}

export async function getInventariosBootstrap(
  accessToken: string,
): Promise<InventarioBootstrapResponse> {
  const response = await fetch(`${API_URL}/configuracion-general/inventario/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<InventarioBootstrapResponse>(response);
}

export async function createInventario(
  accessToken: string,
  request: CreateInventarioRequest,
): Promise<{ success: boolean; inventarioId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/inventario`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; inventarioId: number }>(response);
}

export async function updateInventario(
  accessToken: string,
  inventarioId: number,
  request: UpdateInventarioRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/inventario/${inventarioId}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    },
  );

  return parseJsonResponse<{ success: boolean }>(response);
}
