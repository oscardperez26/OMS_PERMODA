export type Role =
  | 'ADMIN'
  | 'PANEL_READONLY'
  | 'STORE_ADMIN'
  | 'STORE_READONLY';

export type Permission =
  | 'orders.read'
  | 'orders.manage'
  | 'catalog.read'
  | 'catalog.manage'
  | 'config.read'
  | 'config.manage'
  | 'users.manage'
  | 'security.manage';

export const KNOWN_PERMISSIONS: Permission[] = [
  'orders.read',
  'orders.manage',
  'catalog.read',
  'catalog.manage',
  'config.read',
  'config.manage',
  'users.manage',
  'security.manage',
];

export function isPermission(value: string): value is Permission {
  return KNOWN_PERMISSIONS.includes(value as Permission);
}

export type Portal = 'panel' | 'tienda';

export type SafeUser = {
  id: string;
  username: string;
  role: Role;
  permissions: Permission[];
  storeId?: string;
  empresaClienteId?: string;
};
// aqui puedes definir otros tipos relacionados con la autenticación, como el tipo de usuario que se obtiene de la base de datos, o el tipo de datos que se espera en el proceso de login. Por ejemplo:
export type AuthenticatedUser = SafeUser & {
  sessionId: string;
};

export type TokenPayload = {
  sub: string;
  role: Role;
  permissions: Permission[];
  sessionId: string;
  storeId?: string;
  empresaClienteId?: string;
  type: 'access' | 'refresh';
  exp: number;
};
