import { createContext } from 'react';
import type { AuthUser, Permission, Portal, Role } from './auth.types';

export type LoginParams = {
  username: string;
  password: string;
  portal: Portal;
};

export type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  hasPermissions: (permissions: Permission[]) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
