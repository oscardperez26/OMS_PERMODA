import type { Permission, Portal, Role } from '../auth/auth.types';

export type SecurityPermissionCatalogItem = {
  permisoId: number;
  codigo: Permission;
  nombre: string;
  modulo: string;
  accion: string;
  activo: boolean;
};

export type SecurityProfileItem = {
  perfilId: number;
  nombre: string;
  descripcion: string | null;
  portal: Portal | null;
  role: Role | null;
};

export type SecurityProfilePermissionItem = {
  perfilId: number;
  permissions: Permission[];
};

export type SecurityPermissionsBootstrap = {
  profiles: SecurityProfileItem[];
  permissions: SecurityPermissionCatalogItem[];
  assignments: SecurityProfilePermissionItem[];
};
