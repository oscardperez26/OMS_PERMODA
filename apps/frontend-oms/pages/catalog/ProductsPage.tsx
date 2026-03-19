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
  ZiCatalogTarifaItem,
} from '../../src/configuracion-general/zi-catalog.api';
import '../gestor/ProductoPage.css';
import './ProductsPage.css';

type FreshnessBadge = {
  className: 'is-unsynced' | 'is-fresh' | 'is-stale';
  label: string;
};

function getFreshnessBadge(ziSyncedAt?: string | null): FreshnessBadge {
  if (!ziSyncedAt) return { className: 'is-unsynced', label: 'Sin sync' };

  const syncedAt = new Date(ziSyncedAt);
  if (Number.isNaN(syncedAt.getTime())) return { className: 'is-unsynced', label: 'Sin sync' };

  const ageMs = Date.now() - syncedAt.getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  if (ageMs < sixHoursMs) {
    const totalMinutes = Math.max(1, Math.floor(ageMs / 60_000));
    const label =
      totalMinutes < 60
        ? `Hace ${totalMinutes} min`
        : `Hace ${Math.floor(totalMinutes / 60)} h`;
    return { className: 'is-fresh', label };
  }

  return { className: 'is-stale', label: '⚠ Desactualizado' };
}

function sortTarifas(tarifas: ZiCatalogTarifaItem[]): ZiCatalogTarifaItem[] {
  const order = (canal: string) => (canal === 'COLOMBIA' ? 0 : canal === 'UNICO' ? 1 : 2);
  return [...tarifas].sort((a, b) => order(a.comercialChannel) - order(b.comercialChannel));
}

function formatPrice(value: number | null): string {
  if (value === null) return '-';
  return `$${value.toLocaleString('es-CO')}`;
}

const INITIAL_FILTROS = {
  search: '',
  categoriaId: '',
  marca: '',
  soloConStock: false,
  page: 1,
  pageSize: 50,
};

