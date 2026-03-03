import type { CiudadListItem } from './ciudad.api';
import type { ZonaTransporteListItem } from './zona-transporte.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type ZonaCiudadListItem = {
  id: string;
  zonaTransporteId: number;
  ciudadId: number;
};

export type ZonaCiudadBootstrapResponse = {
  zonasCiudad: ZonaCiudadListItem[];
  zonasTransporte: Pick<
    ZonaTransporteListItem,
    'zonaTransporteId' | 'empresaId' | 'codigo' | 'nombre'
  >[];
  ciudades: Pick<CiudadListItem, 'ciudadId' | 'paisId' | 'nombre'>[];
};

export type CreateZonaCiudadRequest = {
  zonaTransporteId: number;
  ciudadId: number;
};

export type UpdateZonaCiudadRequest = {
  zonaTransporteId?: number;
  ciudadId?: number;
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

export async function listZonasCiudad(accessToken: string): Promise<ZonaCiudadListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/zona-ciudad`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ zonasCiudad: ZonaCiudadListItem[] }>(response);
  return payload.zonasCiudad;
}

export async function getZonasCiudadBootstrap(
  accessToken: string,
): Promise<ZonaCiudadBootstrapResponse> {
  const response = await fetch(`${API_URL}/configuracion-general/zona-ciudad/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<ZonaCiudadBootstrapResponse>(response);
}

export async function createZonaCiudad(
  accessToken: string,
  request: CreateZonaCiudadRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/zona-ciudad`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean }>(response);
}

export async function updateZonaCiudad(
  accessToken: string,
  zonaCiudadId: string,
  request: UpdateZonaCiudadRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/zona-ciudad/${zonaCiudadId}`, {
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
