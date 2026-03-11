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
  | 'users.manage';

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
