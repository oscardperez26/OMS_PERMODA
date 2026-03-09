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
  costeFijo?: number;
  distanciaFijaKm?: number;
  costeIncrementalKm?: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export class TransportadoraConfiguracionResponseDto {
  transportadora: TransportadoraListItem;
  config: TransportadoraConfiguracionDataDto;
  tiendasSeleccionadas: TransportadoraConfiguracionStoreDto[];
  tiendasDisponibles: TransportadoraConfiguracionStoreDto[];
}
