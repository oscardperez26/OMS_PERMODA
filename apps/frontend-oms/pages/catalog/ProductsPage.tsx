import { Fragment, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  getZiCategorias,
  getZiMarcas,
  getZiProductoDetalle,
  listZiCatalogo,
} from '../../src/configuracion-general/zi-catalog.api';
import type {
  ZiCatalogListResult,
  ZiCatalogProductoDetalle,
  ZiCatalogProductoListItem,
  ZiCatalogTarifaItem,
} from '../../src/configuracion-general/zi-catalog.api';
import '../gestor/ProductoPage.css';
import './ProductsPage.css';

type FreshnessBadge = {
  className: 'is-unsynced' | 'is-fresh' | 'is-stale';
  label: string;
};

const INITIAL_FILTROS = {
  search: '',
  categoriaId: '',
  marca: '',
  soloConStock: false,
  page: 1,
  pageSize: 50,
};

type Filtros = typeof INITIAL_FILTROS;

function normalizeChannel(channel: string): string {
  return channel.trim().toUpperCase();
}

function getFreshnessBadge(ziSyncedAt?: string | null): FreshnessBadge {
  if (!ziSyncedAt) {
    return { className: 'is-unsynced', label: 'Sin sync' };
  }

  const syncedAt = new Date(ziSyncedAt);
  if (Number.isNaN(syncedAt.getTime())) {
    return { className: 'is-unsynced', label: 'Sin sync' };
  }

  const ageMs = Date.now() - syncedAt.getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  if (ageMs > sixHoursMs) {
    return { className: 'is-stale', label: '\u26A0 Desactualizado' };
  }

  const totalMinutes = Math.max(1, Math.floor(ageMs / 60_000));
  const label =
    totalMinutes < 60 ? `Hace ${totalMinutes} min` : `Hace ${Math.floor(totalMinutes / 60)} h`;
  return { className: 'is-fresh', label };
}

function sortTarifas(tarifas: ZiCatalogTarifaItem[]): ZiCatalogTarifaItem[] {
  const priority = (channel: string): number => {
    const normalized = normalizeChannel(channel);
    if (normalized === 'COLOMBIA') return 0;
    if (normalized === 'UNICO') return 1;
    return 2;
  };

  return [...tarifas].sort(
    (left, right) => priority(left.comercialChannel) - priority(right.comercialChannel),
  );
}

