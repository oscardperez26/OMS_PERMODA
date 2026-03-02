export type MonedaListItem = {
  monedaId: number;
  codigo: string;
  simbolo?: string;
  nombre: string;
  decimales: number;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateMonedaInput = {
  codigo: string;
  simbolo: string | null;
  nombre: string;
  decimales: number;
};

export type UpdateMonedaInput = {
  codigo: string;
  simbolo: string | null;
  nombre: string;
  decimales: number;
};
