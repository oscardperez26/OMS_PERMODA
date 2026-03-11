import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createPasarelaPago,
  getPasarelasPagoBootstrap,
  updatePasarelaPago,
  type PasarelaPagoListItem,
} from '../../src/configuracion-general/pasarela-pago.api';
import './PasarelaPagoPage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type FormState = {
  empresaId: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  configJson: string;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  codigo: '',
  nombre: '',
  activo: true,
  configJson: '',
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

export function PasarelaPagoPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [pasarelasPago, setPasarelasPago] = useState<PasarelaPagoListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingPasarelaPagoId, setEditingPasarelaPagoId] = useState<number | null>(null);
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
      const bootstrap = await withRetry(() => getPasarelasPagoBootstrap(accessToken));
      setPasarelasPago(bootstrap.pasarelasPago);
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
          : 'No se pudo cargar pasarelas de pago';
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

  const sortedPasarelas = useMemo(
    () =>
      [...pasarelasPago].sort((a, b) => {
        const byNombre = a.nombre.localeCompare(b.nombre);
        return byNombre !== 0 ? byNombre : a.pasarelaPagoId - b.pasarelaPagoId;
      }),
    [pasarelasPago],
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
    const configJson = form.configJson.trim();

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!codigo || !nombre) {
      setError('Codigo y nombre son obligatorios');
      return;
    }

    if (configJson) {
      try {
        JSON.parse(configJson);
      } catch {
        setError('Config JSON debe contener un JSON valido');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingPasarelaPagoId) {
        await updatePasarelaPago(accessToken, editingPasarelaPagoId, {
          empresaId,
          codigo,
          nombre,
          activo: form.activo,
          configJson: configJson || null,
        });
      } else {
        await createPasarelaPago(accessToken, {
          empresaId,
          codigo,
          nombre,
          activo: form.activo,
          configJson: configJson || undefined,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
      }));
      setEditingPasarelaPagoId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar pasarela de pago';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(pasarelaPago: PasarelaPagoListItem) {
    setEditingPasarelaPagoId(pasarelaPago.pasarelaPagoId);
    setForm({
      empresaId: String(pasarelaPago.empresaId),
      codigo: pasarelaPago.codigo,
      nombre: pasarelaPago.nombre,
      activo: pasarelaPago.activo,
      configJson: pasarelaPago.configJson ?? '',
    });
    setError('');
  }

  function cancelEdit() {
    setEditingPasarelaPagoId(null);
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
    <section className="pasarela-pago-page">
      <header className="pasarela-pago-header">
        <h1>Pasarelas de Pago</h1>
        <p>Configuracion de pasarelas de pago por empresa.</p>
      </header>

      {error && <p className="pasarela-pago-error">{error}</p>}

      {canManage && (
        <article className="pasarela-pago-card">
          <h2>{editingPasarelaPagoId ? 'Editar pasarela' : 'Crear pasarela'}</h2>
          <form className="pasarela-pago-form" onSubmit={handleSubmit}>
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

            <label className="pasarela-pago-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <label className="pasarela-pago-config">
              Config JSON
              <textarea
                value={form.configJson}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, configJson: event.target.value }))
                }
                rows={3}
              />
            </label>

            <div className="pasarela-pago-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingPasarelaPagoId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingPasarelaPagoId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="pasarela-pago-card">
        <h2>Listado de pasarelas</h2>
        {isLoading ? (
          <p className="pasarela-pago-loading">Cargando pasarelas...</p>
        ) : (
          <div className="pasarela-pago-table-wrap">
            <table className="pasarela-pago-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Activo</th>
                  <th>Config</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedPasarelas.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="pasarela-pago-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedPasarelas.map((pasarelaPago) => {
                    const empresa = empresaMap.get(pasarelaPago.empresaId);
                    return (
                      <tr key={pasarelaPago.pasarelaPagoId}>
                        <td>{pasarelaPago.pasarelaPagoId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${pasarelaPago.empresaId}`}
                        </td>
                        <td>{pasarelaPago.codigo}</td>
                        <td>{pasarelaPago.nombre}</td>
                        <td>{pasarelaPago.activo ? 'Si' : 'No'}</td>
                        <td>{pasarelaPago.configJson ? 'Configurada' : '-'}</td>
                        <td>{formatDate(pasarelaPago.createdAt)}</td>
                        <td>{formatDate(pasarelaPago.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(pasarelaPago)}>
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
