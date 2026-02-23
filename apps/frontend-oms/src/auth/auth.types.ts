export type Role = 'ADMIN' | 'STORE_ADMIN' | 'STORE_READONLY' ;

export type Permission =
  | 'orders.read'
  | 'orders.manage'
  | 'catalog.read'
  | 'catalog.manage'
  | 'users.manage';

export type Portal = 'panel' | 'tienda';

export type AuthUser = {
  id: string;
  username: string;
  role: Role;
  permissions: Permission[];
  storeId?: string;
};
