export type CiudadListItem = {
  ciudadId: number;
  paisId: number;
  nombre: string;
  departamento?: string;
  codigo?: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateCiudadInput = {
  paisId: number;
  nombre: string;
  departamento: string | null;
  codigo: string | null;
};

export type UpdateCiudadInput = {
  paisId: number;
  nombre: string;
  departamento: string | null;
  codigo: string | null;
};
