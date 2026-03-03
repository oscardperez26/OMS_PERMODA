import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import {
  createTransportadora,
  getTransportadorasBootstrap,
  updateTransportadora,
  type TransportadoraListItem,
} from '../../src/configuracion-general/transportadora.api';
import './TransportadoraPage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type FormState = {
  empresaId: string;
  codigo: string;
  nombre: string;
  trackingUrlTemplate: string;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  codigo: '',
  nombre: '',
  trackingUrlTemplate: '',
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

export function TransportadoraPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [transportadoras, setTransportadoras] = useState<TransportadoraListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingTransportadoraId, setEditingTransportadoraId] = useState<number | null>(
    null,
  );
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
      const bootstrap = await withRetry(() => getTransportadorasBootstrap(accessToken));
      setTransportadoras(bootstrap.transportadoras);
      setEmpresas(
        [...bootstrap.empresas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.empresaId - b.empresaId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar transportadoras';
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

  const empresaMap = useMemo(() => {
    const map = new Map<number, EmpresaOption>();
    empresas.forEach((empresa) => {
      map.set(empresa.empresaId, empresa);
    });
    return map;
  }, [empresas]);

  const sortedTransportadoras = useMemo(
    () =>
      [...transportadoras].sort((a, b) => {
        const byNombre = a.nombre.localeCompare(b.nombre);
        return byNombre !== 0 ? byNombre : a.transportadoraId - b.transportadoraId;
      }),
    [transportadoras],
  );

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
    const codigo = form.codigo.trim().toUpperCase();
    const nombre = form.nombre.trim();
    const trackingUrlTemplate = form.trackingUrlTemplate.trim();

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!codigo || !nombre) {
      setError('Codigo y nombre son obligatorios');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingTransportadoraId) {
        await updateTransportadora(accessToken, editingTransportadoraId, {
          empresaId,
          codigo,
          nombre,
          trackingUrlTemplate: trackingUrlTemplate || null,
          activo: form.activo,
        });
      } else {
        await createTransportadora(accessToken, {
          empresaId,
          codigo,
          nombre,
          trackingUrlTemplate: trackingUrlTemplate || undefined,
          activo: form.activo,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
      }));
      setEditingTransportadoraId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar transportadora';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(transportadora: TransportadoraListItem) {
    setEditingTransportadoraId(transportadora.transportadoraId);
    setForm({
      empresaId: String(transportadora.empresaId),
      codigo: transportadora.codigo,
      nombre: transportadora.nombre,
      trackingUrlTemplate: transportadora.trackingUrlTemplate ?? '',
      activo: transportadora.activo,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingTransportadoraId(null);
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
    <section className="transportadora-page">
      <header className="transportadora-header">
        <h1>Transportadoras</h1>
        <p>Catalogo de transportadoras por empresa para configuracion logistica.</p>
      </header>

      {error && <p className="transportadora-error">{error}</p>}

      {canManage && (
        <article className="transportadora-card">
          <h2>{editingTransportadoraId ? 'Editar transportadora' : 'Crear transportadora'}</h2>
          <form className="transportadora-form" onSubmit={handleSubmit}>
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
              Codigo
              <input
                type="text"
                value={form.codigo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, codigo: event.target.value }))
                }
                maxLength={60}
                required
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
                maxLength={180}
                required
              />
            </label>

            <label>
              Tracking URL Template
              <input
                type="text"
                value={form.trackingUrlTemplate}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    trackingUrlTemplate: event.target.value,
                  }))
                }
                maxLength={255}
              />
            </label>

            <label className="transportadora-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="transportadora-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingTransportadoraId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingTransportadoraId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="transportadora-card">
        <h2>Listado de transportadoras</h2>
        {isLoading ? (
          <p className="transportadora-loading">Cargando transportadoras...</p>
        ) : (
          <div className="transportadora-table-wrap">
            <table className="transportadora-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Tracking URL</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedTransportadoras.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="transportadora-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedTransportadoras.map((transportadora) => {
                    const empresa = empresaMap.get(transportadora.empresaId);
                    return (
                      <tr key={transportadora.transportadoraId}>
                        <td>{transportadora.transportadoraId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${transportadora.empresaId}`}
                        </td>
                        <td>{transportadora.codigo}</td>
                        <td>{transportadora.nombre}</td>
                        <td>{transportadora.trackingUrlTemplate ?? '-'}</td>
                        <td>{transportadora.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(transportadora.createdAt)}</td>
                        <td>{formatDate(transportadora.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(transportadora)}>
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
