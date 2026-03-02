const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type PaisListItem = {
  paisId: number;
  codigoISO2: string;
  codigoISO3?: string;
  nombre: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreatePaisRequest = {
  codigoISO2: string;
  codigoISO3?: string;
  nombre: string;
};

export type UpdatePaisRequest = {
  codigoISO2?: string;
  codigoISO3?: string;
  nombre?: string;
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

export async function listPaises(accessToken: string): Promise<PaisListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/pais`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ paises: PaisListItem[] }>(response);
  return payload.paises;
}

export async function createPais(
  accessToken: string,
  request: CreatePaisRequest,
): Promise<{ success: boolean; paisId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/pais`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; paisId: number }>(response);
}

export async function updatePais(
  accessToken: string,
  paisId: number,
  request: UpdatePaisRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/pais/${paisId}`, {
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
