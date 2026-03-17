import type {
  ZiCategoriaResponse,
  ZiChangeResponse,
  ZiPreciosResponse,
  ZiProductosResponse,
  ZiStockResponse,
} from '../../../backend-oms/src/configuracion-general/catalogo-zi/types/zi-api.types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export async function fetchZiChange(
  accessToken: string,
): Promise<ZiChangeResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/catalogo-zi/change`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return parseJsonResponse<ZiChangeResponse>(response);
}

export async function fetchZiProducts(
  accessToken: string,
  product: string,
): Promise<ZiProductosResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/catalogo-zi/products`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ product }),
    },
  );
  return parseJsonResponse<ZiProductosResponse>(response);
}

export async function fetchZiPrices(
  accessToken: string,
  product: string,
): Promise<ZiPreciosResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/catalogo-zi/prices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ product }),
    },
  );
  return parseJsonResponse<ZiPreciosResponse>(response);
}

export async function fetchZiStock(
  accessToken: string,
  product: string,
): Promise<ZiStockResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/catalogo-zi/stock`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ product }),
    },
  );
  return parseJsonResponse<ZiStockResponse>(response);
}

export async function fetchZiCategory(
  accessToken: string,
  id: string,
): Promise<ZiCategoriaResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/catalogo-zi/categories/${id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return parseJsonResponse<ZiCategoriaResponse>(response);
}