function formatPriceWithCurrency(value: number | null, currencyCode?: string | null): string {
  if (value === null) {
    return '-';
  }

  const normalized = currencyCode?.trim().toUpperCase() ?? '';
  if (!normalized) {
    return `$${value.toLocaleString('es-CO')} (moneda mixta)`;
  }

  if (normalized === 'COP') {
    return `$${Math.round(value).toLocaleString('es-CO')} COP`;
  }

  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatter.format(value)} ${normalized}`;
  } catch {
    return `$${value.toLocaleString('en-US')} ${normalized}`;
  }
}

function resolveListPrice(producto: ZiCatalogProductoListItem): string {
  if (
    producto.precioPrioritario !== null &&
    producto.precioPrioritario !== undefined &&
    producto.monedaPrioritaria
  ) {
    return formatPriceWithCurrency(producto.precioPrioritario, producto.monedaPrioritaria);
  }

  return formatPriceWithCurrency(producto.precioBaseMin, null);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ProductsPage() {
  const { accessToken } = useAuth();

  const [productos, setProductos] = useState<ZiCatalogListResult | null>(null);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<
    { categoriaId: number; nombre: string; total: number }[]
  >([]);
  const [filtros, setFiltros] = useState<Filtros>(INITIAL_FILTROS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<ZiCatalogProductoDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  const filtrosRef = useRef<Filtros>(INITIAL_FILTROS);
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstSearchEffectRef = useRef(true);
  filtrosRef.current = filtros;

  async function fetchList(nextFiltros: Filtros): Promise<void> {
    if (!accessToken) return;

    const requestId = ++listRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await listZiCatalogo(accessToken, nextFiltros);
      if (requestId !== listRequestIdRef.current) return;
      setProductos(result);
    } catch (requestError) {
      if (requestId !== listRequestIdRef.current) return;
      setError(getErrorMessage(requestError, 'No se pudo cargar el catalogo ZI'));
    } finally {
      if (requestId === listRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!accessToken) return;

    const requestId = ++listRequestIdRef.current;
    let cancelled = false;
    skipFirstSearchEffectRef.current = true;
    setIsBootstrapped(false);
    setError(null);
    setIsLoading(true);

    Promise.all([
      listZiCatalogo(accessToken, { page: 1, pageSize: 50 }),
      getZiMarcas(accessToken),
      getZiCategorias(accessToken),
    ])
      .then(([result, marcasData, categoriasData]) => {
        if (cancelled || requestId !== listRequestIdRef.current) return;
        setFiltros(INITIAL_FILTROS);
        setProductos(result);
        setMarcas(marcasData);
        setCategorias(categoriasData);
      })
      .catch((requestError) => {
        if (cancelled || requestId !== listRequestIdRef.current) return;
        setError(getErrorMessage(requestError, 'No se pudo cargar el catalogo ZI'));
      })
      .finally(() => {
        if (cancelled || requestId !== listRequestIdRef.current) return;
        setIsLoading(false);
        setIsBootstrapped(true);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !isBootstrapped) return;

    if (skipFirstSearchEffectRef.current) {
      skipFirstSearchEffectRef.current = false;
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      const nextFiltros = { ...filtrosRef.current, page: 1 };
      setDetalleId(null);
      setDetalle(null);
      setDetalleError(null);
      setFiltros(nextFiltros);
      void fetchList(nextFiltros);
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [accessToken, filtros.search, isBootstrapped]);

  useEffect(() => {
    if (detalleId === null) {
      setDetalle(null);
      setDetalleLoading(false);
      setDetalleError(null);
      return;
    }
    if (!accessToken) return;

    const requestId = ++detailRequestIdRef.current;
    setDetalleLoading(true);
    setDetalleError(null);
    setDetalle(null);

    getZiProductoDetalle(accessToken, detalleId)
      .then((payload) => {
        if (requestId !== detailRequestIdRef.current) return;
        setDetalle(payload);
      })
      .catch((requestError) => {
        if (requestId !== detailRequestIdRef.current) return;
        setDetalle(null);
        setDetalleError(getErrorMessage(requestError, 'No se pudo cargar el detalle del producto'));
      })
      .finally(() => {
        if (requestId === detailRequestIdRef.current) {
          setDetalleLoading(false);
        }
      });
  }, [accessToken, detalleId]);

  function handleSearchChange(value: string) {
    setDetalleId(null);
    setDetalle(null);
    setDetalleError(null);
    setFiltros({
      ...filtrosRef.current,
      search: value,
      page: 1,
    });
  }

  function handleFilterChange(
    key: 'categoriaId' | 'marca' | 'soloConStock',
    value: string | boolean,
  ) {
    const nextFiltros = {
      ...filtrosRef.current,
      [key]: value,
      page: 1,
    };
    setDetalleId(null);
    setDetalle(null);
    setDetalleError(null);
    setFiltros(nextFiltros);
    void fetchList(nextFiltros);
  }

  function handlePageChange(newPage: number) {
    const nextFiltros = {
      ...filtrosRef.current,
      page: newPage,
    };
    setDetalleId(null);
    setDetalle(null);
    setDetalleError(null);
    setFiltros(nextFiltros);
    void fetchList(nextFiltros);
  }

  function handleRowClick(productoId: number) {
    setDetalleId((current) => (current === productoId ? null : productoId));
  }

  function handleClearFiltros() {
    setDetalleId(null);
    setDetalle(null);
    setDetalleError(null);
    setFiltros(INITIAL_FILTROS);
    skipFirstSearchEffectRef.current = true;
    void fetchList(INITIAL_FILTROS);
  }

  const totalPages = productos?.totalPages ?? 1;
  const currentPage = productos?.page ?? filtros.page;

  return (
    <section className="producto-page">
      <header className="producto-header">
        <h1>Catalogo ZI</h1>
        <p>Productos sincronizados desde ZI. Filtros, paginacion y detalle por variante.</p>
      </header>

      {error && <p className="producto-error">{error}</p>}

      <article className="producto-card">
        <div className="catalog-products-filters-header">
          <h2>Filtros</h2>
          <button
            type="button"
            className="catalog-products-clear-btn"
            onClick={handleClearFiltros}
            disabled={isLoading}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="catalog-products-filters-grid">
          <label>
            Buscar
            <input
              type="text"
              value={filtros.search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Buscar por referencia, nombre..."
              maxLength={255}
            />
          </label>

          <label>
            Categoria
            <select
              value={filtros.categoriaId}
              onChange={(event) => handleFilterChange('categoriaId', event.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.categoriaId} value={String(categoria.categoriaId)}>
                  {categoria.nombre} ({categoria.total})
                </option>
              ))}
            </select>
          </label>

          <label>
            Marca
            <select
              value={filtros.marca}
              onChange={(event) => handleFilterChange('marca', event.target.value)}
            >
              <option value="">Todas</option>
              {marcas.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-products-checkbox-label">
            <input
              type="checkbox"
              checked={filtros.soloConStock}
              onChange={(event) => handleFilterChange('soloConStock', event.target.checked)}
            />
            Solo con stock
          </label>
        </div>
      </article>

      <article className="producto-card">
        <h2>
          Productos{' '}
          {productos && (
            <span className="catalog-products-count">({productos.total.toLocaleString('es-CO')})</span>
          )}
        </h2>

        {isLoading ? (
          <p className="producto-loading">Cargando...</p>
        ) : (
          <div className="producto-table-wrap table-responsive">
            <table className="producto-table table table-sm align-middle catalog-products-main-table">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Nombre</th>
                  <th>Categoria</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Sync</th>
                </tr>
              </thead>
              <tbody>
                {!productos || productos.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="producto-empty-cell">
                      No hay productos con los filtros actuales
                    </td>
                  </tr>
                ) : (
                  productos.items.map((producto) => {
                    const isExpanded = detalleId === producto.productoId;
                    const freshness = getFreshnessBadge(producto.ziSyncedAt);

                    return (
                      <Fragment key={producto.productoId}>
                        <tr
                          className={`catalog-products-row${isExpanded ? ' is-expanded' : ''}`}
                          onClick={() => handleRowClick(producto.productoId)}
                        >
                          <td>
                            <span className="catalog-products-sku">{producto.skuBase}</span>
                          </td>
                          <td className="catalog-products-nombre" title={producto.nombre}>
                            {producto.nombre}
                          </td>
                          <td>{producto.categoriaNombre ?? '-'}</td>
                          <td>{resolveListPrice(producto)}</td>
                          <td>
                            {producto.stockTotal > 0 ? (
                              <span className="catalog-products-badge is-stock">Con stock</span>
                            ) : (
                              <span className="catalog-products-badge is-no-stock">Sin stock</span>
                            )}
                          </td>
                          <td>
                            {freshness.className === 'is-fresh' ? (
                              <span className="catalog-products-dot-fresh" title={freshness.label} />
                            ) : (
                              <span className={`catalog-products-sync-badge ${freshness.className}`}>
                                {freshness.label}
                              </span>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="catalog-products-detail-row">
                            <td colSpan={6}>
                              {detalleLoading && <p className="producto-loading">Cargando detalle...</p>}

                              {!detalleLoading && detalleError && (
                                <p className="producto-error mb-0">{detalleError}</p>
                              )}

                              {!detalleLoading && !detalleError && detalle && (
                                <div className="catalog-products-detail">
                                  <div className="catalog-products-detail-section">
                                    <h4>Variantes ({detalle.variantes.length})</h4>
                                    <div className="table-responsive">
                                      <table className="producto-table table table-sm catalog-products-sub-table">
                                        <thead>
                                          <tr>
                                            <th>SKU</th>
                                            <th>Talla</th>
                                            <th>Color</th>
                                            <th>EAN</th>
                                            <th>Stock disp.</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detalle.variantes.map((variante) => (
                                            <tr key={String(variante.varianteId)}>
                                              <td>{variante.sku}</td>
                                              <td>{variante.nombreTalla ?? variante.talla ?? '-'}</td>
                                              <td>{variante.nombreColor ?? variante.color ?? '-'}</td>
                                              <td>{variante.ean}</td>
                                              <td>{variante.stockDisponible}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  <div className="catalog-products-detail-section">
                                    <h4>Tarifas ({detalle.tarifas.length})</h4>
                                    <div className="table-responsive">
                                      <table className="producto-table table table-sm catalog-products-sub-table">
                                        <thead>
                                          <tr>
                                            <th>Canal</th>
                                            <th>Moneda</th>
                                            <th>Precio base</th>
                                            <th>Oferta</th>
                                            <th>Impuesto</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sortTarifas(detalle.tarifas).map((tarifa) => (
                                            <tr key={String(tarifa.tarifaId)}>
                                              <td>{tarifa.comercialChannel}</td>
                                              <td>{tarifa.monedaCodigo}</td>
                                              <td>
                                                {formatPriceWithCurrency(tarifa.precioBase, tarifa.monedaCodigo)}
                                              </td>
                                              <td>
                                                {tarifa.tieneOfertaActiva && tarifa.precioOferta !== null ? (
                                                  <strong className="catalog-products-oferta">
                                                    {formatPriceWithCurrency(
                                                      tarifa.precioOferta,
                                                      tarifa.monedaCodigo,
                                                    )}
                                                  </strong>
                                                ) : (
                                                  '-'
                                                )}
                                              </td>
                                              <td>{tarifa.impuestoPct}%</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {productos && (
          <div className="catalog-products-pagination">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
            >
              Anterior
            </button>
            <span>
              Pagina {currentPage} de {totalPages} ({productos.total.toLocaleString('es-CO')} productos)
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
            >
              Siguiente
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
