const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type MonedaListItem = {
  monedaId: number;
  codigo: string;
  simbolo?: string;
  nombre: string;
  decimales: number;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateMonedaRequest = {
  codigo: string;
  simbolo?: string;
  nombre: string;
  decimales?: number;
};

export type UpdateMonedaRequest = {
  codigo?: string;
  simbolo?: string;
  nombre?: string;
  decimales?: number;
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

export async function listMonedas(accessToken: string): Promise<MonedaListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/moneda`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ monedas: MonedaListItem[] }>(response);
  return payload.monedas;
}

export async function createMoneda(
  accessToken: string,
  request: CreateMonedaRequest,
): Promise<{ success: boolean; monedaId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/moneda`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; monedaId: number }>(response);
}

export async function updateMoneda(
  accessToken: string,
  monedaId: number,
  request: UpdateMonedaRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/moneda/${monedaId}`, {
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
