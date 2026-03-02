import type { Permission } from '../auth/auth.types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type DashboardOption = {
  id: string;
  label: string;
  description: string;
  frontendPath: string;
  permission: Permission;
  enabled: boolean;
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

// Lee opciones dinamicas del dashboard desde backend.
export async function listDashboardOptions(
  accessToken: string,
): Promise<DashboardOption[]> {
  const response = await fetch(`${API_URL}/configuracion-general/options`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ options: DashboardOption[] }>(response);
  return payload.options;
}
