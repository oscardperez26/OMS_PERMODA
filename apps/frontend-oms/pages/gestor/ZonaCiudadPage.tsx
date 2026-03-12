import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createZonaCiudad,
  getZonasCiudadBootstrap,
  updateZonaCiudad,
  type ZonaCiudadListItem,
} from '../../src/configuracion-general/zona-ciudad.api';
import './ZonaCiudadPage.css';
import { Link } from 'react-router-dom';

type ZonaOption = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

type CiudadOption = {
  ciudadId: number;
  paisId: number;
  nombre: string;
};

type FormState = {
  zonaTransporteId: string;
  ciudadId: string;
};

const INITIAL_FORM: FormState = {
  zonaTransporteId: '',
  ciudadId: '',
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

export function ZonaCiudadPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [zonasCiudad, setZonasCiudad] = useState<ZonaCiudadListItem[]>([]);
  const [zonasTransporte, setZonasTransporte] = useState<ZonaOption[]>([]);
  const [ciudades, setCiudades] = useState<CiudadOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingZonaCiudadId, setEditingZonaCiudadId] = useState<string | null>(null);
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
      const bootstrap = await withRetry(() => getZonasCiudadBootstrap(accessToken));
      setZonasCiudad(bootstrap.zonasCiudad);
      setZonasTransporte(
        [...bootstrap.zonasTransporte].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.zonaTransporteId - b.zonaTransporteId;
        }),
      );
      setCiudades(
        [...bootstrap.ciudades].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.ciudadId - b.ciudadId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar zona ciudad';
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
    if (form.zonaTransporteId || zonasTransporte.length === 0) {
      return;
    }
    setForm((previous) => ({
      ...previous,
      zonaTransporteId: String(zonasTransporte[0].zonaTransporteId),
    }));
  }, [form.zonaTransporteId, zonasTransporte]);

  useEffect(() => {
    if (form.ciudadId || ciudades.length === 0) {
      return;
    }
    setForm((previous) => ({
      ...previous,
      ciudadId: String(ciudades[0].ciudadId),
    }));
  }, [ciudades, form.ciudadId]);

  const zonaMap = useMemo(() => {
    const map = new Map<number, ZonaOption>();
    zonasTransporte.forEach((zona) => {
      map.set(zona.zonaTransporteId, zona);
    });
    return map;
  }, [zonasTransporte]);

  const ciudadMap = useMemo(() => {
    const map = new Map<number, CiudadOption>();
    ciudades.forEach((ciudad) => {
      map.set(ciudad.ciudadId, ciudad);
    });
    return map;
  }, [ciudades]);

  const sortedZonasCiudad = useMemo(
    () =>
      [...zonasCiudad].sort((a, b) => {
        const byZona = a.zonaTransporteId - b.zonaTransporteId;
        return byZona !== 0 ? byZona : a.ciudadId - b.ciudadId;
      }),
    [zonasCiudad],
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

    const zonaTransporteId = Number(form.zonaTransporteId);
    const ciudadId = Number(form.ciudadId);

    if (!Number.isInteger(zonaTransporteId) || zonaTransporteId <= 0) {
      setError('Zona es obligatoria');
      return;
    }
    if (!Number.isInteger(ciudadId) || ciudadId <= 0) {
      setError('Ciudad es obligatoria');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingZonaCiudadId) {
        await updateZonaCiudad(accessToken, editingZonaCiudadId, {
          zonaTransporteId,
          ciudadId,
        });
      } else {
        await createZonaCiudad(accessToken, { zonaTransporteId, ciudadId });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        zonaTransporteId: previous.zonaTransporteId,
        ciudadId: previous.ciudadId,
      }));
      setEditingZonaCiudadId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar zona ciudad';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(zonaCiudad: ZonaCiudadListItem) {
    setEditingZonaCiudadId(zonaCiudad.id);
    setForm({
      zonaTransporteId: String(zonaCiudad.zonaTransporteId),
      ciudadId: String(zonaCiudad.ciudadId),
    });
    setError('');
  }

  function cancelEdit() {
    setEditingZonaCiudadId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      zonaTransporteId: previous.zonaTransporteId || String(zonasTransporte[0]?.zonaTransporteId ?? ''),
      ciudadId: previous.ciudadId || String(ciudades[0]?.ciudadId ?? ''),
    }));
    setError('');
  }

  return (
    <section className="zona-ciudad-page">
      <header className="zona-ciudad-header">
        <h1>Zona Ciudad</h1>
        <p>Relacion entre zonas de transporte y ciudades.</p>
      </header>

      {error && <p className="zona-ciudad-error">{error}</p>}

      {canManage && (
        <article className="zona-ciudad-card">
          <h2>{editingZonaCiudadId ? 'Editar relacion' : 'Crear relacion'}</h2>
          <form className="zona-ciudad-form" onSubmit={handleSubmit}>
            <label>
              Zona de transporte
              <select
                value={form.zonaTransporteId}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    zonaTransporteId: event.target.value,
                  }))
                }
                required
              >
                {zonasTransporte.map((zona) => (
                  <option key={zona.zonaTransporteId} value={String(zona.zonaTransporteId)}>
                    {zona.nombre} ({zona.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ciudad
              <select
                value={form.ciudadId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, ciudadId: event.target.value }))
                }
                required
              >
                {ciudades.map((ciudad) => (
                  <option key={ciudad.ciudadId} value={String(ciudad.ciudadId)}>
                    {ciudad.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="zona-ciudad-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingZonaCiudadId ? 'Actualizar' : 'Crear'}
              </button>

              {editingZonaCiudadId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="zona-ciudad-card">
        <h2>Listado de relaciones</h2>
        {isLoading ? (
          <p className="zona-ciudad-loading">Cargando relaciones...</p>
        ) : (
          <div className="zona-ciudad-table-wrap">
            <table className="zona-ciudad-table">
              <thead>
                <tr>
                  <th>ID compuesto</th>
                  <th>Zona</th>
                  <th>Ciudad</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedZonasCiudad.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="zona-ciudad-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedZonasCiudad.map((zonaCiudad) => {
                    const zona = zonaMap.get(zonaCiudad.zonaTransporteId);
                    const ciudad = ciudadMap.get(zonaCiudad.ciudadId);
                    return (
                      <tr key={zonaCiudad.id}>
                        <td>{zonaCiudad.id}</td>
                        <td>
                          {zona
                            ? `${zona.nombre} (${zona.codigo})`
                            : `ZonaTransporteId ${zonaCiudad.zonaTransporteId}`}
                        </td>
                        <td>
                          {ciudad ? ciudad.nombre : `CiudadId ${zonaCiudad.ciudadId}`}
                        </td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(zonaCiudad)}>
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
    
              <Link to="/panel/order-manager/configuracion-general/logistica" className="transportadora-back-link">
                volver 
              </Link>

    </section>
  );
}
