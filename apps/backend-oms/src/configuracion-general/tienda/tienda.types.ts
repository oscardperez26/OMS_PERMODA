export type TiendaListItem = {
  tiendaId: number;
  empresaId: number;
  empresaClienteId?: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  telefono?: string;
  fulfillmentHabilitado: boolean;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type TiendaEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type TiendaEmpresaClienteListItem = {
  empresaClienteId: number;
  empresaId: number;
  nombre: string;
};

export type TiendaPaisListItem = {
  paisId: number;
  codigoISO2: string;
  nombre: string;
};

export type TiendaCiudadListItem = {
  ciudadId: number;
  paisId: number;
  nombre: string;
};

export type TiendaBootstrapData = {
  tiendas: TiendaListItem[];
  empresas: TiendaEmpresaListItem[];
  empresaClientes: TiendaEmpresaClienteListItem[];
  paises: TiendaPaisListItem[];
  ciudades: TiendaCiudadListItem[];
};

export type CreateTiendaInput = {
  empresaId: number;
  empresaClienteId: number | null;
  codigo: string;
  nombre: string;
  paisId: number | null;
  ciudadId: number | null;
  direccion: string | null;
  telefono: string | null;
  fulfillmentHabilitado: boolean;
  activo: boolean;
};

export type UpdateTiendaInput = {
  empresaId: number;
  empresaClienteId: number | null;
  codigo: string;
  nombre: string;
  paisId: number | null;
  ciudadId: number | null;
  direccion: string | null;
  telefono: string | null;
  fulfillmentHabilitado: boolean;
  activo: boolean;
};
