import type { EmpresaListItem } from './empresa.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export type TransportadoraBootstrapResponse = {
  transportadoras: TransportadoraListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
};

export type CreateTransportadoraRequest = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate?: string;
  activo?: boolean;
};

export type UpdateTransportadoraRequest = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  trackingUrlTemplate?: string | null;
  activo?: boolean;
};

export type TransportadoraConfiguracionStoreItem = {
  tiendaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activa: boolean;
};

export type TransportadoraConfiguracionZonaItem = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activa: boolean;
};

export type TransportadoraConfiguracionTarifaZona = {
  zonaSeleccionadaId: number;
  monedaId: number;
  costo?: number;
  diasMin?: number;
  diasMax?: number;
  activo: boolean;
};

export type TransportadoraConfiguracionData = {
  servicio?: string;
  permiteExpress: boolean;
  moduloCode?: string;
};

export type TransportadoraConfiguracionDetail = {
  transportadora: TransportadoraListItem;
  config: TransportadoraConfiguracionData;
  tiendasSeleccionadas: TransportadoraConfiguracionStoreItem[];
  tiendasDisponibles: TransportadoraConfiguracionStoreItem[];
  zonasDisponibles: TransportadoraConfiguracionZonaItem[];
  zonaSeleccionadaId: number | null;
  tarifaZona: TransportadoraConfiguracionTarifaZona | null;
};

export type UpdateTransportadoraConfiguracionRequest = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate?: string | null;
  activo: boolean;
  servicio?: string | null;
  permiteExpress: boolean;
  moduloCode?: string | null;
  zonaSeleccionadaId?: number;
  tarifaZona?: {
    costo: number;
    diasMin?: number | null;
    diasMax?: number | null;
    activo?: boolean;
  };
  tiendaIds: number[];
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const fallback = 'No se pudo completar la operacion';
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function listTransportadoras(
  accessToken: string,
): Promise<TransportadoraListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/transportadora`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ transportadoras: TransportadoraListItem[] }>(
    response,
  );
  return payload.transportadoras;
}

export async function getTransportadorasBootstrap(
  accessToken: string,
): Promise<TransportadoraBootstrapResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/transportadora/bootstrap`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseJsonResponse<TransportadoraBootstrapResponse>(response);
}

export async function createTransportadora(
  accessToken: string,
  request: CreateTransportadoraRequest,
): Promise<{ success: boolean; transportadoraId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/transportadora`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; transportadoraId: number }>(response);
}

export async function updateTransportadora(
  accessToken: string,
  transportadoraId: number,
  request: UpdateTransportadoraRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/transportadora/${transportadoraId}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    },
  );

  return parseJsonResponse<{ success: boolean }>(response);
}

export async function getTransportadoraConfiguracion(
  accessToken: string,
  transportadoraId: number,
  zonaSeleccionadaId?: number,
): Promise<TransportadoraConfiguracionDetail> {
  const query =
    zonaSeleccionadaId !== undefined
      ? `?zonaSeleccionadaId=${encodeURIComponent(String(zonaSeleccionadaId))}`
      : '';

  const response = await fetch(
    `${API_URL}/configuracion-general/transportadora/${transportadoraId}/configuracion${query}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseJsonResponse<TransportadoraConfiguracionDetail>(response);
}

export async function updateTransportadoraConfiguracion(
  accessToken: string,
  transportadoraId: number,
  request: UpdateTransportadoraConfiguracionRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/transportadora/${transportadoraId}/configuracion`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    },
  );

  return parseJsonResponse<{ success: boolean }>(response);
}
