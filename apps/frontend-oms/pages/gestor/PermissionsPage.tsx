import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import type { Permission } from '../../src/auth/auth.types';
import {
  getSecurityPermissionsBootstrap,
  updateProfilePermissions,
  type SecurityPermissionItem,
  type SecurityProfileItem,
} from '../../src/security-permissions/security-permissions.api';
import './PermissionsPage.css';

type AssignmentMap = Record<number, Permission[]>;

function sortPermissions(values: Permission[]): Permission[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toAssignmentMap(
  profiles: SecurityProfileItem[],
  assignments: Array<{ perfilId: number; permissions: Permission[] }>,
): AssignmentMap {
  const map: AssignmentMap = {};
  profiles.forEach((profile) => {
    const current =
      assignments.find((item) => item.perfilId === profile.perfilId)?.permissions ?? [];
    map[profile.perfilId] = sortPermissions(current);
  });
  return map;
}

function arePermissionsEqual(left: Permission[], right: Permission[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

export function PermissionsPage() {
  const { accessToken } = useAuth();

  const [profiles, setProfiles] = useState<SecurityProfileItem[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<
    SecurityPermissionItem[]
  >([]);
  const [baseAssignments, setBaseAssignments] = useState<AssignmentMap>({});
  const [draftAssignments, setDraftAssignments] = useState<AssignmentMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingByProfile, setIsSavingByProfile] = useState<Record<number, boolean>>(
    {},
  );
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadData() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const bootstrap = await getSecurityPermissionsBootstrap(accessToken);
      const sortedProfiles = [...bootstrap.profiles].sort(
        (left, right) => left.perfilId - right.perfilId,
      );
      const sortedPermissions = [...bootstrap.permissions].sort((left, right) => {
        const byModule = left.modulo.localeCompare(right.modulo);
        if (byModule !== 0) {
          return byModule;
        }
        return left.codigo.localeCompare(right.codigo);
      });

      const assignmentsMap = toAssignmentMap(
        sortedProfiles,
        bootstrap.assignments.map((item) => ({
          perfilId: item.perfilId,
          permissions: item.permissions,
        })),
      );

      setProfiles(sortedProfiles);
      setPermissionsCatalog(sortedPermissions);
      setBaseAssignments(assignmentsMap);
      setDraftAssignments(assignmentsMap);
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar la matriz de permisos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const hasRows = profiles.length > 0 && permissionsCatalog.length > 0;

  const dirtyProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const base = baseAssignments[profile.perfilId] ?? [];
      const draft = draftAssignments[profile.perfilId] ?? [];
      return !arePermissionsEqual(base, draft);
    });
  }, [baseAssignments, draftAssignments, profiles]);

  function togglePermission(perfilId: number, permission: Permission) {
    setDraftAssignments((previous) => {
      const current = previous[perfilId] ?? [];
      const hasPermission = current.includes(permission);
      const next = hasPermission
        ? current.filter((item) => item !== permission)
        : [...current, permission];

      return {
        ...previous,
        [perfilId]: sortPermissions(next),
      };
    });
    setSuccessMessage('');
  }

  async function saveProfile(perfilId: number) {
    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }

    const permissions = draftAssignments[perfilId] ?? [];
    setIsSavingByProfile((previous) => ({ ...previous, [perfilId]: true }));
    setError('');
    setSuccessMessage('');

    try {
      await updateProfilePermissions(accessToken, perfilId, permissions);
      setBaseAssignments((previous) => ({
        ...previous,
        [perfilId]: permissions,
      }));
      setSuccessMessage(`Permisos actualizados para perfil #${perfilId}`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar permisos del perfil';
      setError(message);
    } finally {
      setIsSavingByProfile((previous) => ({ ...previous, [perfilId]: false }));
    }
  }

  async function saveAll() {
    for (const profile of dirtyProfiles) {
      // Evita disparar guardados en paralelo para mantener feedback predecible.
      // eslint-disable-next-line no-await-in-loop
      await saveProfile(profile.perfilId);
    }
  }

  return (
    <section className="permissions-page">
      <header className="permissions-page-header">
        <div>
          <h1>Gestion de Permisos por Perfil</h1>
          <p>
            Matriz global de permisos (perfil x accion). Solo usuarios con
            `security.manage` pueden editar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={dirtyProfiles.length === 0 || Object.values(isSavingByProfile).some(Boolean)}
        >
          Guardar cambios ({dirtyProfiles.length})
        </button>
      </header>

      {error && <p className="permissions-page-error">{error}</p>}
      {successMessage && <p className="permissions-page-success">{successMessage}</p>}

      {isLoading ? (
        <article className="permissions-page-card">
          <p>Cargando matriz de permisos...</p>
        </article>
      ) : !hasRows ? (
        <article className="permissions-page-card">
          <p>No hay perfiles o permisos cargados.</p>
        </article>
      ) : (
        <article className="permissions-page-card">
          <div className="permissions-page-table-container">
            <table className="permissions-page-table">
              <thead>
                <tr>
                  <th>Perfil</th>
                  <th>Portal</th>
                  <th>Rol</th>
                  {permissionsCatalog.map((permission) => (
                    <th key={permission.codigo} title={permission.nombre}>
                      {permission.codigo}
                    </th>
                  ))}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const base = baseAssignments[profile.perfilId] ?? [];
                  const draft = draftAssignments[profile.perfilId] ?? [];
                  const isDirty = !arePermissionsEqual(base, draft);
                  const isSaving = Boolean(isSavingByProfile[profile.perfilId]);

                  return (
                    <tr key={profile.perfilId}>
                      <td>
                        <strong>#{profile.perfilId}</strong> {profile.nombre}
                      </td>
                      <td>{profile.portal ?? '-'}</td>
                      <td>{profile.role ?? '-'}</td>
                      {permissionsCatalog.map((permission) => (
                        <td key={`${profile.perfilId}-${permission.codigo}`}>
                          <input
                            type="checkbox"
                            checked={draft.includes(permission.codigo)}
                            onChange={() =>
                              togglePermission(profile.perfilId, permission.codigo)
                            }
                            disabled={isSaving}
                            aria-label={`${profile.nombre} - ${permission.codigo}`}
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          onClick={() => void saveProfile(profile.perfilId)}
                          disabled={!isDirty || isSaving}
                        >
                          {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
}
