export type TransportadoraListItem = {
  transportadoraId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type TransportadoraEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type TransportadoraBootstrapData = {
  transportadoras: TransportadoraListItem[];
  empresas: TransportadoraEmpresaListItem[];
};

export type CreateTransportadoraInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate: string | null;
  activo: boolean;
};

export type UpdateTransportadoraInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate: string | null;
  activo: boolean;
};

export type TransportadoraConfigItem = {
  servicio?: string;
  permiteExpress: boolean;
  moduloCode?: string;
  costeFijo?: number;
  distanciaFijaKm?: number;
  costeIncrementalKm?: number;
  createdAt?: string;
  updatedAt?: string | null;
};

export type TransportadoraTiendaItem = {
  tiendaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activa: boolean;
};

export type TransportadoraConfiguracionDetail = {
  transportadora: TransportadoraListItem;
  config: TransportadoraConfigItem;
  tiendasSeleccionadas: TransportadoraTiendaItem[];
  tiendasDisponibles: TransportadoraTiendaItem[];
};

export type UpdateTransportadoraConfiguracionInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate: string | null;
  activo: boolean;
  servicio: string | null;
  permiteExpress: boolean;
  moduloCode: string | null;
  costeFijo: number | null;
  distanciaFijaKm: number | null;
  costeIncrementalKm: number | null;
  tiendaIds: number[];
};
