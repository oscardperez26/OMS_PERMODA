import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createProducto,
  getProductosBootstrap,
  updateProducto,
  type ProductoListItem,
} from '../../src/configuracion-general/producto.api';
import './ProductoPage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type FormState = {
  empresaId: string;
  skuBase: string;
  nombre: string;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  skuBase: '',
  nombre: '',
  activo: true,
};

async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
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

export function ProductoPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [productos, setProductos] = useState<ProductoListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingProductoId, setEditingProductoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const bootstrap = await withRetry(() => getProductosBootstrap(accessToken));
      setProductos(bootstrap.productos);
      setEmpresas(
        [...bootstrap.empresas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.empresaId - b.empresaId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar productos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (form.empresaId || empresas.length === 0) {
      return;
    }
    setForm((previous) => ({ ...previous, empresaId: String(empresas[0].empresaId) }));
  }, [empresas, form.empresaId]);

  const sortedProductos = useMemo(
    () =>
      [...productos].sort((a, b) => {
        if (a.empresaId !== b.empresaId) {
          return a.empresaId - b.empresaId;
        }
        return a.productoId - b.productoId;
      }),
    [productos],
  );

  const empresaMap = useMemo(() => {
    const map = new Map<number, EmpresaOption>();
    empresas.forEach((empresa) => {
      map.set(empresa.empresaId, empresa);
    });
    return map;
  }, [empresas]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }
    if (!canManage) {
      setError('No tienes permisos para gestionar catalogos');
      return;
    }

    const empresaId = Number(form.empresaId);
    const skuBase = form.skuBase.trim().toUpperCase();
    const nombre = form.nombre.trim();

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!nombre) {
      setError('Nombre es obligatorio');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingProductoId) {
        await updateProducto(accessToken, editingProductoId, {
          empresaId,
          skuBase,
          nombre,
          activo: form.activo,
        });
      } else {
        await createProducto(accessToken, {
          empresaId,
          skuBase: skuBase || undefined,
          nombre,
          activo: form.activo,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
      }));
      setEditingProductoId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar producto';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(producto: ProductoListItem) {
    setEditingProductoId(producto.productoId);
    setForm({
      empresaId: String(producto.empresaId),
      skuBase: producto.skuBase ?? '',
      nombre: producto.nombre,
      activo: producto.activo,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingProductoId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      empresaId: previous.empresaId || String(empresas[0]?.empresaId ?? ''),
    }));
    setError('');
  }

  function formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-CO');
  }

  return (
    <section className="producto-page">
      <header className="producto-header">
        <h1>Productos</h1>
        <p>Catalogo base para construir variantes e inventario operativo.</p>
      </header>

      {error && <p className="producto-error">{error}</p>}

      {canManage && (
        <article className="producto-card">
          <h2>{editingProductoId ? 'Editar producto' : 'Crear producto'}</h2>
          <form className="producto-form" onSubmit={handleSubmit}>
            <label>
              Empresa
              <select
                value={form.empresaId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, empresaId: event.target.value }))
                }
                required
              >
                {empresas.map((empresa) => (
                  <option key={empresa.empresaId} value={String(empresa.empresaId)}>
                    {empresa.nombre} ({empresa.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label>
              SKU base
              <input
                type="text"
                value={form.skuBase}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, skuBase: event.target.value }))
                }
                maxLength={120}
                placeholder="Opcional"
              />
            </label>

            <label>
              Nombre
              <input
                type="text"
                value={form.nombre}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, nombre: event.target.value }))
                }
                maxLength={255}
                required
              />
            </label>

            <label className="producto-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="producto-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingProductoId ? 'Actualizar' : 'Crear'}
              </button>

              {editingProductoId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="producto-card">
        <h2>Listado de productos</h2>
        {isLoading ? (
          <p className="producto-loading">Cargando productos...</p>
        ) : (
          <div className="producto-table-wrap">
            <table className="producto-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>SKU base</th>
                  <th>Nombre</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedProductos.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="producto-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedProductos.map((producto) => {
                    const empresa = empresaMap.get(producto.empresaId);
                    return (
                      <tr key={producto.productoId}>
                        <td>{producto.productoId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${producto.empresaId}`}
                        </td>
                        <td>{producto.skuBase ?? '-'}</td>
                        <td>{producto.nombre}</td>
                        <td>{producto.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(producto.createdAt)}</td>
                        <td>{formatDate(producto.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(producto)}>
                              Editar
                            </button>
                          </td>
                        )}
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
