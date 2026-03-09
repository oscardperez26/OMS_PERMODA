import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from './auth.api';
import {
  clearAuthStorage,
  loadAccessToken,
  loadUser,
  saveAuth,
} from './auth.storage';
import type { AuthUser, Permission, Portal, Role } from './auth.types';

type LoginParams = {
  username: string;
  password: string;
  portal: Portal;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  hasPermissions: (permissions: Permission[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser<AuthUser>());
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    loadAccessToken(),
  );
  const [isLoading, setIsLoading] = useState(true);

  const persistAuth = useCallback((nextAccessToken: string, nextUser: AuthUser) => {
    saveAuth(nextAccessToken, nextUser);
    setAccessToken(nextAccessToken);
    setUser(nextUser);
  }, []);

  const clearAuth = useCallback(() => {
    clearAuthStorage();
    setAccessToken(null);
    setUser(null);
  }, []);

  const initialize = useCallback(async () => {
    try {
      const token = loadAccessToken();
      if (token) {
        const me = await authApi.me(token);
        persistAuth(token, me);
        return;
      }

      const refreshed = await authApi.refresh();
      persistAuth(refreshed.accessToken, refreshed.user);
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth, persistAuth]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const login = useCallback(
    async (params: LoginParams) => {
      const result = await authApi.login(params);
      persistAuth(result.accessToken, result.user);
      return result.user;
    },
    [persistAuth],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const hasRole = useCallback(
    (roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const hasPermissions = useCallback(
    (permissions: Permission[]) =>
      user ? permissions.every((permission) => user.permissions.includes(permission)) : false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      login,
      logout,
      hasRole,
      hasPermissions,
    }),
    [accessToken, hasPermissions, hasRole, isLoading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
