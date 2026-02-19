const ACCESS_TOKEN_KEY = 'oms_access_token';
const USER_KEY = 'oms_auth_user';

export function saveAuth(accessToken: string, user: object): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function loadUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Limpieza de compatibilidad con el esquema anterior basado en role.
  localStorage.removeItem('role');
}
