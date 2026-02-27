import type { Permission, Portal, Role } from './auth.types';

export type ProfileAccess = {
  portal: Portal;
  role: Role;
  permissions: Permission[];
};

export type ProfileCatalogItem = {
  perfilId: number;
  label: string;
  portal: Portal;
  role: Role;
  permissions: Permission[];
};

/**
 * Ajusta estos IDs según tus datos reales en OMS.oms.Usuario.PerfilId
 * Ejemplo temporal:
 * 1 = Panel admin
 * 2 = Panel lectura
 * 3 = Tienda admin
 * 4 = Tienda lectura
 */
const PROFILE_CATALOG: ProfileCatalogItem[] = [
  {
    perfilId: 1,
    label: 'Panel Admin',
    portal: 'panel',
    role: 'ADMIN',
    permissions: [
      'orders.read',
      'orders.manage',
      'catalog.read',
      'catalog.manage',
      'users.manage',
    ],
  },
  {
    perfilId: 2,
    label: 'Panel Lectura',
    portal: 'panel',
    role: 'PANEL_READONLY',
    permissions: ['orders.read', 'catalog.read'],
  },
  {
    perfilId: 3,
    label: 'Tienda Admin',
    portal: 'tienda',
    role: 'STORE_ADMIN',
    permissions: ['orders.read', 'orders.manage', 'catalog.read'],
  },
  {
    perfilId: 4,
    label: 'Tienda Lectura',
    portal: 'tienda',
    role: 'STORE_READONLY',
    permissions: ['orders.read', 'catalog.read'],
  },
];

const PROFILE_MAP: Record<number, ProfileAccess> = Object.fromEntries(
  PROFILE_CATALOG.map((profile) => [
    profile.perfilId,
    {
      portal: profile.portal,
      role: profile.role,
      permissions: profile.permissions,
    },
  ]),
) as Record<number, ProfileAccess>;

export function resolveProfileAccess(perfilId: number): ProfileAccess | null {
  return PROFILE_MAP[perfilId] ?? null;
}

export function listProfileCatalog(): ProfileCatalogItem[] {
  return PROFILE_CATALOG;
}
