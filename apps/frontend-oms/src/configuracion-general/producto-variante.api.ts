import type { EmpresaListItem } from './empresa.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type ProductoOption = {
  productoId: number;
  empresaId: number;
  skuBase?: string;
  nombre: string;
  activo: boolean;
};

export type ProductoVarianteListItem = {
  varianteId: number;
  empresaId: number;
  productoId: number;
  sku: string;
  ean?: string;
  nombre?: string;
  pesoKg?: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ProductoVarianteBootstrapResponse = {
  variantes: ProductoVarianteListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  productos: ProductoOption[];
};

export type CreateProductoVarianteRequest = {
  empresaId: number;
  productoId: number;
  sku: string;
  ean?: string;
  nombre?: string;
  pesoKg?: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  activo?: boolean;
};

export type UpdateProductoVarianteRequest = {
  empresaId?: number;
  productoId?: number;
  sku?: string;
  ean?: string | null;
  nombre?: string | null;
  pesoKg?: number | null;
  largoCm?: number | null;
  anchoCm?: number | null;
  altoCm?: number | null;
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

export async function listProductoVariantes(
  accessToken: string,
): Promise<ProductoVarianteListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/producto-variante`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ variantes: ProductoVarianteListItem[] }>(response);
  return payload.variantes;
}

export async function getProductoVariantesBootstrap(
  accessToken: string,
): Promise<ProductoVarianteBootstrapResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/producto-variante/bootstrap`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseJsonResponse<ProductoVarianteBootstrapResponse>(response);
}

export async function createProductoVariante(
  accessToken: string,
  request: CreateProductoVarianteRequest,
): Promise<{ success: boolean; varianteId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/producto-variante`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; varianteId: number }>(response);
}

export async function updateProductoVariante(
  accessToken: string,
  varianteId: number,
  request: UpdateProductoVarianteRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/producto-variante/${varianteId}`,
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
