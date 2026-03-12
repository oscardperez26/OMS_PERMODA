export type TransportadoraListItem = {
  transportadoraId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate?: string;
  activo: boolean;
  servicio?: string;
  permiteExpress: boolean;
  moduloCode?: string;
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
};

export type TransportadoraTiendaItem = {
  tiendaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activa: boolean;
};

export type TransportadoraZonaItem = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activa: boolean;
};

export type TransportadoraTarifaZonaItem = {
  zonaSeleccionadaId: number;
  monedaId: number;
  costo?: number;
  diasMin?: number;
  diasMax?: number;
  activo: boolean;
};

export type TransportadoraConfiguracionDetail = {
  transportadora: TransportadoraListItem;
  config: TransportadoraConfigItem;
  tiendasSeleccionadas: TransportadoraTiendaItem[];
  tiendasDisponibles: TransportadoraTiendaItem[];
  zonasDisponibles: TransportadoraZonaItem[];
  zonaSeleccionadaId: number | null;
  tarifaZona: TransportadoraTarifaZonaItem | null;
};

export type UpdateTransportadoraTarifaZonaInput = {
  costo: number;
  diasMin: number | null;
  diasMax: number | null;
  activo: boolean;
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
  zonaSeleccionadaId?: number;
  tarifaZona?: UpdateTransportadoraTarifaZonaInput;
  tiendaIds: number[];
};

export type TransportadoraApiAuthType = 'API_KEY';

export type TransportadoraApiConfigItem = {
  baseUrl?: string;
  authType: TransportadoraApiAuthType;
  timeoutMs: number;
  createShipmentEndpoint?: string;
  trackingEndpointTemplate?: string;
  trackingNumberField?: string;
  statusField?: string;
  hasApiKey: boolean;
  apiKeyLastRotatedAt?: string | null;
  updatedAt?: string | null;
};

export type TransportadoraApiConfigDetail = {
  transportadora: TransportadoraListItem;
  apiConfig: TransportadoraApiConfigItem;
};

export type UpsertTransportadoraApiConfigInput = {
  baseUrl: string | null;
  authType: TransportadoraApiAuthType;
  timeoutMs: number;
  createShipmentEndpoint: string | null;
  trackingEndpointTemplate: string | null;
  trackingNumberField: string | null;
  statusField: string | null;
  rotateApiKey: boolean;
  apiKeyCiphertext?: string;
  apiKeyIv?: string;
  apiKeyTag?: string;
  apiKeyLastRotatedAt?: string;
};
