import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import {
  createZonaTransporte,
  getZonasTransporteBootstrap,
  updateZonaTransporte,
  type ZonaTransporteListItem,
} from '../../src/configuracion-general/zona-transporte.api';
import './ZonaTransportePage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type PaisOption = {
  paisId: number;
  codigoISO2: string;
  nombre: string;
};

type FormState = {
  empresaId: string;
  codigo: string;
  nombre: string;
  paisId: string;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  codigo: '',
  nombre: '',
  paisId: '',
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

export function ZonaTransportePage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [zonasTransporte, setZonasTransporte] = useState<ZonaTransporteListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [paises, setPaises] = useState<PaisOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingZonaTransporteId, setEditingZonaTransporteId] = useState<number | null>(
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
      const bootstrap = await withRetry(() => getZonasTransporteBootstrap(accessToken));
      setZonasTransporte(bootstrap.zonasTransporte);
      setEmpresas(
        [...bootstrap.empresas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.empresaId - b.empresaId;
        }),
      );
      setPaises(
        [...bootstrap.paises].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.paisId - b.paisId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar zonas de transporte';
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

  const paisMap = useMemo(() => {
    const map = new Map<number, PaisOption>();
    paises.forEach((pais) => {
      map.set(pais.paisId, pais);
    });
    return map;
  }, [paises]);

  const sortedZonas = useMemo(
    () =>
      [...zonasTransporte].sort((a, b) => {
        const byNombre = a.nombre.localeCompare(b.nombre);
        return byNombre !== 0 ? byNombre : a.zonaTransporteId - b.zonaTransporteId;
      }),
    [zonasTransporte],
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
    const paisIdRaw = form.paisId.trim();
    const paisId = paisIdRaw ? Number(paisIdRaw) : undefined;

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!codigo || !nombre) {
      setError('Codigo y nombre son obligatorios');
      return;
    }
    if (paisId !== undefined && (!Number.isInteger(paisId) || paisId <= 0)) {
      setError('Pais debe ser un entero mayor a 0');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingZonaTransporteId) {
        await updateZonaTransporte(accessToken, editingZonaTransporteId, {
          empresaId,
          codigo,
          nombre,
          paisId: paisId ?? null,
          activo: form.activo,
        });
      } else {
        await createZonaTransporte(accessToken, {
          empresaId,
          codigo,
          nombre,
          paisId,
          activo: form.activo,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
      }));
      setEditingZonaTransporteId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar zona de transporte';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(zonaTransporte: ZonaTransporteListItem) {
    setEditingZonaTransporteId(zonaTransporte.zonaTransporteId);
    setForm({
      empresaId: String(zonaTransporte.empresaId),
      codigo: zonaTransporte.codigo,
      nombre: zonaTransporte.nombre,
      paisId: zonaTransporte.paisId ? String(zonaTransporte.paisId) : '',
      activo: zonaTransporte.activo,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingZonaTransporteId(null);
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
    <section className="zona-transporte-page">
      <header className="zona-transporte-header">
        <h1>Zonas de Transporte</h1>
        <p>Configuracion de zonas logisticas por empresa y pais.</p>
      </header>

      {error && <p className="zona-transporte-error">{error}</p>}

      {canManage && (
        <article className="zona-transporte-card">
          <h2>{editingZonaTransporteId ? 'Editar zona' : 'Crear zona'}</h2>
          <form className="zona-transporte-form" onSubmit={handleSubmit}>
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
              Pais
              <select
                value={form.paisId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, paisId: event.target.value }))
                }
              >
                <option value="">Sin pais</option>
                {paises.map((pais) => (
                  <option key={pais.paisId} value={String(pais.paisId)}>
                    {pais.nombre} ({pais.codigoISO2})
                  </option>
                ))}
              </select>
            </label>

            <label className="zona-transporte-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="zona-transporte-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingZonaTransporteId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingZonaTransporteId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="zona-transporte-card">
        <h2>Listado de zonas</h2>
        {isLoading ? (
          <p className="zona-transporte-loading">Cargando zonas...</p>
        ) : (
          <div className="zona-transporte-table-wrap">
            <table className="zona-transporte-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Pais</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedZonas.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="zona-transporte-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedZonas.map((zonaTransporte) => {
                    const empresa = empresaMap.get(zonaTransporte.empresaId);
                    const pais =
                      zonaTransporte.paisId === undefined
                        ? undefined
                        : paisMap.get(zonaTransporte.paisId);
                    return (
                      <tr key={zonaTransporte.zonaTransporteId}>
                        <td>{zonaTransporte.zonaTransporteId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${zonaTransporte.empresaId}`}
                        </td>
                        <td>{zonaTransporte.codigo}</td>
                        <td>{zonaTransporte.nombre}</td>
                        <td>
                          {zonaTransporte.paisId === undefined
                            ? '-'
                            : pais
                              ? `${pais.nombre} (${pais.codigoISO2})`
                              : `PaisId ${zonaTransporte.paisId}`}
                        </td>
                        <td>{zonaTransporte.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(zonaTransporte.createdAt)}</td>
                        <td>{formatDate(zonaTransporte.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(zonaTransporte)}>
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
