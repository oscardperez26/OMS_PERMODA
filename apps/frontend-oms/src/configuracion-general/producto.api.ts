import type { EmpresaListItem } from './empresa.api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type ProductoListItem = {
  productoId: number;
  empresaId: number;
  categoriaId?: number | null;
  categoriaNombre?: string | null;
  skuBase?: string;
  nombre: string;
  marca?: string | null;
  descripcion?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ProductoCategoriaListItem = {
  categoriaId: number;
  empresaId: number;
  nombre: string;
  activo: boolean;
};

export type ProductoBootstrapResponse = {
  productos: ProductoListItem[];
  empresas: Pick<EmpresaListItem, 'empresaId' | 'codigo' | 'nombre'>[];
  categorias: ProductoCategoriaListItem[];
};

export type CreateProductoRequest = {
  empresaId: number;
  skuBase?: string;
  nombre: string;
  activo?: boolean;
};

export type UpdateProductoRequest = {
  empresaId?: number;
  skuBase?: string;
  nombre?: string;
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

export async function listProductos(accessToken: string): Promise<ProductoListItem[]> {
  const response = await fetch(`${API_URL}/configuracion-general/producto`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ productos: ProductoListItem[] }>(response);
  return payload.productos;
}

export async function getProductosBootstrap(
  accessToken: string,
): Promise<ProductoBootstrapResponse> {
  const response = await fetch(`${API_URL}/configuracion-general/producto/bootstrap`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse<ProductoBootstrapResponse>(response);
}

export async function createProducto(
  accessToken: string,
  request: CreateProductoRequest,
): Promise<{ success: boolean; productoId: number }> {
  const response = await fetch(`${API_URL}/configuracion-general/producto`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  return parseJsonResponse<{ success: boolean; productoId: number }>(response);
}

export async function updateProducto(
  accessToken: string,
  productoId: number,
  request: UpdateProductoRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/configuracion-general/producto/${productoId}`, {
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
