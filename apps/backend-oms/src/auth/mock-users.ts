import type { Permission, Role } from './auth.types';

export type UserRecord = {
  id: string;
  username: string;
  password: string;
  role: Role;
  permissions: Permission[];
  storeId?: string;
};

export const MOCK_USERS: UserRecord[] = [
  {
    id: 'u-admin-1',
    username: 'admin',
    password: 'admin123',
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
    id: 'u-store-admin-1',
    username: 'tienda',
    password: '1234',
    role: 'STORE_ADMIN',
    permissions: ['orders.read', 'orders.manage', 'catalog.read'],
    storeId: 'store-001',
  },
  {
    id: 'u-store-read-1',
    username: 'tienda-lectura',
    password: '1234',
    role: 'STORE_READONLY',
    permissions: ['orders.read', 'catalog.read'],
    storeId: 'store-001',
  },
];
