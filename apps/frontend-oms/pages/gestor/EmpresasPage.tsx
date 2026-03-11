import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createEmpresa,
  getEmpresasBootstrap,
  updateEmpresa,
  type EmpresaListItem,
} from '../../src/configuracion-general/empresa.api';
import { listCiudades, type CiudadListItem } from '../../src/configuracion-general/ciudad.api';
import type { MonedaListItem } from '../../src/configuracion-general/moneda.api';
import type { PaisListItem } from '../../src/configuracion-general/pais.api';
import './EmpresasPage.css';

type FormState = {
  codigo: string;
  nombre: string;
  nit: string;
  email: string;
  telefono: string;
  paisId: string;
  ciudadId: string;
  direccion: string;
  monedaId: string;
};

const INITIAL_FORM: FormState = {
  codigo: '',
  nombre: '',
  nit: '',
  email: '',
  telefono: '',
  paisId: '',
  ciudadId: '',
  direccion: '',
  monedaId: '',
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

export function EmpresasPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [empresas, setEmpresas] = useState<EmpresaListItem[]>([]);
  const [paises, setPaises] = useState<PaisListItem[]>([]);
  const [monedas, setMonedas] = useState<MonedaListItem[]>([]);
  const [ciudades, setCiudades] = useState<CiudadListItem[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingEmpresaId, setEditingEmpresaId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ciudadesWarning, setCiudadesWarning] = useState('');

  async function loadData() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const bootstrap = await withRetry(() => getEmpresasBootstrap(accessToken));

      setEmpresas(bootstrap.empresas);
      setPaises(
        [...bootstrap.paises].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.paisId - b.paisId;
        }),
      );
      setMonedas(
        [...bootstrap.monedas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.monedaId - b.monedaId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar empresas';
      setError(message);
      setIsLoading(false);
      return;
    }

    try {
      const ciudadesData = await withRetry(() => listCiudades(accessToken));
      setCiudades(ciudadesData);
      setCiudadesWarning('');
    } catch (requestError) {
      setCiudades([]);
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar ciudades';
      setCiudadesWarning(`Ciudades opcionales no disponibles: ${message}`);
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

  useEffect(() => {
    if (form.monedaId || monedas.length === 0) {
      return;
    }

    setForm((previous) => ({ ...previous, monedaId: String(monedas[0].monedaId) }));
  }, [form.monedaId, monedas]);

  useEffect(() => {
    if (!form.ciudadId) {
      return;
    }

    const selectedPaisId = Number(form.paisId);
    const selectedCiudadId = Number(form.ciudadId);
    const belongsToPais = ciudades.some(
      (ciudad) =>
        ciudad.ciudadId === selectedCiudadId && ciudad.paisId === selectedPaisId,
    );
    if (!belongsToPais) {
      setForm((previous) => ({ ...previous, ciudadId: '' }));
    }
  }, [ciudades, form.ciudadId, form.paisId]);

  const sortedEmpresas = useMemo(
    () =>
      [...empresas].sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.empresaId - b.empresaId;
      }),
    [empresas],
  );

  const paisMap = useMemo(() => {
    const map = new Map<number, PaisListItem>();
    paises.forEach((pais) => {
      map.set(pais.paisId, pais);
    });
    return map;
  }, [paises]);

  const monedaMap = useMemo(() => {
    const map = new Map<number, MonedaListItem>();
    monedas.forEach((moneda) => {
      map.set(moneda.monedaId, moneda);
    });
    return map;
  }, [monedas]);

  const ciudadMap = useMemo(() => {
    const map = new Map<number, CiudadListItem>();
    ciudades.forEach((ciudad) => {
      map.set(ciudad.ciudadId, ciudad);
    });
    return map;
  }, [ciudades]);

  const ciudadesPorPais = useMemo(() => {
    const selectedPaisId = Number(form.paisId);
    if (!Number.isInteger(selectedPaisId) || selectedPaisId <= 0) {
      return [] as CiudadListItem[];
    }

    return ciudades
      .filter((ciudad) => ciudad.paisId === selectedPaisId)
      .sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.ciudadId - b.ciudadId;
      });
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

    const codigo = form.codigo.trim().toUpperCase();
    const nombre = form.nombre.trim();
    const parsedPaisId = Number(form.paisId);
    const parsedMonedaId = Number(form.monedaId);
    const ciudadRaw = form.ciudadId.trim();
    const parsedCiudadId = ciudadRaw ? Number(ciudadRaw) : undefined;

    if (!codigo || !nombre) {
      setError('Codigo y Nombre son obligatorios');
      return;
    }

    if (!Number.isInteger(parsedPaisId) || parsedPaisId <= 0) {
      setError('Pais es obligatorio');
      return;
    }

    if (!Number.isInteger(parsedMonedaId) || parsedMonedaId <= 0) {
      setError('Moneda es obligatoria');
      return;
    }

    if (
      parsedCiudadId !== undefined &&
      (!Number.isInteger(parsedCiudadId) || parsedCiudadId <= 0)
    ) {
      setError('Ciudad debe ser un entero mayor a 0');
      return;
    }

    const nit = form.nit.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();
    const direccion = form.direccion.trim();

    setIsSubmitting(true);
    setError('');

    try {
      if (editingEmpresaId) {
        await updateEmpresa(accessToken, editingEmpresaId, {
          codigo,
          nombre,
          nit: nit || null,
          email: email || null,
          telefono: telefono || null,
          paisId: parsedPaisId,
          ciudadId: parsedCiudadId ?? null,
          direccion: direccion || null,
          monedaId: parsedMonedaId,
        });
      } else {
        await createEmpresa(accessToken, {
          codigo,
          nombre,
          nit: nit || undefined,
          email: email || undefined,
          telefono: telefono || undefined,
          paisId: parsedPaisId,
          ciudadId: parsedCiudadId,
          direccion: direccion || undefined,
          monedaId: parsedMonedaId,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        paisId: previous.paisId,
        monedaId: previous.monedaId,
      }));
      setEditingEmpresaId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar empresa';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(empresa: EmpresaListItem) {
    setEditingEmpresaId(empresa.empresaId);
    setForm({
      codigo: empresa.codigo,
      nombre: empresa.nombre,
      nit: empresa.nit ?? '',
      email: empresa.email ?? '',
      telefono: empresa.telefono ?? '',
      paisId: String(empresa.paisId),
      ciudadId: empresa.ciudadId ? String(empresa.ciudadId) : '',
      direccion: empresa.direccion ?? '',
      monedaId: String(empresa.monedaId),
    });
    setError('');
  }

  function cancelEdit() {
    setEditingEmpresaId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      paisId: previous.paisId || String(paises[0]?.paisId ?? ''),
      monedaId: previous.monedaId || String(monedas[0]?.monedaId ?? ''),
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

  function formatEstado(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Activo' : 'Inactivo';
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return 'Activo';
      }
      if (value === 0) {
        return 'Inactivo';
      }
      return String(value);
    }
    return String(value);
  }

  return (
    <section className="empresas-page">
      <header className="empresas-header">
        <h1>Empresas</h1>
        <p>Gestion de empresas y su vinculacion con pais, ciudad y moneda.</p>
      </header>

      {error && <p className="empresas-error">{error}</p>}
      {ciudadesWarning && <p className="empresas-warning">{ciudadesWarning}</p>}

      {canManage && (
        <article className="empresas-card">
          <h2>{editingEmpresaId ? 'Editar empresa' : 'Crear empresa'}</h2>
          <form className="empresas-form" onSubmit={handleSubmit}>
            <label>
              Codigo
              <input
                type="text"
                value={form.codigo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, codigo: event.target.value }))
                }
                maxLength={50}
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
                maxLength={240}
                required
              />
            </label>

            <label>
              NIT
              <input
                type="text"
                value={form.nit}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, nit: event.target.value }))
                }
                maxLength={50}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, email: event.target.value }))
                }
                maxLength={180}
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
              Ciudad
              <select
                value={form.ciudadId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, ciudadId: event.target.value }))
                }
                disabled={Boolean(ciudadesWarning)}
              >
                <option value="">
                  {ciudadesWarning ? 'No disponible' : 'Sin ciudad'}
                </option>
                {ciudadesPorPais.map((ciudad) => (
                  <option key={ciudad.ciudadId} value={String(ciudad.ciudadId)}>
                    {ciudad.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Moneda
              <select
                value={form.monedaId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, monedaId: event.target.value }))
                }
                required
              >
                {monedas.map((moneda) => (
                  <option key={moneda.monedaId} value={String(moneda.monedaId)}>
                    {moneda.nombre} ({moneda.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label className="empresas-form-address">
              Direccion
              <input
                type="text"
                value={form.direccion}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, direccion: event.target.value }))
                }
                maxLength={300}
              />
            </label>

            <div className="empresas-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingEmpresaId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingEmpresaId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="empresas-card">
        <h2>Listado de empresas</h2>
        {isLoading ? (
          <p className="empresas-loading">Cargando empresas...</p>
        ) : (
          <div className="empresas-table-wrap">
            <table className="empresas-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>NIT</th>
                  <th>Email</th>
                  <th>Telefono</th>
                  <th>Pais</th>
                  <th>Ciudad</th>
                  <th>Moneda</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedEmpresas.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 13 : 12} className="empresas-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedEmpresas.map((empresa) => {
                    const pais = paisMap.get(empresa.paisId);
                    const ciudad =
                      empresa.ciudadId === undefined
                        ? undefined
                        : ciudadMap.get(empresa.ciudadId);
                    const moneda = monedaMap.get(empresa.monedaId);

                    return (
                      <tr key={empresa.empresaId}>
                        <td>{empresa.empresaId}</td>
                        <td>{empresa.codigo}</td>
                        <td>{empresa.nombre}</td>
                        <td>{empresa.nit ?? '-'}</td>
                        <td>{empresa.email ?? '-'}</td>
                        <td>{empresa.telefono ?? '-'}</td>
                        <td>
                          {pais
                            ? `${pais.nombre} (${pais.codigoISO2})`
                            : `PaisId ${empresa.paisId}`}
                        </td>
                        <td>
                          {empresa.ciudadId === undefined
                            ? '-'
                            : ciudad
                              ? ciudad.nombre
                              : `CiudadId ${empresa.ciudadId}`}
                        </td>
                        <td>
                          {moneda
                            ? `${moneda.nombre} (${moneda.codigo})`
                            : `MonedaId ${empresa.monedaId}`}
                        </td>
                        <td>{formatEstado(empresa.estado)}</td>
                        <td>{formatDate(empresa.createdAt)}</td>
                        <td>{formatDate(empresa.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(empresa)}>
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
