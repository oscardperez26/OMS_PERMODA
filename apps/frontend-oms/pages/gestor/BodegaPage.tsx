import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createBodega,
  getBodegasBootstrap,
  updateBodega,
  type BodegaListItem,
} from '../../src/configuracion-general/bodega.api';
import './BodegaPage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type TiendaOption = {
  tiendaId: number;
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
  tipo: string;
  tiendaId: string;
  paisId: string;
  ciudadId: string;
  direccion: string;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  codigo: '',
  nombre: '',
  tipo: 'STORE',
  tiendaId: '',
  paisId: '',
  ciudadId: '',
  direccion: '',
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

export function BodegaPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [bodegas, setBodegas] = useState<BodegaListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [tiendas, setTiendas] = useState<TiendaOption[]>([]);
  const [paises, setPaises] = useState<PaisOption[]>([]);
  const [ciudades, setCiudades] = useState<CiudadOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingBodegaId, setEditingBodegaId] = useState<number | null>(null);
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
      const bootstrap = await withRetry(() => getBodegasBootstrap(accessToken));
      setBodegas(bootstrap.bodegas);
      setEmpresas(
        [...bootstrap.empresas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.empresaId - b.empresaId;
        }),
      );
      setTiendas(
        [...bootstrap.tiendas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.tiendaId - b.tiendaId;
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
        requestError instanceof Error ? requestError.message : 'No se pudo cargar bodegas';
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

  const tiendasPorEmpresa = useMemo(() => {
    const selectedEmpresaId = Number(form.empresaId);
    if (!Number.isInteger(selectedEmpresaId) || selectedEmpresaId <= 0) {
      return [] as TiendaOption[];
    }
    return tiendas.filter((tienda) => tienda.empresaId === selectedEmpresaId);
  }, [form.empresaId, tiendas]);

  useEffect(() => {
    if (!form.empresaId) {
      return;
    }
    const tiendaValida = tiendasPorEmpresa.some(
      (tienda) => String(tienda.tiendaId) === form.tiendaId,
    );
    if (!tiendaValida) {
      setForm((previous) => ({
        ...previous,
        tiendaId: String(tiendasPorEmpresa[0]?.tiendaId ?? ''),
      }));
    }
  }, [form.empresaId, form.tiendaId, tiendasPorEmpresa]);

  const ciudadesPorPais = useMemo(() => {
    const selectedPaisId = Number(form.paisId);
    if (!Number.isInteger(selectedPaisId) || selectedPaisId <= 0) {
      return [] as CiudadOption[];
    }
    return ciudades.filter((ciudad) => ciudad.paisId === selectedPaisId);
  }, [ciudades, form.paisId]);

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

  const sortedBodegas = useMemo(
    () =>
      [...bodegas].sort((a, b) => {
        const byNombre = a.nombre.localeCompare(b.nombre);
        return byNombre !== 0 ? byNombre : a.bodegaId - b.bodegaId;
      }),
    [bodegas],
  );

  const empresaMap = useMemo(() => {
    const map = new Map<number, EmpresaOption>();
    empresas.forEach((empresa) => {
      map.set(empresa.empresaId, empresa);
    });
    return map;
  }, [empresas]);

  const tiendaMap = useMemo(() => {
    const map = new Map<number, TiendaOption>();
    tiendas.forEach((tienda) => {
      map.set(tienda.tiendaId, tienda);
    });
    return map;
  }, [tiendas]);

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
    const tipo = form.tipo.trim().toUpperCase();
    const tiendaIdRaw = form.tiendaId.trim();
    const paisIdRaw = form.paisId.trim();
    const ciudadIdRaw = form.ciudadId.trim();
    const tiendaId = tiendaIdRaw ? Number(tiendaIdRaw) : undefined;
    const paisId = paisIdRaw ? Number(paisIdRaw) : undefined;
    const ciudadId = ciudadIdRaw ? Number(ciudadIdRaw) : undefined;
    const direccion = form.direccion.trim();

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!codigo || !nombre || !tipo) {
      setError('Codigo, nombre y tipo son obligatorios');
      return;
    }
    if (tiendaId !== undefined && (!Number.isInteger(tiendaId) || tiendaId <= 0)) {
      setError('Tienda debe ser un entero mayor a 0');
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
      if (editingBodegaId) {
        await updateBodega(accessToken, editingBodegaId, {
          empresaId,
          codigo,
          nombre,
          tipo,
          tiendaId: tiendaId ?? null,
          paisId: paisId ?? null,
          ciudadId: ciudadId ?? null,
          direccion: direccion || null,
          activo: form.activo,
        });
      } else {
        await createBodega(accessToken, {
          empresaId,
          codigo,
          nombre,
          tipo,
          tiendaId,
          paisId,
          ciudadId,
          direccion: direccion || undefined,
          activo: form.activo,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
      }));
      setEditingBodegaId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar bodega';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(bodega: BodegaListItem) {
    setEditingBodegaId(bodega.bodegaId);
    setForm({
      empresaId: String(bodega.empresaId),
      codigo: bodega.codigo,
      nombre: bodega.nombre,
      tipo: bodega.tipo,
      tiendaId: bodega.tiendaId ? String(bodega.tiendaId) : '',
      paisId: bodega.paisId ? String(bodega.paisId) : '',
      ciudadId: bodega.ciudadId ? String(bodega.ciudadId) : '',
      direccion: bodega.direccion ?? '',
      activo: bodega.activo,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingBodegaId(null);
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
    <section className="bodega-page">
      <header className="bodega-header">
        <h1>Bodegas</h1>
        <p>Administracion de bodegas operativas por empresa y tienda.</p>
      </header>

      {error && <p className="bodega-error">{error}</p>}

      {canManage && (
        <article className="bodega-card">
          <h2>{editingBodegaId ? 'Editar bodega' : 'Crear bodega'}</h2>
          <form className="bodega-form" onSubmit={handleSubmit}>
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
              Tipo
              <input
                type="text"
                value={form.tipo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, tipo: event.target.value }))
                }
                maxLength={30}
                required
              />
            </label>

            <label>
              Tienda
              <select
                value={form.tiendaId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, tiendaId: event.target.value }))
                }
              >
                <option value="">Sin tienda</option>
                {tiendasPorEmpresa.map((tienda) => (
                  <option key={tienda.tiendaId} value={String(tienda.tiendaId)}>
                    {tienda.nombre} ({tienda.codigo})
                  </option>
                ))}
              </select>
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

            <label className="bodega-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="bodega-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingBodegaId ? 'Actualizar' : 'Crear'}
              </button>

              {editingBodegaId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="bodega-card">
        <h2>Listado de bodegas</h2>
        {isLoading ? (
          <p className="bodega-loading">Cargando bodegas...</p>
        ) : (
          <div className="bodega-table-wrap">
            <table className="bodega-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Tienda</th>
                  <th>Pais</th>
                  <th>Ciudad</th>
                  <th>Direccion</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedBodegas.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 13 : 12} className="bodega-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedBodegas.map((bodega) => {
                    const empresa = empresaMap.get(bodega.empresaId);
                    const tienda =
                      bodega.tiendaId === undefined ? undefined : tiendaMap.get(bodega.tiendaId);
                    const pais = bodega.paisId === undefined ? undefined : paisMap.get(bodega.paisId);
                    const ciudad =
                      bodega.ciudadId === undefined ? undefined : ciudadMap.get(bodega.ciudadId);
                    return (
                      <tr key={bodega.bodegaId}>
                        <td>{bodega.bodegaId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${bodega.empresaId}`}
                        </td>
                        <td>{bodega.codigo}</td>
                        <td>{bodega.nombre}</td>
                        <td>{bodega.tipo}</td>
                        <td>
                          {bodega.tiendaId === undefined
                            ? '-'
                            : tienda
                              ? `${tienda.nombre} (${tienda.codigo})`
                              : `TiendaId ${bodega.tiendaId}`}
                        </td>
                        <td>
                          {bodega.paisId === undefined
                            ? '-'
                            : pais
                              ? `${pais.nombre} (${pais.codigoISO2})`
                              : `PaisId ${bodega.paisId}`}
                        </td>
                        <td>
                          {bodega.ciudadId === undefined
                            ? '-'
                            : ciudad
                              ? ciudad.nombre
                              : `CiudadId ${bodega.ciudadId}`}
                        </td>
                        <td>{bodega.direccion ?? '-'}</td>
                        <td>{bodega.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(bodega.createdAt)}</td>
                        <td>{formatDate(bodega.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(bodega)}>
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
