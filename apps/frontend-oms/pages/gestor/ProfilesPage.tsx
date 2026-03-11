import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createUser,
  listProfiles,
  listUsers,
  resetUserPassword,
  updateUserStatus,
  type ProfileCatalogItem,
  type UserListItem,
} from '../../src/auth/users.api';
import { getEmpresaClientesBootstrap } from '../../src/configuracion-general/empresa-cliente.api';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type EmpresaClienteOption = {
  empresaClienteId: number;
  empresaId: number;
  nombre: string;
};


type FormState = {
  empresaId: string;
  empresaClienteId: string;
  perfilId: string;
  nombre: string;
  email: string;
  telefono: string;
  temporaryPassword: string;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  empresaClienteId: '',
  perfilId: '1',
  nombre: '',
  email: '',
  telefono: '',
  temporaryPassword: '',
};

export function ProfilesPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileCatalogItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [empresaClientes, setEmpresaClientes] = useState<EmpresaClienteOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadUsers() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const [usersData, profilesData, empresaClienteBootstrap] = await Promise.all([
        listUsers(accessToken),
        listProfiles(accessToken),
        getEmpresaClientesBootstrap(accessToken),
      ]);
      setUsers(usersData);
      setProfiles(profilesData);
      setEmpresas(empresaClienteBootstrap.empresas);
      setEmpresaClientes(empresaClienteBootstrap.empresaClientes);
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar usuarios';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (profiles.length === 0) {
      return;
    }

    const exists = profiles.some((profile) => String(profile.perfilId) === form.perfilId);
    if (!exists) {
      setForm((prev) => ({ ...prev, perfilId: String(profiles[0].perfilId) }));
    }
  }, [profiles, form.perfilId]);

  useEffect(() => {
    if (empresas.length === 0) {
      return;
    }

    const exists = empresas.some((empresa) => String(empresa.empresaId) === form.empresaId);
    if (!exists) {
      setForm((prev) => ({ ...prev, empresaId: String(empresas[0].empresaId) }));
    }
  }, [empresas, form.empresaId]);

  useEffect(() => {
    if (!form.empresaClienteId) {
      return;
    }

    const selectedEmpresaId = Number(form.empresaId);
    const selectedEmpresaClienteId = Number(form.empresaClienteId);
    const belongs = empresaClientes.some(
      (empresaCliente) =>
        empresaCliente.empresaClienteId === selectedEmpresaClienteId &&
        empresaCliente.empresaId === selectedEmpresaId,
    );
    if (!belongs) {
      setForm((prev) => ({ ...prev, empresaClienteId: '' }));
    }
  }, [empresaClientes, form.empresaClienteId, form.empresaId]);

  const empresaClientesPorEmpresa = useMemo(() => {
    const empresaId = Number(form.empresaId);
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      return [] as EmpresaClienteOption[];
    }
    return empresaClientes.filter((empresaCliente) => empresaCliente.empresaId === empresaId);
  }, [empresaClientes, form.empresaId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }

    const empresaId = Number(form.empresaId);
    const perfilId = Number(form.perfilId);
    const empresaClienteId = form.empresaClienteId ? Number(form.empresaClienteId) : undefined;
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('EmpresaId invalido');
      return;
    }
    if (!Number.isInteger(perfilId) || perfilId <= 0) {
      setError('PerfilId invalido');
      return;
    }
    if (
      empresaClienteId !== undefined &&
      (!Number.isInteger(empresaClienteId) || empresaClienteId <= 0)
    ) {
      setError('EmpresaClienteId invalido');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createUser(accessToken, {
        empresaId,
        empresaClienteId,
        perfilId,
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || undefined,
        temporaryPassword: form.temporaryPassword,
      });

      setForm((prev) => ({
        ...INITIAL_FORM,
        empresaId: prev.empresaId,
        perfilId: prev.perfilId,
      }));
      await loadUsers();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo crear usuario';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function isActive(user: UserListItem): boolean {
    const value = user.estado;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value).trim().toUpperCase();
    return normalized === '1' || normalized === 'ACTIVO' || normalized === 'ACTIVE';
  }

  async function handleToggleStatus(user: UserListItem) {
    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }

    const nextEstado: 0 | 1 = isActive(user) ? 0 : 1;

    try {
      await updateUserStatus(accessToken, user.id, nextEstado);
      await loadUsers();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo actualizar estado';
      setError(message);
    }
  }

  async function handleResetPassword(userId: string) {
    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }

    const nextPassword = window.prompt(
      'Nueva contraseña temporal (minimo 8 caracteres):',
      '',
    );

    if (!nextPassword) {
      return;
    }

    try {
      await resetUserPassword(accessToken, userId, nextPassword);
      setError('');
      window.alert('Contraseña temporal actualizada');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo resetear contraseña';
      setError(message);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Gestion de Perfiles</h1>
      <p>Crear usuarios y revisar perfiles registrados.</p>

      <section style={{ marginBottom: 20 }}>
        <h2>Crear Usuario</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
          <input
            placeholder="Nombre"
            value={form.nombre}
            onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />

          <input
            placeholder="Telefono (opcional)"
            value={form.telefono}
            onChange={(event) => setForm((prev) => ({ ...prev, telefono: event.target.value }))}
          />

          <select
            value={form.empresaId}
            onChange={(event) => {
              const nextEmpresaId = event.target.value;
              setForm((prev) => ({
                ...prev,
                empresaId: nextEmpresaId,
                empresaClienteId: '',
              }));
            }}
            required
          >
            <option value="" disabled>
              Selecciona empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.empresaId} value={String(empresa.empresaId)}>
                {empresa.nombre} ({empresa.codigo})
              </option>
            ))}
          </select>

          <select
            value={form.empresaClienteId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, empresaClienteId: event.target.value }))
            }
          >
            <option value="">Sin empresa cliente</option>
            {empresaClientesPorEmpresa.map((empresaCliente) => (
              <option
                key={empresaCliente.empresaClienteId}
                value={String(empresaCliente.empresaClienteId)}
              >
                {empresaCliente.nombre} (#{empresaCliente.empresaClienteId})
              </option>
            ))}
          </select>

          <select
            value={form.perfilId}
            onChange={(event) => setForm((prev) => ({ ...prev, perfilId: event.target.value }))}
          >
            {profiles.map((profile) => (
              <option key={profile.perfilId} value={String(profile.perfilId)}>
                {profile.perfilId} - {profile.label}
              </option>
            ))}
          </select>

          <input
            type="password"
            placeholder="Contrasena temporal"
            value={form.temporaryPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, temporaryPassword: event.target.value }))
            }
            minLength={8}
            required
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </section>

      <section>
        <h2>Usuarios Registrados</h2>
        {error && <p style={{ color: '#b00020' }}>{error}</p>}
        {isLoading ? (
          <p>Cargando usuarios...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">Nombre</th>
                <th align="left">Email</th>
                <th align="left">PerfilId</th>
                <th align="left">EmpresaClienteId</th>
                <th align="left">Estado</th>
                <th align="left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.nombre}</td>
                  <td>{user.email}</td>
                  <td>{user.perfilId}</td>
                  <td>{user.empresaClienteId ?? '-'}</td>
                  <td>{isActive(user) ? 'Activo' : 'Inactivo'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleToggleStatus(user)}>
                      {isActive(user) ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => handleResetPassword(user.id)}>
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
