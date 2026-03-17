import { useMemo, useState } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  fetchZiPrices,
  fetchZiProducts,
  fetchZiStock,
} from '../../src/configuracion-general/catalogo-zi.api';
import { useProductosBootstrap } from '../../src/configuracion-general/useProductosBootstrap';
import '../gestor/ProductoPage.css';
import './ProductsPage.css';

type CatalogFilters = {
  empresaId: string;
  categoriaId: string;
  status: 'all' | 'active' | 'inactive';
  search: string;
};

const INITIAL_FILTERS: CatalogFilters = {
  empresaId: '0',
  categoriaId: '0',
  status: 'all',
  search: '',
};

type ZiSearchResult = {
  referencia: string;
  nombre: string;
  marca: string;
  canalesPrecio: Array<{ canal: string; precioBase: number }>;
  stockPorTienda: Array<{ tiendaId: string; stockTotal: number }>;
};

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
  const [result, setResult] = useState<ZiSearchResult | null>(null);
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

  function formatPrecio(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value);
  }

  async function handleZiSearch(): Promise<void> {
    const code = productCode.trim();
    if (!code) {
      setError('Ingresa un codigo de producto');
      setResult(null);
      return;
    }
    if (!accessToken) {
      setError('Sesion no disponible');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [products, prices, stock] = await Promise.all([
        fetchZiProducts(accessToken, code),
        fetchZiPrices(accessToken, code),
        fetchZiStock(accessToken, code),
      ]);

      const producto = products[0];
      if (!producto) {
        setResult(null);
        setError(`No se encontro informacion del producto ${code} en ZI`);
        return;
      }

      const canalesPrecio = prices
        .flatMap((item) => item.tarifas)
        .map((tarifa) => ({
          canal: tarifa.comercialChannel,
          precioBase: Number.parseFloat(tarifa.precio_base),
        }));

      const stockAcumulado = new Map<string, number>();
      for (const item of stock) {
        for (const tienda of item.stock) {
          const totalTienda = tienda.tallas
            .flat()
            .reduce((acc, talla) => acc + Number.parseInt(talla.unidades, 10), 0);
          stockAcumulado.set(
            tienda.id_tienda,
            (stockAcumulado.get(tienda.id_tienda) ?? 0) + totalTienda,
          );
        }
      }

      const stockPorTienda = [...stockAcumulado.entries()]
        .map(([tiendaId, stockTotal]) => ({ tiendaId, stockTotal }))
        .sort((a, b) => a.tiendaId.localeCompare(b.tiendaId));

      setResult({
        referencia: producto.referencia,
        nombre: producto.nombre.es,
        marca: producto.marca,
        canalesPrecio,
        stockPorTienda,
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo consultar catalogo ZI';
      setError(message);
      setResult(null);
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
        <h2>Consulta ZI por codigo</h2>
        <div className="catalog-products-zi-search">
          <input
            type="text"
            value={productCode}
            onChange={(event) => setProductCode(event.target.value)}
            placeholder="Codigo de producto ZI"
            maxLength={120}
          />
          <button type="button" onClick={() => void handleZiSearch()} disabled={isLoading}>
            Buscar
          </button>
        </div>

        {isLoading && <p className="producto-loading">Consultando ZI...</p>}
        {error && <p className="producto-error">{error}</p>}

        {result && (
          <div className="producto-table-wrap">
            <table className="producto-table">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Canales de precio</th>
                  <th>Stock total por tienda</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{result.referencia}</td>
                  <td>{result.nombre}</td>
                  <td>{result.marca || '-'}</td>
                  <td>
                    {result.canalesPrecio.length === 0 ? (
                      <span>Sin precios</span>
                    ) : (
                      <div className="catalog-products-list-cell">
                        {result.canalesPrecio.map((canal) => (
                          <span key={`${canal.canal}-${canal.precioBase}`}>
                            {canal.canal}: {formatPrecio(canal.precioBase)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {result.stockPorTienda.length === 0 ? (
                      <span>Sin stock</span>
                    ) : (
                      <div className="catalog-products-list-cell">
                        {result.stockPorTienda.map((item) => (
                          <span key={item.tiendaId}>
                            Tienda {item.tiendaId}: {item.stockTotal}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
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
                </tr>
              </thead>
              <tbody>
                {filteredProductos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="producto-empty-cell">
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
