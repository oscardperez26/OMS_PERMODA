import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createProductoVariante,
  getProductoVariantesBootstrap,
  updateProductoVariante,
  type ProductoVarianteListItem,
} from '../../src/configuracion-general/producto-variante.api';
import './ProductoVariantePage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type ProductoOption = {
  productoId: number;
  empresaId: number;
  skuBase?: string;
  nombre: string;
  activo: boolean;
};

type FormState = {
  empresaId: string;
  productoId: string;
  sku: string;
  ean: string;
  nombre: string;
  pesoKg: string;
  largoCm: string;
  anchoCm: string;
  altoCm: string;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  productoId: '',
  sku: '',
  ean: '',
  nombre: '',
  pesoKg: '',
  largoCm: '',
  anchoCm: '',
  altoCm: '',
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

export function ProductoVariantePage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [variantes, setVariantes] = useState<ProductoVarianteListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingVarianteId, setEditingVarianteId] = useState<number | null>(null);
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
      const bootstrap = await withRetry(() => getProductoVariantesBootstrap(accessToken));
      setVariantes(bootstrap.variantes);
      setEmpresas(
        [...bootstrap.empresas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.empresaId - b.empresaId;
        }),
      );
      setProductos(
        [...bootstrap.productos].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.productoId - b.productoId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar variantes';
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

  const productosPorEmpresa = useMemo(() => {
    const selectedEmpresaId = Number(form.empresaId);
    if (!Number.isInteger(selectedEmpresaId) || selectedEmpresaId <= 0) {
      return [] as ProductoOption[];
    }
    return productos.filter((producto) => producto.empresaId === selectedEmpresaId);
  }, [form.empresaId, productos]);

  useEffect(() => {
    if (!form.empresaId) {
      return;
    }

    const productoValido = productosPorEmpresa.some(
      (producto) => String(producto.productoId) === form.productoId,
    );
    if (!productoValido) {
      setForm((previous) => ({
        ...previous,
        productoId: String(productosPorEmpresa[0]?.productoId ?? ''),
      }));
    }
  }, [form.empresaId, form.productoId, productosPorEmpresa]);

  const sortedVariantes = useMemo(
    () =>
      [...variantes].sort((a, b) => {
        if (a.empresaId !== b.empresaId) {
          return a.empresaId - b.empresaId;
        }
        return a.varianteId - b.varianteId;
      }),
    [variantes],
  );

  const empresaMap = useMemo(() => {
    const map = new Map<number, EmpresaOption>();
    empresas.forEach((empresa) => {
      map.set(empresa.empresaId, empresa);
    });
    return map;
  }, [empresas]);

  const productoMap = useMemo(() => {
    const map = new Map<number, ProductoOption>();
    productos.forEach((producto) => {
      map.set(producto.productoId, producto);
    });
    return map;
  }, [productos]);

  function parseOptionalNumber(value: string): number | undefined {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

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
    const productoId = Number(form.productoId);
    const sku = form.sku.trim().toUpperCase();
    const ean = form.ean.trim();
    const nombre = form.nombre.trim();
    const pesoKg = parseOptionalNumber(form.pesoKg);
    const largoCm = parseOptionalNumber(form.largoCm);
    const anchoCm = parseOptionalNumber(form.anchoCm);
    const altoCm = parseOptionalNumber(form.altoCm);

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!Number.isInteger(productoId) || productoId <= 0) {
      setError('Producto es obligatorio');
      return;
    }
    if (!sku) {
      setError('SKU es obligatorio');
      return;
    }

    const optionalNumbers = [pesoKg, largoCm, anchoCm, altoCm];
    const invalidNumber = optionalNumbers.some(
      (value) => value !== undefined && (!Number.isFinite(value) || value < 0),
    );
    if (invalidNumber) {
      setError('Peso y dimensiones deben ser numericos >= 0');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingVarianteId) {
        await updateProductoVariante(accessToken, editingVarianteId, {
          empresaId,
          productoId,
          sku,
          ean: ean || null,
          nombre: nombre || null,
          pesoKg: pesoKg ?? null,
          largoCm: largoCm ?? null,
          anchoCm: anchoCm ?? null,
          altoCm: altoCm ?? null,
          activo: form.activo,
        });
      } else {
        await createProductoVariante(accessToken, {
          empresaId,
          productoId,
          sku,
          ean: ean || undefined,
          nombre: nombre || undefined,
          pesoKg,
          largoCm,
          anchoCm,
          altoCm,
          activo: form.activo,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
        productoId: previous.productoId,
      }));
      setEditingVarianteId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar variante';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(variante: ProductoVarianteListItem) {
    setEditingVarianteId(variante.varianteId);
    setForm({
      empresaId: String(variante.empresaId),
      productoId: String(variante.productoId),
      sku: variante.sku,
      ean: variante.ean ?? '',
      nombre: variante.nombre ?? '',
      pesoKg: variante.pesoKg === undefined ? '' : String(variante.pesoKg),
      largoCm: variante.largoCm === undefined ? '' : String(variante.largoCm),
      anchoCm: variante.anchoCm === undefined ? '' : String(variante.anchoCm),
      altoCm: variante.altoCm === undefined ? '' : String(variante.altoCm),
      activo: variante.activo,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingVarianteId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      empresaId: previous.empresaId || String(empresas[0]?.empresaId ?? ''),
      productoId: previous.productoId || String(productosPorEmpresa[0]?.productoId ?? ''),
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
    <section className="producto-variante-page">
      <header className="producto-variante-header">
        <h1>Producto Variante</h1>
        <p>Gestion de variantes con SKU/EAN y dimensiones para operacion logistica.</p>
      </header>

      {error && <p className="producto-variante-error">{error}</p>}

      {canManage && (
        <article className="producto-variante-card">
          <h2>{editingVarianteId ? 'Editar variante' : 'Crear variante'}</h2>
          <form className="producto-variante-form" onSubmit={handleSubmit}>
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
              Producto
              <select
                value={form.productoId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, productoId: event.target.value }))
                }
                required
              >
                {productosPorEmpresa.map((producto) => (
                  <option key={producto.productoId} value={String(producto.productoId)}>
                    {producto.nombre} {producto.skuBase ? `(${producto.skuBase})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              SKU
              <input
                type="text"
                value={form.sku}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, sku: event.target.value }))
                }
                maxLength={120}
                required
              />
            </label>

            <label>
              EAN
              <input
                type="text"
                value={form.ean}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, ean: event.target.value }))
                }
                maxLength={120}
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
              />
            </label>

            <label>
              Peso (kg)
              <input
                type="number"
                step="0.0001"
                min={0}
                value={form.pesoKg}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, pesoKg: event.target.value }))
                }
              />
            </label>

            <label>
              Largo (cm)
              <input
                type="number"
                step="0.0001"
                min={0}
                value={form.largoCm}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, largoCm: event.target.value }))
                }
              />
            </label>

            <label>
              Ancho (cm)
              <input
                type="number"
                step="0.0001"
                min={0}
                value={form.anchoCm}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, anchoCm: event.target.value }))
                }
              />
            </label>

            <label>
              Alto (cm)
              <input
                type="number"
                step="0.0001"
                min={0}
                value={form.altoCm}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, altoCm: event.target.value }))
                }
              />
            </label>

            <label className="producto-variante-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="producto-variante-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingVarianteId ? 'Actualizar' : 'Crear'}
              </button>

              {editingVarianteId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="producto-variante-card">
        <h2>Listado de variantes</h2>
        {isLoading ? (
          <p className="producto-variante-loading">Cargando variantes...</p>
        ) : (
          <div className="producto-variante-table-wrap">
            <table className="producto-variante-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>EAN</th>
                  <th>Nombre</th>
                  <th>Peso</th>
                  <th>Dimensiones (L x A x H)</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedVariantes.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 12 : 11} className="producto-variante-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedVariantes.map((variante) => {
                    const empresa = empresaMap.get(variante.empresaId);
                    const producto = productoMap.get(variante.productoId);
                    return (
                      <tr key={variante.varianteId}>
                        <td>{variante.varianteId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${variante.empresaId}`}
                        </td>
                        <td>
                          {producto
                            ? `${producto.nombre}${producto.skuBase ? ` (${producto.skuBase})` : ''}`
                            : `ProductoId ${variante.productoId}`}
                        </td>
                        <td>{variante.sku}</td>
                        <td>{variante.ean ?? '-'}</td>
                        <td>{variante.nombre ?? '-'}</td>
                        <td>{variante.pesoKg ?? '-'}</td>
                        <td>
                          {variante.largoCm ?? '-'} x {variante.anchoCm ?? '-'} x{' '}
                          {variante.altoCm ?? '-'}
                        </td>
                        <td>{variante.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(variante.createdAt)}</td>
                        <td>{formatDate(variante.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(variante)}>
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
