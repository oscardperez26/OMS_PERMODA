import type { CiudadListItem } from './ciudad.api';
import type { EmpresaListItem } from './empresa.api';
import type { PaisListItem } from './pais.api';
import type { TiendaListItem } from './tienda.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type BodegaListItem = {
  bodegaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  tiendaId?: number;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type BodegaBootstrapResponse = {
  bodegas: BodegaListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  tiendas: Pick<TiendaListItem, 'tiendaId' | 'empresaId' | 'codigo' | 'nombre'>[];
  paises: Pick<PaisListItem, 'paisId' | 'codigoISO2' | 'nombre'>[];
  ciudades: Pick<CiudadListItem, 'ciudadId' | 'paisId' | 'nombre'>[];
};

export type CreateBodegaRequest = {
  empresaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  tiendaId?: number;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  activo?: boolean;
};

export type UpdateBodegaRequest = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  tipo?: string;
  tiendaId?: number | null;
  paisId?: number | null;
  ciudadId?: number | null;
  direccion?: string | null;
  activo?: boolean;
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

export async function listBodegas(accessToken: string): Promise<BodegaListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/bodega`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ bodegas: BodegaListItem[] }>(response);
  return payload.bodegas;
}

export async function getBodegasBootstrap(
  accessToken: string,
): Promise<BodegaBootstrapResponse> {
  const response = await fetch(`${API_URL}/configuracion-general/bodega/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<BodegaBootstrapResponse>(response);
}

export async function createBodega(
  accessToken: string,
  request: CreateBodegaRequest,
): Promise<{ success: boolean; bodegaId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/bodega`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; bodegaId: number }>(response);
}

export async function updateBodega(
  accessToken: string,
  bodegaId: number,
  request: UpdateBodegaRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/bodega/${bodegaId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean }>(response);
}
