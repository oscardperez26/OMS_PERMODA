import type { EmpresaListItem } from './empresa.api';
import type { PaisListItem } from './pais.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type ZonaTransporteListItem = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ZonaTransporteBootstrapResponse = {
  zonasTransporte: ZonaTransporteListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  paises: Pick<PaisListItem, 'paisId' | 'codigoISO2' | 'nombre'>[];
};

export type CreateZonaTransporteRequest = {
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  activo?: boolean;
};

export type UpdateZonaTransporteRequest = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  paisId?: number | null;
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

export async function listZonasTransporte(
  accessToken: string,
): Promise<ZonaTransporteListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/zona-transporte`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ zonasTransporte: ZonaTransporteListItem[] }>(
    response,
  );
  return payload.zonasTransporte;
}

export async function getZonasTransporteBootstrap(
  accessToken: string,
): Promise<ZonaTransporteBootstrapResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/zona-transporte/bootstrap`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseJsonResponse<ZonaTransporteBootstrapResponse>(response);
}

export async function createZonaTransporte(
  accessToken: string,
  request: CreateZonaTransporteRequest,
): Promise<{ success: boolean; zonaTransporteId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/zona-transporte`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; zonaTransporteId: number }>(response);
}

export async function updateZonaTransporte(
  accessToken: string,
  zonaTransporteId: number,
  request: UpdateZonaTransporteRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/zona-transporte/${zonaTransporteId}`,
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
