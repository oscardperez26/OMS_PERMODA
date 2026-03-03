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