type Filtros = typeof INITIAL_FILTROS;

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

  // Keep a ref to always access latest filtros inside debounce timeout
  const filtrosRef = useRef<Filtros>(INITIAL_FILTROS);
  filtrosRef.current = filtros;

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchList(params: Filtros) {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    listZiCatalogo(accessToken, params)
      .then((result) => setProductos(result))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Error cargando datos'),
      )
      .finally(() => setIsLoading(false));
  }

  // Initial load
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      listZiCatalogo(accessToken, { page: 1, pageSize: 50 }),
      getZiMarcas(accessToken),
      getZiCategorias(accessToken),
    ])
      .then(([result, marcasData, categoriasData]) => {
        if (cancelled) return;
        setProductos(result);
        setMarcas(marcasData);
        setCategorias(categoriasData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error cargando catalogo');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detail load
  useEffect(() => {
    if (detalleId === null) {
      setDetalle(null);
      return;
    }
    if (!accessToken) return;

    let cancelled = false;
    setDetalleLoading(true);

    getZiProductoDetalle(accessToken, detalleId)
      .then((d) => {
        if (!cancelled) setDetalle(d);
      })
      .catch(() => {
        if (!cancelled) setDetalle(null);
      })
      .finally(() => {
        if (!cancelled) setDetalleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detalleId, accessToken]);

  function handleSearchChange(value: string) {
    setFiltros((prev) => ({ ...prev, search: value }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const newFiltros = { ...filtrosRef.current, page: 1 };
      setFiltros(newFiltros);
      fetchList(newFiltros);
    }, 400);
  }

  function handleFilterChange(
    key: 'categoriaId' | 'marca' | 'soloConStock',
    value: string | boolean,
  ) {
    const newFiltros = { ...filtros, [key]: value, page: 1 };
    setFiltros(newFiltros);
    fetchList(newFiltros);
  }

  function handlePageChange(newPage: number) {
    const newFiltros = { ...filtros, page: newPage };
    setFiltros(newFiltros);
    fetchList(newFiltros);
  }

  function handleRowClick(productoId: number) {
    setDetalleId((prev) => (prev === productoId ? null : productoId));
  }

  function handleClearFiltros() {
    setFiltros(INITIAL_FILTROS);
    fetchList(INITIAL_FILTROS);
  }

  const totalPages = productos?.totalPages ?? 1;
  const currentPage = filtros.page;

  return (
    <section className="producto-page">
      <header className="producto-header">
        <h1>Catalogo ZI</h1>
        <p>Productos sincronizados desde ZI. Filtros, paginacion y detalle por variante.</p>
      </header>

      {error && <p className="producto-error">{error}</p>}

      {/* Filtros */}
      <article className="producto-card">
        <div className="catalog-products-filters-header">
          <h2>Filtros</h2>
          <button type="button" className="catalog-products-clear-btn" onClick={handleClearFiltros}>
            Limpiar filtros
          </button>
        </div>

        <div className="catalog-products-filters-grid">
          <label>
            Buscar
            <input
              type="text"
              value={filtros.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Referencia, nombre..."
              maxLength={255}
            />
          </label>

          <label>
            Categoria
            <select
              value={filtros.categoriaId}
              onChange={(e) => handleFilterChange('categoriaId', e.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((cat) => (
                <option key={cat.categoriaId} value={String(cat.categoriaId)}>
                  {cat.nombre} ({cat.total})
                </option>
              ))}
            </select>
          </label>

          <label>
            Marca
            <select
              value={filtros.marca}
              onChange={(e) => handleFilterChange('marca', e.target.value)}
            >
              <option value="">Todas</option>
              {marcas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-products-checkbox-label">
            <input
              type="checkbox"
              checked={filtros.soloConStock}
              onChange={(e) => handleFilterChange('soloConStock', e.target.checked)}
            />
            Solo con stock
          </label>
        </div>
      </article>

      {/* Tabla */}
      <article className="producto-card">
        <h2>
          Productos{' '}
          {productos && (
            <span className="catalog-products-count">
              ({productos.total.toLocaleString('es-CO')})
            </span>
          )}
        </h2>

        {isLoading ? (
          <p className="producto-loading">Cargando...</p>
        ) : (
          <div className="producto-table-wrap">
            <table className="producto-table catalog-products-main-table">
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
                          <td className="catalog-products-nombre">{producto.nombre}</td>
                          <td>{producto.categoriaNombre ?? '-'}</td>
                          <td>{formatPrice(producto.precioBaseMin)}</td>
                          <td>
                            {producto.stockTotal > 0 ? (
                              <span className="catalog-products-badge is-stock">Con stock</span>
                            ) : (
                              <span className="catalog-products-badge is-no-stock">Sin stock</span>
                            )}
                          </td>
                          <td>
                            {freshness.className !== 'is-fresh' ? (
                              <span
                                className={`catalog-products-sync-badge ${freshness.className}`}
                              >
                                {freshness.label}
                              </span>
                            ) : (
                              <span
                                className="catalog-products-dot-fresh"
                                title={freshness.label}
                              />
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="catalog-products-detail-row">
                            <td colSpan={6}>
                              {detalleLoading ? (
                                <p className="producto-loading">Cargando detalle...</p>
                              ) : detalle ? (
                                <div className="catalog-products-detail">
                                  {/* Variantes */}
                                  <div className="catalog-products-detail-section">
                                    <h4>Variantes ({detalle.variantes.length})</h4>
                                    <table className="producto-table catalog-products-sub-table">
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
                                        {detalle.variantes.map((v) => (
                                          <tr key={String(v.varianteId)}>
                                            <td>{v.sku}</td>
                                            <td>{v.nombreTalla ?? v.talla ?? '-'}</td>
                                            <td>{v.nombreColor ?? v.color ?? '-'}</td>
                                            <td>{v.ean}</td>
                                            <td>{v.stockDisponible}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Tarifas */}
                                  <div className="catalog-products-detail-section">
                                    <h4>Tarifas ({detalle.tarifas.length})</h4>
                                    <table className="producto-table catalog-products-sub-table">
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
                                        {sortTarifas(detalle.tarifas).map((t) => (
                                          <tr key={String(t.tarifaId)}>
                                            <td>{t.comercialChannel}</td>
                                            <td>{t.monedaCodigo}</td>
                                            <td>{formatPrice(t.precioBase)}</td>
                                            <td>
                                              {t.tieneOfertaActiva && t.precioOferta !== null ? (
                                                <strong className="catalog-products-oferta">
                                                  {formatPrice(t.precioOferta)}
                                                </strong>
                                              ) : (
                                                '-'
                                              )}
                                            </td>
                                            <td>{t.impuestoPct}%</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : null}
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

        {/* Paginacion */}
        {productos && productos.totalPages > 1 && (
          <div className="catalog-products-pagination">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
            >
              Anterior
            </button>
            <span>
              Pagina {currentPage} de {totalPages} ({productos.total.toLocaleString('es-CO')}{' '}
              productos)
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
