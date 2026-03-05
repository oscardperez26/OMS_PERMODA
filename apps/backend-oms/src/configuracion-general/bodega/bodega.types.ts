export type BodegaListItem = {
  bodegaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  tiendaId?: number;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type BodegaEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type BodegaTiendaListItem = {
  tiendaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type BodegaPaisListItem = {
  paisId: number;
  codigoISO2: string;
  nombre: string;
};

export type BodegaCiudadListItem = {
  ciudadId: number;
  paisId: number;
  nombre: string;
};

export type BodegaBootstrapData = {
  bodegas: BodegaListItem[];
  empresas: BodegaEmpresaListItem[];
  tiendas: BodegaTiendaListItem[];
  paises: BodegaPaisListItem[];
  ciudades: BodegaCiudadListItem[];
};

export type CreateBodegaInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  tiendaId: number | null;
  paisId: number | null;
  ciudadId: number | null;
  direccion: string | null;
  activo: boolean;
};

export type UpdateBodegaInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  tiendaId: number | null;
  paisId: number | null;
  ciudadId: number | null;
  direccion: string | null;
  activo: boolean;
};
