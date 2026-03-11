import type { RuntimeBranding } from './branding.types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const DEFAULT_BRANDING: RuntimeBranding = {
  displayName: 'KOAJ',
  logoUrl: null,
  faviconUrl: null,
  source: 'default',
  empresaClienteId: null,
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const fallback = 'No se pudo cargar branding';
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function getMyBranding(accessToken: string): Promise<RuntimeBranding> {
  const response = await fetch(`${API_URL}/branding/me`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ branding?: RuntimeBranding }>(response);
  return payload.branding ?? DEFAULT_BRANDING;
}

export function getDefaultBranding(): RuntimeBranding {
  return DEFAULT_BRANDING;
}
