import { useEffect, useState, type FormEvent } from 'react';
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


type FormState = {
  empresaId: string;
  perfilId: string;
  nombre: string;
  email: string;
  telefono: string;
  temporaryPassword: string;
};

const INITIAL_FORM: FormState = {
  empresaId: '1',
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
      const [usersData, profilesData] = await Promise.all([
        listUsers(accessToken),
        listProfiles(accessToken),
      ]);
      setUsers(usersData);
      setProfiles(profilesData);
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

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createUser(accessToken, {
        empresaId: Number(form.empresaId),
        perfilId: Number(form.perfilId),
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || undefined,
        temporaryPassword: form.temporaryPassword,
      });

      setForm(INITIAL_FORM);
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

          <input
            type="number"
            placeholder="EmpresaId"
            value={form.empresaId}
            onChange={(event) => setForm((prev) => ({ ...prev, empresaId: event.target.value }))}
            required
          />

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
