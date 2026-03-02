import type { MonedaListItem } from './moneda.api';
import type { PaisListItem } from './pais.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type EmpresaListItem = {
  empresaId: number;
  codigo: string;
  nombre: string;
  nit?: string;
  email?: string;
  telefono?: string;
  paisId: number;
  ciudadId?: number;
  direccion?: string;
  monedaId: number;
  estado: unknown;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateEmpresaRequest = {
  codigo: string;
  nombre: string;
  nit?: string;
  email?: string;
  telefono?: string;
  paisId: number;
  ciudadId?: number | null;
  direccion?: string;
  monedaId: number;
};

export type UpdateEmpresaRequest = {
  codigo?: string;
  nombre?: string;
  nit?: string | null;
  email?: string | null;
  telefono?: string | null;
  paisId?: number;
  ciudadId?: number | null;
  direccion?: string | null;
  monedaId?: number;
};

export type EmpresasBootstrapResponse = {
  empresas: EmpresaListItem[];
  paises: PaisListItem[];
  monedas: MonedaListItem[];
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

export async function listEmpresas(accessToken: string): Promise<EmpresaListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/empresa`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ empresas: EmpresaListItem[] }>(response);
  return payload.empresas;
}

export async function getEmpresasBootstrap(
  accessToken: string,
): Promise<EmpresasBootstrapResponse> {
  const response = await fetch(`${API_URL}/configuracion-general/empresa/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<EmpresasBootstrapResponse>(response);
}

export async function createEmpresa(
  accessToken: string,
  request: CreateEmpresaRequest,
): Promise<{ success: boolean; empresaId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/empresa`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; empresaId: number }>(response);
}

export async function updateEmpresa(
  accessToken: string,
  empresaId: number,
  request: UpdateEmpresaRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/empresa/${empresaId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean }>(response);
}
