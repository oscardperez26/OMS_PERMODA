import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createEmpresaCliente,
  getEmpresaClientesBootstrap,
  updateEmpresaCliente,
  type EmpresaClienteListItem,
} from '../../src/configuracion-general/empresa-cliente.api';
import './EmpresaClientePage.css';

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
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
  paisId: string;
  ciudadId: string;
  direccion: string;
  estado: string;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  nombre: '',
  documento: '',
  email: '',
  telefono: '',
  paisId: '',
  ciudadId: '',
  direccion: '',
  estado: 'ACTIVA',
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

export function EmpresaClientePage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [empresaClientes, setEmpresaClientes] = useState<EmpresaClienteListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [paises, setPaises] = useState<PaisOption[]>([]);
  const [ciudades, setCiudades] = useState<CiudadOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingEmpresaClienteId, setEditingEmpresaClienteId] = useState<number | null>(
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
      const bootstrap = await withRetry(() => getEmpresaClientesBootstrap(accessToken));
      setEmpresaClientes(bootstrap.empresaClientes);
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
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar empresa cliente';
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

  const sortedEmpresaClientes = useMemo(
    () =>
      [...empresaClientes].sort((a, b) => {
        const byNombre = a.nombre.localeCompare(b.nombre);
        return byNombre !== 0 ? byNombre : a.empresaClienteId - b.empresaClienteId;
      }),
    [empresaClientes],
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
    const nombre = form.nombre.trim();
    const documento = form.documento.trim();
    const email = form.email.trim().toLowerCase();
    const telefono = form.telefono.trim();
    const paisIdRaw = form.paisId.trim();
    const ciudadIdRaw = form.ciudadId.trim();
    const paisId = paisIdRaw ? Number(paisIdRaw) : undefined;
    const ciudadId = ciudadIdRaw ? Number(ciudadIdRaw) : undefined;
    const direccion = form.direccion.trim();
    const estado = form.estado.trim().toUpperCase() || 'ACTIVA';

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!nombre) {
      setError('Nombre es obligatorio');
      return;
    }
    if (!documento && !email) {
      setError('Debes informar Documento o Email');
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
      if (editingEmpresaClienteId) {
        await updateEmpresaCliente(accessToken, editingEmpresaClienteId, {
          empresaId,
          nombre,
          documento: documento || null,
          email: email || null,
          telefono: telefono || null,
          paisId: paisId ?? null,
          ciudadId: ciudadId ?? null,
          direccion: direccion || null,
          estado,
        });
      } else {
        await createEmpresaCliente(accessToken, {
          empresaId,
          nombre,
          documento: documento || undefined,
          email: email || undefined,
          telefono: telefono || undefined,
          paisId,
          ciudadId,
          direccion: direccion || undefined,
          estado,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
        estado: previous.estado,
      }));
      setEditingEmpresaClienteId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar empresa cliente';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(empresaCliente: EmpresaClienteListItem) {
    setEditingEmpresaClienteId(empresaCliente.empresaClienteId);
    setForm({
      empresaId: String(empresaCliente.empresaId),
      nombre: empresaCliente.nombre,
      documento: empresaCliente.documento ?? '',
      email: empresaCliente.email ?? '',
      telefono: empresaCliente.telefono ?? '',
      paisId: empresaCliente.paisId ? String(empresaCliente.paisId) : '',
      ciudadId: empresaCliente.ciudadId ? String(empresaCliente.ciudadId) : '',
      direccion: empresaCliente.direccion ?? '',
      estado: empresaCliente.estado,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingEmpresaClienteId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      empresaId: previous.empresaId || String(empresas[0]?.empresaId ?? ''),
      estado: previous.estado || 'ACTIVA',
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
    <section className="empresa-cliente-page">
      <header className="empresa-cliente-header">
        <h1>Empresa Cliente</h1>
        <p>Gestion de clientes por empresa con reglas de documento y email.</p>
      </header>

      {error && <p className="empresa-cliente-error">{error}</p>}

      {canManage && (
        <article className="empresa-cliente-card">
          <h2>{editingEmpresaClienteId ? 'Editar cliente' : 'Crear cliente'}</h2>
          <form className="empresa-cliente-form" onSubmit={handleSubmit}>
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
              Documento
              <input
                type="text"
                value={form.documento}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, documento: event.target.value }))
                }
                maxLength={60}
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
              Estado
              <select
                value={form.estado}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, estado: event.target.value }))
                }
              >
                <option value="ACTIVA">ACTIVA</option>
                <option value="INACTIVA">INACTIVA</option>
              </select>
            </label>

            <label className="empresa-cliente-address">
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

            <div className="empresa-cliente-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingEmpresaClienteId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingEmpresaClienteId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="empresa-cliente-card">
        <h2>Listado de clientes</h2>
        {isLoading ? (
          <p className="empresa-cliente-loading">Cargando clientes...</p>
        ) : (
          <div className="empresa-cliente-table-wrap">
            <table className="empresa-cliente-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Email</th>
                  <th>Telefono</th>
                  <th>Pais</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedEmpresaClientes.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 12 : 11} className="empresa-cliente-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedEmpresaClientes.map((empresaCliente) => {
                    const empresa = empresaMap.get(empresaCliente.empresaId);
                    const pais =
                      empresaCliente.paisId === undefined
                        ? undefined
                        : paisMap.get(empresaCliente.paisId);
                    const ciudad =
                      empresaCliente.ciudadId === undefined
                        ? undefined
                        : ciudadMap.get(empresaCliente.ciudadId);
                    return (
                      <tr key={empresaCliente.empresaClienteId}>
                        <td>{empresaCliente.empresaClienteId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${empresaCliente.empresaId}`}
                        </td>
                        <td>{empresaCliente.nombre}</td>
                        <td>{empresaCliente.documento ?? '-'}</td>
                        <td>{empresaCliente.email ?? '-'}</td>
                        <td>{empresaCliente.telefono ?? '-'}</td>
                        <td>
                          {empresaCliente.paisId === undefined
                            ? '-'
                            : pais
                              ? `${pais.nombre} (${pais.codigoISO2})`
                              : `PaisId ${empresaCliente.paisId}`}
                        </td>
                        <td>
                          {empresaCliente.ciudadId === undefined
                            ? '-'
                            : ciudad
                              ? ciudad.nombre
                              : `CiudadId ${empresaCliente.ciudadId}`}
                        </td>
                        <td>{empresaCliente.estado}</td>
                        <td>{formatDate(empresaCliente.createdAt)}</td>
                        <td>{formatDate(empresaCliente.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(empresaCliente)}>
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
