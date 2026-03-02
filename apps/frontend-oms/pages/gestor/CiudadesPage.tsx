import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import {
  createCiudad,
  getCiudadesBootstrap,
  updateCiudad,
  type CiudadListItem,
} from '../../src/configuracion-general/ciudad.api';
import type { PaisListItem } from '../../src/configuracion-general/pais.api';
import './CiudadesPage.css';

type FormState = {
  paisId: string;
  nombre: string;
  departamento: string;
  codigo: string;
};

const INITIAL_FORM: FormState = {
  paisId: '',
  nombre: '',
  departamento: '',
  codigo: '',
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

export function CiudadesPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [ciudades, setCiudades] = useState<CiudadListItem[]>([]);
  const [paises, setPaises] = useState<PaisListItem[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingCiudadId, setEditingCiudadId] = useState<number | null>(null);
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
      const bootstrap = await withRetry(() => getCiudadesBootstrap(accessToken));

      setCiudades(bootstrap.ciudades);
      setPaises(
        [...bootstrap.paises].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.paisId - b.paisId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar ciudades';
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
    if (form.paisId || paises.length === 0) {
      return;
    }

    setForm((previous) => ({ ...previous, paisId: String(paises[0].paisId) }));
  }, [form.paisId, paises]);

  const paisMap = useMemo(() => {
    const map = new Map<number, PaisListItem>();
    paises.forEach((pais) => {
      map.set(pais.paisId, pais);
    });
    return map;
  }, [paises]);

  const sortedCiudades = useMemo(
    () =>
      [...ciudades].sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.ciudadId - b.ciudadId;
      }),
    [ciudades],
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

    const parsedPaisId = Number(form.paisId);
    if (!Number.isInteger(parsedPaisId) || parsedPaisId <= 0) {
      setError('PaisId es obligatorio');
      return;
    }

    const payload = {
      paisId: parsedPaisId,
      nombre: form.nombre.trim(),
      departamento: form.departamento.trim() || undefined,
      codigo: form.codigo.trim() || undefined,
    };

    if (!payload.nombre) {
      setError('Nombre es obligatorio');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingCiudadId) {
        await updateCiudad(accessToken, editingCiudadId, payload);
      } else {
        await createCiudad(accessToken, payload);
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        paisId: previous.paisId,
      }));
      setEditingCiudadId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar ciudad';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(ciudad: CiudadListItem) {
    setEditingCiudadId(ciudad.ciudadId);
    setForm({
      paisId: String(ciudad.paisId),
      nombre: ciudad.nombre,
      departamento: ciudad.departamento ?? '',
      codigo: ciudad.codigo ?? '',
    });
    setError('');
  }

  function cancelEdit() {
    setEditingCiudadId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      paisId: previous.paisId || String(paises[0]?.paisId ?? ''),
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
    <section className="ciudades-page">
      <header className="ciudades-header">
        <h1>Ciudades</h1>
        <p>Gestion de ciudades relacionadas con pais y usadas por otros modulos.</p>
      </header>

      {error && <p className="ciudades-error">{error}</p>}

      {canManage && (
        <article className="ciudades-card">
          <h2>{editingCiudadId ? 'Editar ciudad' : 'Crear ciudad'}</h2>
          <form className="ciudades-form" onSubmit={handleSubmit}>
            <label>
              Pais
              <select
                value={form.paisId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, paisId: event.target.value }))
                }
                required
              >
                {paises.map((pais) => (
                  <option key={pais.paisId} value={String(pais.paisId)}>
                    {pais.nombre} ({pais.codigoISO2})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nombre
              <input
                type="text"
                value={form.nombre}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, nombre: event.target.value }))
                }
                maxLength={160}
                required
              />
            </label>

            <label>
              Departamento
              <input
                type="text"
                value={form.departamento}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    departamento: event.target.value,
                  }))
                }
                maxLength={160}
              />
            </label>

            <label>
              Codigo
              <input
                type="text"
                value={form.codigo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, codigo: event.target.value }))
                }
                maxLength={50}
              />
            </label>

            <div className="ciudades-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingCiudadId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingCiudadId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="ciudades-card">
        <h2>Listado de ciudades</h2>
        {isLoading ? (
          <p className="ciudades-loading">Cargando ciudades...</p>
        ) : (
          <div className="ciudades-table-wrap">
            <table className="ciudades-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pais</th>
                  <th>Nombre</th>
                  <th>Departamento</th>
                  <th>Codigo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedCiudades.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="ciudades-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedCiudades.map((ciudad) => {
                    const pais = paisMap.get(ciudad.paisId);
                    const paisLabel = pais
                      ? `${pais.nombre} (${pais.codigoISO2})`
                      : `PaisId ${ciudad.paisId}`;

                    return (
                      <tr key={ciudad.ciudadId}>
                        <td>{ciudad.ciudadId}</td>
                        <td>{paisLabel}</td>
                        <td>{ciudad.nombre}</td>
                        <td>{ciudad.departamento ?? '-'}</td>
                        <td>{ciudad.codigo ?? '-'}</td>
                        <td>{formatDate(ciudad.createdAt)}</td>
                        <td>{formatDate(ciudad.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(ciudad)}>
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
