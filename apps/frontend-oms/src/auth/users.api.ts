const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type UserListItem = {
  id: string;
  empresaId: number;
  empresaClienteId?: number;
  perfilId: number;
  nombre: string;
  email: string;
  telefono?: string;
  estado: number | string | boolean;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateUserRequest = {
  empresaId: number;
  empresaClienteId?: number;
  perfilId: number;
  nombre: string;
  email: string;
  telefono?: string;
  temporaryPassword: string;
};

export type ProfileCatalogItem = {
  perfilId: number;
  label: string;
  portal: 'panel' | 'tienda';
  role: 'ADMIN' | 'PANEL_READONLY' | 'STORE_ADMIN' | 'STORE_READONLY';
  permissions: string[];
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const fallback = 'No se pudo completar la operación';
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function listUsers(accessToken: string): Promise<UserListItem[]> {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ users: UserListItem[] }>(response);
  return payload.users;
}

export async function createUser(
  accessToken: string,
  request: CreateUserRequest,
): Promise<{ success: boolean; userId: string }> {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; userId: string }>(response);
}

export async function updateUserStatus(
  accessToken: string,
  userId: string,
  estado: 0 | 1,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/users/${userId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ estado }),
  });

  return parseJsonResponse<{ success: boolean }>(response);
}

export async function resetUserPassword(
  accessToken: string,
  userId: string,
  newTemporaryPassword: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ newTemporaryPassword }),
  });

  return parseJsonResponse<{ success: boolean }>(response);
}

export async function listProfiles(accessToken: string): Promise<ProfileCatalogItem[]> {
  const response = await fetch(`${API_URL}/users/profiles`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ profiles: ProfileCatalogItem[] }>(response);
  return payload.profiles;
}
