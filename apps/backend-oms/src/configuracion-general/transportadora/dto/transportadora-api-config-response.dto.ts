import type { TransportadoraListItem } from '../transportadora.types';

export class TransportadoraApiConfigDto {
  baseUrl?: string;
  authType: 'API_KEY';
  timeoutMs: number;
  createShipmentEndpoint?: string;
  trackingEndpointTemplate?: string;
  trackingNumberField?: string;
  statusField?: string;
  hasApiKey: boolean;
  apiKeyLastRotatedAt?: string | null;
  updatedAt?: string | null;
}

export class TransportadoraApiConfigResponseDto {
  transportadora: TransportadoraListItem;
  apiConfig: TransportadoraApiConfigDto;
}
