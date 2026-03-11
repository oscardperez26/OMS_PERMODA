import type { Permission, Portal, Role } from '../auth/auth.types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type SecurityProfileItem = {
  perfilId: number;
  nombre: string;
  descripcion: string | null;
  portal: Portal | null;
  role: Role | null;
};

export type SecurityPermissionItem = {
  permisoId: number;
  codigo: Permission;
  nombre: string;
  modulo: string;
  accion: string;
  activo: boolean;
};

export type SecurityProfileAssignment = {
  perfilId: number;
  permissions: Permission[];
};

export type SecurityPermissionsBootstrap = {
  profiles: SecurityProfileItem[];
  permissions: SecurityPermissionItem[];
  assignments: SecurityProfileAssignment[];
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

export async function getSecurityPermissionsBootstrap(
  accessToken: string,
): Promise<SecurityPermissionsBootstrap> {
  const response = await fetch(`${API_URL}/security/permissions/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<SecurityPermissionsBootstrap>(response);
}

export async function updateProfilePermissions(
  accessToken: string,
  perfilId: number,
  permissions: Permission[],
): Promise<{ success: true }> {
  const response = await fetch(
    `${API_URL}/security/permissions/perfiles/${perfilId}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ permissions }),
    },
  );

  return parseJsonResponse<{ success: true }>(response);
}
