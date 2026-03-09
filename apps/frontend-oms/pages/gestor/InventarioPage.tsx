import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createInventario,
  getInventariosBootstrap,
  updateInventario,
  type InventarioListItem,
} from '../../src/configuracion-general/inventario.api';
import './InventarioPage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type BodegaOption = {
  bodegaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
};

type VarianteOption = {
  varianteId: number;
  empresaId: number;
  productoId: number;
  productoNombre?: string;
  productoSkuBase?: string;
  sku: string;
  nombre?: string;
  activo: boolean;
};

type FormState = {
  empresaId: string;
  bodegaId: string;
  varianteId: string;
  stockTotal: string;
  stockReservado: string;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  bodegaId: '',
  varianteId: '',
  stockTotal: '0',
  stockReservado: '0',
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

export function InventarioPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [inventarios, setInventarios] = useState<InventarioListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
  const [variantes, setVariantes] = useState<VarianteOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingInventarioId, setEditingInventarioId] = useState<number | null>(null);
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
      const bootstrap = await withRetry(() => getInventariosBootstrap(accessToken));
      setInventarios(bootstrap.inventarios);
      setEmpresas(
        [...bootstrap.empresas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.empresaId - b.empresaId;
        }),
      );
      setBodegas(
        [...bootstrap.bodegas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.bodegaId - b.bodegaId;
        }),
      );
      setVariantes(
        [...bootstrap.variantes].sort((a, b) => {
          if (a.empresaId !== b.empresaId) {
            return a.empresaId - b.empresaId;
          }
          return a.varianteId - b.varianteId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar inventario';
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

  const bodegasPorEmpresa = useMemo(() => {
    const selectedEmpresaId = Number(form.empresaId);
    if (!Number.isInteger(selectedEmpresaId) || selectedEmpresaId <= 0) {
      return [] as BodegaOption[];
    }
    return bodegas.filter((bodega) => bodega.empresaId === selectedEmpresaId);
  }, [bodegas, form.empresaId]);

  const variantesPorEmpresa = useMemo(() => {
    const selectedEmpresaId = Number(form.empresaId);
    if (!Number.isInteger(selectedEmpresaId) || selectedEmpresaId <= 0) {
      return [] as VarianteOption[];
    }
    return variantes.filter((variante) => variante.empresaId === selectedEmpresaId);
  }, [form.empresaId, variantes]);

  useEffect(() => {
    if (!form.empresaId) {
      return;
    }
    const bodegaValida = bodegasPorEmpresa.some(
      (bodega) => String(bodega.bodegaId) === form.bodegaId,
    );
    const varianteValida = variantesPorEmpresa.some(
      (variante) => String(variante.varianteId) === form.varianteId,
    );

    setForm((previous) => ({
      ...previous,
      bodegaId: bodegaValida ? previous.bodegaId : String(bodegasPorEmpresa[0]?.bodegaId ?? ''),
      varianteId: varianteValida
        ? previous.varianteId
        : String(variantesPorEmpresa[0]?.varianteId ?? ''),
    }));
  }, [bodegasPorEmpresa, form.bodegaId, form.empresaId, form.varianteId, variantesPorEmpresa]);

  const sortedInventarios = useMemo(
    () =>
      [...inventarios].sort((a, b) => {
        if (a.empresaId !== b.empresaId) {
          return a.empresaId - b.empresaId;
        }
        if (a.bodegaId !== b.bodegaId) {
          return a.bodegaId - b.bodegaId;
        }
        return a.inventarioId - b.inventarioId;
      }),
    [inventarios],
  );

  const empresaMap = useMemo(() => {
    const map = new Map<number, EmpresaOption>();
    empresas.forEach((empresa) => {
      map.set(empresa.empresaId, empresa);
    });
    return map;
  }, [empresas]);

  const bodegaMap = useMemo(() => {
    const map = new Map<number, BodegaOption>();
    bodegas.forEach((bodega) => {
      map.set(bodega.bodegaId, bodega);
    });
    return map;
  }, [bodegas]);

  const varianteMap = useMemo(() => {
    const map = new Map<number, VarianteOption>();
    variantes.forEach((variante) => {
      map.set(variante.varianteId, variante);
    });
    return map;
  }, [variantes]);

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
    const bodegaId = Number(form.bodegaId);
    const varianteId = Number(form.varianteId);
    const stockTotal = Number(form.stockTotal);
    const stockReservado = Number(form.stockReservado);

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!Number.isInteger(bodegaId) || bodegaId <= 0) {
      setError('Bodega es obligatoria');
      return;
    }
    if (!Number.isInteger(varianteId) || varianteId <= 0) {
      setError('Variante es obligatoria');
      return;
    }
    if (!Number.isInteger(stockTotal) || stockTotal < 0) {
      setError('stockTotal debe ser entero >= 0');
      return;
    }
    if (!Number.isInteger(stockReservado) || stockReservado < 0) {
      setError('stockReservado debe ser entero >= 0');
      return;
    }
    if (stockReservado > stockTotal) {
      setError('stockReservado no puede ser mayor que stockTotal');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingInventarioId) {
        await updateInventario(accessToken, editingInventarioId, {
          empresaId,
          bodegaId,
          varianteId,
          stockTotal,
          stockReservado,
        });
      } else {
        await createInventario(accessToken, {
          empresaId,
          bodegaId,
          varianteId,
          stockTotal,
          stockReservado,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
        bodegaId: previous.bodegaId,
        varianteId: previous.varianteId,
      }));
      setEditingInventarioId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar inventario';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(inventario: InventarioListItem) {
    setEditingInventarioId(inventario.inventarioId);
    setForm({
      empresaId: String(inventario.empresaId),
      bodegaId: String(inventario.bodegaId),
      varianteId: String(inventario.varianteId),
      stockTotal: String(inventario.stockTotal),
      stockReservado: String(inventario.stockReservado),
    });
    setError('');
  }

  function cancelEdit() {
    setEditingInventarioId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      empresaId: previous.empresaId || String(empresas[0]?.empresaId ?? ''),
      bodegaId: previous.bodegaId || String(bodegasPorEmpresa[0]?.bodegaId ?? ''),
      varianteId: previous.varianteId || String(variantesPorEmpresa[0]?.varianteId ?? ''),
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
    <section className="inventario-page">
      <header className="inventario-header">
        <h1>Inventario</h1>
        <p>Stock por bodega y variante con control de reservado/disponible.</p>
      </header>

      {error && <p className="inventario-error">{error}</p>}

      {canManage && (
        <article className="inventario-card">
          <h2>{editingInventarioId ? 'Editar inventario' : 'Crear inventario'}</h2>
          <form className="inventario-form" onSubmit={handleSubmit}>
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
              Bodega
              <select
                value={form.bodegaId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, bodegaId: event.target.value }))
                }
                required
              >
                {bodegasPorEmpresa.map((bodega) => (
                  <option key={bodega.bodegaId} value={String(bodega.bodegaId)}>
                    {bodega.nombre} ({bodega.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Variante
              <select
                value={form.varianteId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, varianteId: event.target.value }))
                }
                required
              >
                {variantesPorEmpresa.map((variante) => (
                  <option key={variante.varianteId} value={String(variante.varianteId)}>
                    {variante.sku}
                    {variante.nombre ? ` - ${variante.nombre}` : ''}
                    {variante.productoNombre
                      ? ` | Producto: ${variante.productoNombre}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Stock total
              <input
                type="number"
                min={0}
                step={1}
                value={form.stockTotal}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, stockTotal: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Stock reservado
              <input
                type="number"
                min={0}
                step={1}
                value={form.stockReservado}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, stockReservado: event.target.value }))
                }
                required
              />
            </label>

            <div className="inventario-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingInventarioId ? 'Actualizar' : 'Crear'}
              </button>

              {editingInventarioId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="inventario-card">
        <h2>Listado de inventario</h2>
        {isLoading ? (
          <p className="inventario-loading">Cargando inventario...</p>
        ) : (
          <div className="inventario-table-wrap">
            <table className="inventario-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Bodega</th>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th>Stock total</th>
                  <th>Stock reservado</th>
                  <th>Stock disponible</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedInventarios.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 10 : 9} className="inventario-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedInventarios.map((inventario) => {
                    const empresa = empresaMap.get(inventario.empresaId);
                    const bodega = bodegaMap.get(inventario.bodegaId);
                    const variante = varianteMap.get(inventario.varianteId);
                    return (
                      <tr key={inventario.inventarioId}>
                        <td>{inventario.inventarioId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${inventario.empresaId}`}
                        </td>
                        <td>
                          {bodega
                            ? `${bodega.nombre} (${bodega.codigo})`
                            : `BodegaId ${inventario.bodegaId}`}
                        </td>
                        <td>
                          {variante
                            ? `${variante.productoNombre ?? `ProductoId ${variante.productoId}`}${
                                variante.productoSkuBase
                                  ? ` (${variante.productoSkuBase})`
                                  : ''
                              }`
                            : '-'}
                        </td>
                        <td>
                          {variante
                            ? `${variante.sku}${variante.nombre ? ` - ${variante.nombre}` : ''}`
                            : `VarianteId ${inventario.varianteId}`}
                        </td>
                        <td>{inventario.stockTotal}</td>
                        <td>{inventario.stockReservado}</td>
                        <td>{inventario.stockDisponible}</td>
                        <td>{formatDate(inventario.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(inventario)}>
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
