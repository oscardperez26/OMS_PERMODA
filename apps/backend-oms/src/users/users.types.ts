import type { Permission } from '../auth/auth.types';

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

export type CreateUserInput = {
  empresaId: number;
  empresaClienteId?: number;
  perfilId: number;
  nombre: string;
  email: string;
  telefono?: string;
  passwordHash: string;
  estado: number;
};

export type UsersActorContext = {
  actorUserId: string;
  actorEmpresaId: number | null;
  actorEmpresaClienteId: number | null;
  actorPermissions: Permission[];
  isGlobalSuperAdmin: boolean;
};

export type UserScopeItem = {
  id: string;
  empresaId: number | null;
  empresaClienteId: number | null;
  perfilId: number;
};
