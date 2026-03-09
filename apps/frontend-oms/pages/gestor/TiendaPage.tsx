import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createTienda,
  getTiendasBootstrap,
  updateTienda,
  type TiendaListItem,
} from '../../src/configuracion-general/tienda.api';
import './TiendaPage.css';

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

type CiudadOption = {
  ciudadId: number;
  paisId: number;
  nombre: string;
};

type FormState = {
  empresaId: string;
  codigo: string;
  nombre: string;
  paisId: string;
  ciudadId: string;
  direccion: string;
  telefono: string;
  fulfillmentHabilitado: boolean;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  codigo: '',
  nombre: '',
  paisId: '',
  ciudadId: '',
  direccion: '',
  telefono: '',
  fulfillmentHabilitado: true,
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

export function TiendaPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [tiendas, setTiendas] = useState<TiendaListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [paises, setPaises] = useState<PaisOption[]>([]);
  const [ciudades, setCiudades] = useState<CiudadOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingTiendaId, setEditingTiendaId] = useState<number | null>(null);
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
      const bootstrap = await withRetry(() => getTiendasBootstrap(accessToken));
      setTiendas(bootstrap.tiendas);
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
      setCiudades(
        [...bootstrap.ciudades].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.ciudadId - b.ciudadId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar tiendas';
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

  useEffect(() => {
    if (!form.ciudadId) {
      return;
    }

    const selectedPaisId = Number(form.paisId);
    const selectedCiudadId = Number(form.ciudadId);
    const belongs = ciudades.some(
      (ciudad) => ciudad.ciudadId === selectedCiudadId && ciudad.paisId === selectedPaisId,
    );
    if (!belongs) {
      setForm((previous) => ({ ...previous, ciudadId: '' }));
    }
  }, [ciudades, form.ciudadId, form.paisId]);

  const sortedTiendas = useMemo(
    () =>
      [...tiendas].sort((a, b) => {
        const byNombre = a.nombre.localeCompare(b.nombre);
        return byNombre !== 0 ? byNombre : a.tiendaId - b.tiendaId;
      }),
    [tiendas],
  );

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

  const ciudadMap = useMemo(() => {
    const map = new Map<number, CiudadOption>();
    ciudades.forEach((ciudad) => {
      map.set(ciudad.ciudadId, ciudad);
    });
    return map;
  }, [ciudades]);

  const ciudadesPorPais = useMemo(() => {
    const selectedPaisId = Number(form.paisId);
    if (!Number.isInteger(selectedPaisId) || selectedPaisId <= 0) {
      return [] as CiudadOption[];
    }

    return ciudades.filter((ciudad) => ciudad.paisId === selectedPaisId);
  }, [ciudades, form.paisId]);

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
    const ciudadIdRaw = form.ciudadId.trim();
    const paisId = paisIdRaw ? Number(paisIdRaw) : undefined;
    const ciudadId = ciudadIdRaw ? Number(ciudadIdRaw) : undefined;
    const direccion = form.direccion.trim();
    const telefono = form.telefono.trim();

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
    if (ciudadId !== undefined && (!Number.isInteger(ciudadId) || ciudadId <= 0)) {
      setError('Ciudad debe ser un entero mayor a 0');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingTiendaId) {
        await updateTienda(accessToken, editingTiendaId, {
          empresaId,
          codigo,
          nombre,
          paisId: paisId ?? null,
          ciudadId: ciudadId ?? null,
          direccion: direccion || null,
          telefono: telefono || null,
          fulfillmentHabilitado: form.fulfillmentHabilitado,
          activo: form.activo,
        });
      } else {
        await createTienda(accessToken, {
          empresaId,
          codigo,
          nombre,
          paisId,
          ciudadId,
          direccion: direccion || undefined,
          telefono: telefono || undefined,
          fulfillmentHabilitado: form.fulfillmentHabilitado,
          activo: form.activo,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
      }));
      setEditingTiendaId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar tienda';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(tienda: TiendaListItem) {
    setEditingTiendaId(tienda.tiendaId);
    setForm({
      empresaId: String(tienda.empresaId),
      codigo: tienda.codigo,
      nombre: tienda.nombre,
      paisId: tienda.paisId ? String(tienda.paisId) : '',
      ciudadId: tienda.ciudadId ? String(tienda.ciudadId) : '',
      direccion: tienda.direccion ?? '',
      telefono: tienda.telefono ?? '',
      fulfillmentHabilitado: tienda.fulfillmentHabilitado,
      activo: tienda.activo,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingTiendaId(null);
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
    <section className="tienda-page">
      <header className="tienda-header">
        <h1>Tiendas</h1>
        <p>Administracion de tiendas por empresa con ubicacion y configuracion operativa.</p>
      </header>

      {error && <p className="tienda-error">{error}</p>}

      {canManage && (
        <article className="tienda-card">
          <h2>{editingTiendaId ? 'Editar tienda' : 'Crear tienda'}</h2>
          <form className="tienda-form" onSubmit={handleSubmit}>
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
                onChange={(event) => {
                  const nextPaisId = event.target.value;
                  setForm((previous) => {
                    const keepCiudad = ciudades.some(
                      (ciudad) =>
                        String(ciudad.ciudadId) === previous.ciudadId &&
                        String(ciudad.paisId) === nextPaisId,
                    );
                    return {
                      ...previous,
                      paisId: nextPaisId,
                      ciudadId: keepCiudad ? previous.ciudadId : '',
                    };
                  });
                }}
              >
                <option value="">Sin pais</option>
                {paises.map((pais) => (
                  <option key={pais.paisId} value={String(pais.paisId)}>
                    {pais.nombre} ({pais.codigoISO2})
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
              >
                <option value="">Sin ciudad</option>
                {ciudadesPorPais.map((ciudad) => (
                  <option key={ciudad.ciudadId} value={String(ciudad.ciudadId)}>
                    {ciudad.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Direccion
              <input
                type="text"
                value={form.direccion}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, direccion: event.target.value }))
                }
                maxLength={255}
              />
            </label>

            <label>
              Telefono
              <input
                type="text"
                value={form.telefono}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, telefono: event.target.value }))
                }
                maxLength={50}
              />
            </label>

            <label className="tienda-checkbox">
              <input
                type="checkbox"
                checked={form.fulfillmentHabilitado}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    fulfillmentHabilitado: event.target.checked,
                  }))
                }
              />
              Fulfillment habilitado
            </label>

            <label className="tienda-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="tienda-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingTiendaId ? 'Actualizar' : 'Crear'}
              </button>

              {editingTiendaId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="tienda-card">
        <h2>Listado de tiendas</h2>
        {isLoading ? (
          <p className="tienda-loading">Cargando tiendas...</p>
        ) : (
          <div className="tienda-table-wrap">
            <table className="tienda-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Pais</th>
                  <th>Ciudad</th>
                  <th>Direccion</th>
                  <th>Telefono</th>
                  <th>Fulfillment</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedTiendas.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 13 : 12} className="tienda-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedTiendas.map((tienda) => {
                    const empresa = empresaMap.get(tienda.empresaId);
                    const pais = tienda.paisId === undefined ? undefined : paisMap.get(tienda.paisId);
                    const ciudad =
                      tienda.ciudadId === undefined ? undefined : ciudadMap.get(tienda.ciudadId);
                    return (
                      <tr key={tienda.tiendaId}>
                        <td>{tienda.tiendaId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${tienda.empresaId}`}
                        </td>
                        <td>{tienda.codigo}</td>
                        <td>{tienda.nombre}</td>
                        <td>
                          {tienda.paisId === undefined
                            ? '-'
                            : pais
                              ? `${pais.nombre} (${pais.codigoISO2})`
                              : `PaisId ${tienda.paisId}`}
                        </td>
                        <td>
                          {tienda.ciudadId === undefined
                            ? '-'
                            : ciudad
                              ? ciudad.nombre
                              : `CiudadId ${tienda.ciudadId}`}
                        </td>
                        <td>{tienda.direccion ?? '-'}</td>
                        <td>{tienda.telefono ?? '-'}</td>
                        <td>{tienda.fulfillmentHabilitado ? 'Si' : 'No'}</td>
                        <td>{tienda.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(tienda.createdAt)}</td>
                        <td>{formatDate(tienda.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(tienda)}>
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
