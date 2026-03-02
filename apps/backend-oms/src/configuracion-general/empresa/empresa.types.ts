export type EmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
  nit?: string;
  email?: string;
  telefono?: string;
  paisId: number;
  ciudadId?: number;
  direccion?: string;
  monedaId: number;
  estado: unknown;
  createdAt: string;
  updatedAt?: string | null;
};

export type EmpresaPaisListItem = {
  paisId: number;
  codigoISO2: string;
  codigoISO3?: string;
  nombre: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type EmpresaMonedaListItem = {
  monedaId: number;
  codigo: string;
  simbolo?: string;
  nombre: string;
  decimales: number;
  createdAt: string;
  updatedAt?: string | null;
};

export type EmpresaBootstrapData = {
  empresas: EmpresaListItem[];
  paises: EmpresaPaisListItem[];
  monedas: EmpresaMonedaListItem[];
};

export type CreateEmpresaInput = {
  codigo: string;
  nombre: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  paisId: number;
  ciudadId: number | null;
  direccion: string | null;
  monedaId: number;
};

export type UpdateEmpresaInput = {
  codigo: string;
  nombre: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  paisId: number;
  ciudadId: number | null;
  direccion: string | null;
  monedaId: number;
};
