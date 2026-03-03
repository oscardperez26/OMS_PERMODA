import type { CiudadListItem } from './ciudad.api';
import type { EmpresaListItem } from './empresa.api';
import type { PaisListItem } from './pais.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type TiendaListItem = {
  tiendaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  telefono?: string;
  fulfillmentHabilitado: boolean;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type TiendaBootstrapResponse = {
  tiendas: TiendaListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  paises: Pick<PaisListItem, 'paisId' | 'codigoISO2' | 'nombre'>[];
  ciudades: Pick<CiudadListItem, 'ciudadId' | 'paisId' | 'nombre'>[];
};

export type CreateTiendaRequest = {
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  telefono?: string;
  fulfillmentHabilitado?: boolean;
  activo?: boolean;
};

export type UpdateTiendaRequest = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  paisId?: number | null;
  ciudadId?: number | null;
  direccion?: string | null;
  telefono?: string | null;
  fulfillmentHabilitado?: boolean;
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

export async function listTiendas(accessToken: string): Promise<TiendaListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/tienda`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ tiendas: TiendaListItem[] }>(response);
  return payload.tiendas;
}

export async function getTiendasBootstrap(
  accessToken: string,
): Promise<TiendaBootstrapResponse> {
  const response = await fetch(`${API_URL}/configuracion-general/tienda/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<TiendaBootstrapResponse>(response);
}

export async function createTienda(
  accessToken: string,
  request: CreateTiendaRequest,
): Promise<{ success: boolean; tiendaId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/tienda`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; tiendaId: number }>(response);
}

export async function updateTienda(
  accessToken: string,
  tiendaId: number,
  request: UpdateTiendaRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/tienda/${tiendaId}`, {
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
