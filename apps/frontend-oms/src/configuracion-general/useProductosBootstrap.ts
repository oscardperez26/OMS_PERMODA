import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import {
  getProductosBootstrap,
  type ProductoCategoriaListItem,
  type ProductoListItem,
} from './producto.api';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type ProductosBootstrapState = {
  isLoading: boolean;
  error: string;
  productos: ProductoListItem[];
  empresas: EmpresaOption[];
  categorias: ProductoCategoriaListItem[];
};

const INITIAL_STATE: ProductosBootstrapState = {
  isLoading: true,
  error: '',
  productos: [],
  empresas: [],
  categorias: [],
};

async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }

  throw lastError;
}

export function useProductosBootstrap() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<ProductosBootstrapState>(INITIAL_STATE);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setState({
        isLoading: false,
        error: 'Sesion no disponible',
        productos: [],
        empresas: [],
        categorias: [],
      });
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: '',
    }));

    try {
      const bootstrap = await withRetry(() => getProductosBootstrap(accessToken));
      setState({
        isLoading: false,
        error: '',
        productos: bootstrap.productos,
        empresas: bootstrap.empresas,
        categorias: bootstrap.categorias,
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar productos';
      setState({
        isLoading: false,
        error: message,
        productos: [],
        empresas: [],
        categorias: [],
      });
    }
  }, [accessToken]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadData]);

  const empresas = useMemo(
    () =>
      [...state.empresas].sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.empresaId - b.empresaId;
      }),
    [state.empresas],
  );

  const categorias = useMemo(
    () =>
      [...state.categorias].sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.categoriaId - b.categoriaId;
      }),
    [state.categorias],
  );

  return {
    isLoading: state.isLoading,
    error: state.error,
    productos: state.productos,
    empresas,
    categorias,
    reload: loadData,
  };
}
