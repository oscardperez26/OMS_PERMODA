import type { AuthUser, Portal } from './auth.types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type LoginRequest = {
  username: string;
  password: string;
  portal: Portal;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const fallback = 'No se pudo completar la autenticación';
    const message = Array.isArray(payload?.message)
      ? payload?.message.join(', ')
      : payload?.message ?? fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<AuthResponse>(response);
}

export async function refresh(): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  return parseJsonResponse<AuthResponse>(response);
}

export async function me(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ user: AuthUser }>(response);
  return payload.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
