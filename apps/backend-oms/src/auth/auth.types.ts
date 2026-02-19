export type Role = 'ADMIN' | 'STORE_ADMIN' | 'STORE_READONLY';

export type Permission =
  | 'orders.read'
  | 'orders.manage'
  | 'catalog.read'
  | 'catalog.manage'
  | 'users.manage';

export type Portal = 'panel' | 'tienda';

export type SafeUser = {
  id: string;
  username: string;
  role: Role;
  permissions: Permission[];
  storeId?: string;
};

export type AuthenticatedUser = SafeUser & {
  sessionId: string;
};

export type TokenPayload = {
  sub: string;
  role: Role;
  permissions: Permission[];
  sessionId: string;
  storeId?: string;
  type: 'access' | 'refresh';
  exp: number;
};
