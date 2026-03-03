import type { EmpresaListItem } from './empresa.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type PasarelaPagoListItem = {
  pasarelaPagoId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  configJson?: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type PasarelaPagoBootstrapResponse = {
  pasarelasPago: PasarelaPagoListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
};

export type CreatePasarelaPagoRequest = {
  empresaId: number;
  codigo: string;
  nombre: string;
  activo?: boolean;
  configJson?: string;
};

export type UpdatePasarelaPagoRequest = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  configJson?: string | null;
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

export async function listPasarelasPago(accessToken: string): Promise<PasarelaPagoListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/pasarela-pago`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ pasarelasPago: PasarelaPagoListItem[] }>(
    response,
  );
  return payload.pasarelasPago;
}

export async function getPasarelasPagoBootstrap(
  accessToken: string,
): Promise<PasarelaPagoBootstrapResponse> {
  const response = await fetch(`${API_URL}/configuracion-general/pasarela-pago/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<PasarelaPagoBootstrapResponse>(response);
}

export async function createPasarelaPago(
  accessToken: string,
  request: CreatePasarelaPagoRequest,
): Promise<{ success: boolean; pasarelaPagoId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/pasarela-pago`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; pasarelaPagoId: number }>(response);
}

export async function updatePasarelaPago(
  accessToken: string,
  pasarelaPagoId: number,
  request: UpdatePasarelaPagoRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/pasarela-pago/${pasarelaPagoId}`,
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
