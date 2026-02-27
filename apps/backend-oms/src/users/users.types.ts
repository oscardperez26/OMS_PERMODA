export type UserListItem = {
  id: string;
  empresaId: number;
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
  perfilId: number;
  nombre: string;
  email: string;
  telefono?: string;
  passwordHash: string;
  estado: number;
};
