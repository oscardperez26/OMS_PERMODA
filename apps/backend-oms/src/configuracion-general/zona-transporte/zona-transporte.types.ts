export type ZonaTransporteListItem = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ZonaTransporteEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type ZonaTransportePaisListItem = {
  paisId: number;
  codigoISO2: string;
  nombre: string;
};

export type ZonaTransporteBootstrapData = {
  zonasTransporte: ZonaTransporteListItem[];
  empresas: ZonaTransporteEmpresaListItem[];
  paises: ZonaTransportePaisListItem[];
};

export type CreateZonaTransporteInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId: number | null;
  activo: boolean;
};

export type UpdateZonaTransporteInput = {
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId: number | null;
  activo: boolean;
};
