export type CiudadListItem = {
  ciudadId: number;
  paisId: number;
  nombre: string;
  departamento?: string;
  codigo?: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type CiudadPaisListItem = {
  paisId: number;
  codigoISO2: string;
  codigoISO3?: string;
  nombre: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type CiudadBootstrapData = {
  ciudades: CiudadListItem[];
  paises: CiudadPaisListItem[];
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
