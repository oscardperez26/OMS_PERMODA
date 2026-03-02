const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type CiudadListItem = {
  ciudadId: number;
  paisId: number;
  nombre: string;
  departamento?: string;
  codigo?: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateCiudadRequest = {
  paisId: number;
  nombre: string;
  departamento?: string;
  codigo?: string;
};

export type UpdateCiudadRequest = {
  paisId?: number;
  nombre?: string;
  departamento?: string;
  codigo?: string;
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

export async function listCiudades(accessToken: string): Promise<CiudadListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/ciudad`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ ciudades: CiudadListItem[] }>(response);
  return payload.ciudades;
}

export async function createCiudad(
  accessToken: string,
  request: CreateCiudadRequest,
): Promise<{ success: boolean; ciudadId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/ciudad`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; ciudadId: number }>(response);
}

export async function updateCiudad(
  accessToken: string,
  ciudadId: number,
  request: UpdateCiudadRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/ciudad/${ciudadId}`, {
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
