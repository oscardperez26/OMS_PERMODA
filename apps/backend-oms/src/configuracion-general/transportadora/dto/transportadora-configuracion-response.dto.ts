import type { TransportadoraListItem } from '../transportadora.types';

export class TransportadoraConfiguracionStoreDto {
  tiendaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activa: boolean;
}

export class TransportadoraConfiguracionDataDto {
  servicio?: string;
  permiteExpress: boolean;
  moduloCode?: string;
}

export class TransportadoraConfiguracionZonaDto {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activa: boolean;
}

export class TransportadoraConfiguracionTarifaZonaDto {
  zonaSeleccionadaId: number;
  monedaId: number;
  costo?: number;
  diasMin?: number;
  diasMax?: number;
  activo: boolean;
}

export class TransportadoraConfiguracionResponseDto {
  transportadora: TransportadoraListItem;
  config: TransportadoraConfiguracionDataDto;
  tiendasSeleccionadas: TransportadoraConfiguracionStoreDto[];
  tiendasDisponibles: TransportadoraConfiguracionStoreDto[];
  zonasDisponibles: TransportadoraConfiguracionZonaDto[];
  zonaSeleccionadaId: number | null;
  tarifaZona: TransportadoraConfiguracionTarifaZonaDto | null;
}
