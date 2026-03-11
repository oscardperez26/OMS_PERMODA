export type EmpresaClienteListItem = {
  empresaClienteId: number;
  empresaId: number;
  nombre: string;
  displayName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  documento?: string;
  email?: string;
  telefono?: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  estado: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type EmpresaClienteEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type EmpresaClientePaisListItem = {
  paisId: number;
  codigoISO2: string;
  nombre: string;
};

export type EmpresaClienteCiudadListItem = {
  ciudadId: number;
  paisId: number;
  nombre: string;
};

export type EmpresaClienteBootstrapData = {
  empresaClientes: EmpresaClienteListItem[];
  empresas: EmpresaClienteEmpresaListItem[];
  paises: EmpresaClientePaisListItem[];
  ciudades: EmpresaClienteCiudadListItem[];
};

export type CreateEmpresaClienteInput = {
  empresaId: number;
  nombre: string;
  displayName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  paisId: number | null;
  ciudadId: number | null;
  direccion: string | null;
  estado: string;
};

export type UpdateEmpresaClienteInput = {
  empresaId: number;
  nombre: string;
  displayName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  paisId: number | null;
  ciudadId: number | null;
  direccion: string | null;
  estado: string;
};
