export type CostoTransporteListItem = {
  costoTransporteId: string;
  empresaId: number;
  zonaTransporteId: number;
  transportadoraId: number;
  monedaId: number;
  pesoMinKg?: number;
  pesoMaxKg?: number;
  valorMin?: number;
  valorMax?: number;
  costo: number;
  diasMin?: number;
  diasMax?: number;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type CostoTransporteEmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type CostoTransporteZonaListItem = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type CostoTransporteTransportadoraListItem = {
  transportadoraId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type CostoTransporteMonedaListItem = {
  monedaId: number;
  codigo: string;
  nombre: string;
};

export type CostoTransporteBootstrapData = {
  costosTransporte: CostoTransporteListItem[];
  empresas: CostoTransporteEmpresaListItem[];
  zonasTransporte: CostoTransporteZonaListItem[];
  transportadoras: CostoTransporteTransportadoraListItem[];
  monedas: CostoTransporteMonedaListItem[];
};

export type CreateCostoTransporteInput = {
  empresaId: number;
  zonaTransporteId: number;
  transportadoraId: number;
  monedaId: number;
  pesoMinKg: number | null;
  pesoMaxKg: number | null;
  valorMin: number | null;
  valorMax: number | null;
  costo: number;
  diasMin: number | null;
  diasMax: number | null;
  activo: boolean;
};

export type UpdateCostoTransporteInput = {
  empresaId: number;
  zonaTransporteId: number;
  transportadoraId: number;
  monedaId: number;
  pesoMinKg: number | null;
  pesoMaxKg: number | null;
  valorMin: number | null;
  valorMax: number | null;
  costo: number;
  diasMin: number | null;
  diasMax: number | null;
  activo: boolean;
};

export type CostoTransporteRangeCandidate = {
  costoTransporteId: string;
  pesoMinKg: number | null;
  pesoMaxKg: number | null;
  valorMin: number | null;
  valorMax: number | null;
  diasMin: number | null;
  diasMax: number | null;
};
