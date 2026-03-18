import { useMemo, useState } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import { useProductosBootstrap } from '../../src/configuracion-general/useProductosBootstrap';
import '../gestor/ProductoPage.css';
import './ProductsPage.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type CatalogFilters = {
  empresaId: string;
  categoriaId: string;
  status: 'all' | 'active' | 'inactive';
  search: string;
};

type ProductoSearchItem = {
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
  ziSyncedAt?: string | null;
};

type ProductosSearchResponse = {
  productos: ProductoSearchItem[];
};

type FreshnessBadge = {
  className: 'is-unsynced' | 'is-fresh' | 'is-stale';
  label: string;
};

const INITIAL_FILTERS: CatalogFilters = {
  empresaId: '0',
  categoriaId: '0',
  status: 'all',
  search: '',
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

function getFreshnessBadge(ziSyncedAt?: string | null): FreshnessBadge {
  if (!ziSyncedAt) {
    return {
      className: 'is-unsynced',
      label: 'Sin sincronizar',
    };
  }

  const syncedAt = new Date(ziSyncedAt);
  if (Number.isNaN(syncedAt.getTime())) {
    return {
      className: 'is-unsynced',
      label: 'Sin sincronizar',
    };
  }

  const ageMs = Date.now() - syncedAt.getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  if (ageMs < sixHoursMs) {
    const totalMinutes = Math.max(1, Math.floor(ageMs / 60000));
    if (totalMinutes < 60) {
      return {
        className: 'is-fresh',
        label: `Actualizado hace ${totalMinutes} min`,
      };
    }

    const totalHours = Math.max(1, Math.floor(totalMinutes / 60));
    return {
      className: 'is-fresh',
      label: `Actualizado hace ${totalHours} h`,
    };
  }

  return {
    className: 'is-stale',
    label: 'Datos pueden estar desactualizados',
  };
}

export function ProductsPage() {
  const { accessToken } = useAuth();
  const {
    productos,
    empresas,
    categorias,
    isLoading: isBootstrapLoading,
    error: bootstrapError,
  } = useProductosBootstrap();
  const [filters, setFilters] = useState<CatalogFilters>(INITIAL_FILTERS);
  const [productCode, setProductCode] = useState('');
  const [searchResult, setSearchResult] = useState<ProductoSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const empresaMap = useMemo(() => {
    const map = new Map<number, { empresaId: number; codigo: string; nombre: string }>();
    empresas.forEach((empresa) => {
      map.set(empresa.empresaId, empresa);
    });
    return map;
  }, [empresas]);

  const categoriaMap = useMemo(() => {
    const map = new Map<number, { categoriaId: number; empresaId: number; nombre: string }>();
    categorias.forEach((categoria) => {
      map.set(categoria.categoriaId, categoria);
    });
    return map;
  }, [categorias]);

  const categoriasFiltrables = useMemo(() => {
    const selectedEmpresaId = Number(filters.empresaId);
    if (!Number.isInteger(selectedEmpresaId) || selectedEmpresaId <= 0) {
      return categorias;
    }
    return categorias.filter((categoria) => categoria.empresaId === selectedEmpresaId);
  }, [categorias, filters.empresaId]);

  const selectedCategoriaId = useMemo(() => {
    const categoriaId = Number(filters.categoriaId);
    const categoriaValida = categoriasFiltrables.some(
      (categoria) => categoria.categoriaId === categoriaId,
    );
    return categoriaValida ? categoriaId : 0;
  }, [categoriasFiltrables, filters.categoriaId]);

  const filteredProductos = useMemo(() => {
    const selectedEmpresaId = Number(filters.empresaId);
    const search = filters.search.trim().toLowerCase();

    return [...productos]
      .filter((producto) => {
        if (Number.isInteger(selectedEmpresaId) && selectedEmpresaId > 0) {
          return producto.empresaId === selectedEmpresaId;
        }
        return true;
      })
      .filter((producto) => {
        if (Number.isInteger(selectedCategoriaId) && selectedCategoriaId > 0) {
          return producto.categoriaId === selectedCategoriaId;
        }
        return true;
      })
      .filter((producto) => {
        if (filters.status === 'active') {
          return producto.activo;
        }
        if (filters.status === 'inactive') {
          return !producto.activo;
        }
        return true;
      })
      .filter((producto) => {
        if (!search) {
          return true;
        }
        const searchIndex = `${producto.nombre} ${producto.skuBase ?? ''} ${
          producto.marca ?? ''
        }`.toLowerCase();
        return searchIndex.includes(search);
      })
      .sort((a, b) => {
        const byNombre = a.nombre.localeCompare(b.nombre);
        return byNombre !== 0 ? byNombre : a.productoId - b.productoId;
      });
  }, [filters.empresaId, filters.search, filters.status, productos, selectedCategoriaId]);

  function formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-CO');
  }

  const hasActiveFilters =
    filters.empresaId !== '0' ||
    selectedCategoriaId !== 0 ||
    filters.status !== 'all' ||
    filters.search.trim().length > 0;

  async function handleDbSearch(): Promise<void> {
    const code = productCode.trim();
    if (!code) {
      setError('Ingresa un codigo de producto');
      setSearchResult([]);
      return;
    }
    if (!accessToken) {
      setError('Sesion no disponible');
      setSearchResult([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/configuracion-general/producto?search=${encodeURIComponent(code)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const payload = await parseJsonResponse<ProductosSearchResponse>(response);
      setSearchResult(payload.productos);

      if (payload.productos.length === 0) {
        setError(`No se encontro informacion del producto ${code} en BD`);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo consultar productos en BD';
      setError(message);
      setSearchResult([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="producto-page">
      <header className="producto-header">
        <h1>Productos</h1>
        <p>Consulta de catalogo con filtros por categoria, empresa, estado y busqueda.</p>
      </header>

      {bootstrapError && <p className="producto-error">{bootstrapError}</p>}

      <article className="producto-card">
        <h2>Consulta BD por codigo</h2>
        <div className="catalog-products-zi-search">
          <input
            type="text"
            value={productCode}
            onChange={(event) => setProductCode(event.target.value)}
            placeholder="Codigo de producto (SKU base o nombre)"
            maxLength={120}
          />
          <button type="button" onClick={() => void handleDbSearch()} disabled={isLoading}>
            Buscar
          </button>
        </div>

        {isLoading && <p className="producto-loading">Consultando BD...</p>}
        {error && <p className="producto-error">{error}</p>}

        {searchResult.length > 0 && (
          <div className="producto-table-wrap">
            <table className="producto-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>SKU base</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Frescura ZI</th>
                </tr>
              </thead>
              <tbody>
                {searchResult.map((producto) => {
                  const freshness = getFreshnessBadge(producto.ziSyncedAt);
                  return (
                    <tr key={`search-${producto.productoId}`}>
                      <td>{producto.productoId}</td>
                      <td>{producto.skuBase ?? '-'}</td>
                      <td>{producto.nombre}</td>
                      <td>{producto.marca ?? '-'}</td>
                      <td>
                        <span className={`catalog-products-sync-badge ${freshness.className}`}>
                          {freshness.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="producto-card">
        <div className="catalog-products-filters-header">
          <h2>Filtros</h2>
          <button
            type="button"
            className="catalog-products-clear-btn"
            onClick={() => setFilters(INITIAL_FILTERS)}
            disabled={!hasActiveFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="catalog-products-filters-grid">
          <label>
            Empresa
            <select
              value={filters.empresaId}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  empresaId: event.target.value,
                }))
              }
            >
              <option value="0">Todas</option>
              {empresas.map((empresa) => (
                <option key={empresa.empresaId} value={String(empresa.empresaId)}>
                  {empresa.nombre} ({empresa.codigo})
                </option>
              ))}
            </select>
          </label>

          <label>
            Categoria
            <select
              value={String(selectedCategoriaId)}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  categoriaId: event.target.value,
                }))
              }
            >
              <option value="0">Todas</option>
              {categoriasFiltrables.map((categoria) => (
                <option key={categoria.categoriaId} value={String(categoria.categoriaId)}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estado
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  status: event.target.value as CatalogFilters['status'],
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>

          <label>
            Buscar
            <input
              type="text"
              value={filters.search}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
              placeholder="Nombre, SKU o marca"
              maxLength={255}
            />
          </label>
        </div>
      </article>

      <article className="producto-card">
        <h2>Listado de productos ({filteredProductos.length})</h2>
        {isBootstrapLoading ? (
          <p className="producto-loading">Cargando productos...</p>
        ) : (
          <div className="producto-table-wrap">
            <table className="producto-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Categoria</th>
                  <th>SKU base</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  <th>Frescura ZI</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="producto-empty-cell">
                      {productos.length === 0
                        ? 'No hay productos registrados'
                        : 'No se encontraron productos con los filtros actuales'}
                    </td>
                  </tr>
                ) : (
                  filteredProductos.map((producto) => {
                    const empresa = empresaMap.get(producto.empresaId);
                    const categoria =
                      (producto.categoriaId
                        ? categoriaMap.get(producto.categoriaId)?.nombre
                        : null) ??
                      producto.categoriaNombre ??
                      'Sin categoria';

                    const freshness = getFreshnessBadge(
                      (producto as ProductoSearchItem).ziSyncedAt,
                    );

                    return (
                      <tr key={producto.productoId}>
                        <td>{producto.productoId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${producto.empresaId}`}
                        </td>
                        <td>{categoria}</td>
                        <td>{producto.skuBase ?? '-'}</td>
                        <td>{producto.nombre}</td>
                        <td>{producto.marca ?? '-'}</td>
                        <td>{producto.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(producto.createdAt)}</td>
                        <td>{formatDate(producto.updatedAt)}</td>
                        <td>
                          <span className={`catalog-products-sync-badge ${freshness.className}`}>
                            {freshness.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
