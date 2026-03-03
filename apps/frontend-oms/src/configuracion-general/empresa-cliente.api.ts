import type { CiudadListItem } from './ciudad.api';
import type { EmpresaListItem } from './empresa.api';
import type { PaisListItem } from './pais.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type EmpresaClienteListItem = {
  empresaClienteId: number;
  empresaId: number;
  nombre: string;
  documento?: string;
  email?: string;
  telefono?: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  estado: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type EmpresaClienteBootstrapResponse = {
  empresaClientes: EmpresaClienteListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  paises: Pick<PaisListItem, 'paisId' | 'codigoISO2' | 'nombre'>[];
  ciudades: Pick<CiudadListItem, 'ciudadId' | 'paisId' | 'nombre'>[];
};

export type CreateEmpresaClienteRequest = {
  empresaId: number;
  nombre: string;
  documento?: string;
  email?: string;
  telefono?: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  estado?: string;
};

export type UpdateEmpresaClienteRequest = {
  empresaId?: number;
  nombre?: string;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  paisId?: number | null;
  ciudadId?: number | null;
  direccion?: string | null;
  estado?: string;
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

export async function listEmpresaClientes(
  accessToken: string,
): Promise<EmpresaClienteListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/empresa-cliente`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ empresaClientes: EmpresaClienteListItem[] }>(
    response,
  );
  return payload.empresaClientes;
}

export async function getEmpresaClientesBootstrap(
  accessToken: string,
): Promise<EmpresaClienteBootstrapResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/empresa-cliente/bootstrap`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseJsonResponse<EmpresaClienteBootstrapResponse>(response);
}

export async function createEmpresaCliente(
  accessToken: string,
  request: CreateEmpresaClienteRequest,
): Promise<{ success: boolean; empresaClienteId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/empresa-cliente`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; empresaClienteId: number }>(response);
}

export async function updateEmpresaCliente(
  accessToken: string,
  empresaClienteId: number,
  request: UpdateEmpresaClienteRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/empresa-cliente/${empresaClienteId}`,
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
