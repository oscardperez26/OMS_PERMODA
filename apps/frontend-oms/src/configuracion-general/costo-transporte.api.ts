import type { EmpresaListItem } from './empresa.api';
import type { MonedaListItem } from './moneda.api';
import type { TransportadoraListItem } from './transportadora.api';
import type { ZonaTransporteListItem } from './zona-transporte.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export type CostoTransporteBootstrapResponse = {
  costosTransporte: CostoTransporteListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  zonasTransporte: Pick<
    ZonaTransporteListItem,
    'zonaTransporteId' | 'empresaId' | 'codigo' | 'nombre'
  >[];
  transportadoras: Pick<
    TransportadoraListItem,
    'transportadoraId' | 'empresaId' | 'codigo' | 'nombre'
  >[];
  monedas: Pick<MonedaListItem, 'monedaId' | 'codigo' | 'nombre'>[];
};

export type CreateCostoTransporteRequest = {
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
  activo?: boolean;
};

export type UpdateCostoTransporteRequest = {
  empresaId?: number;
  zonaTransporteId?: number;
  transportadoraId?: number;
  monedaId?: number;
  pesoMinKg?: number | null;
  pesoMaxKg?: number | null;
  valorMin?: number | null;
  valorMax?: number | null;
  costo?: number;
  diasMin?: number | null;
  diasMax?: number | null;
  activo?: boolean;
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

export async function listCostosTransporte(
  accessToken: string,
): Promise<CostoTransporteListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/costo-transporte`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ costosTransporte: CostoTransporteListItem[] }>(
    response,
  );
  return payload.costosTransporte;
}

export async function getCostosTransporteBootstrap(
  accessToken: string,
): Promise<CostoTransporteBootstrapResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/costo-transporte/bootstrap`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseJsonResponse<CostoTransporteBootstrapResponse>(response);
}

export async function createCostoTransporte(
  accessToken: string,
  request: CreateCostoTransporteRequest,
): Promise<{ success: boolean; costoTransporteId: string }> {
  const response = await fetch(`${API_URL}/configuracion-general/costo-transporte`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; costoTransporteId: string }>(response);
}

export async function updateCostoTransporte(
  accessToken: string,
  costoTransporteId: string,
  request: UpdateCostoTransporteRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/costo-transporte/${costoTransporteId}`,
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
