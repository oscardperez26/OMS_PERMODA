import { Link } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import type { Permission } from '../../src/auth/auth.types';
import { ROUTES } from '../../src/routes/routes';
import './ModuleParentPage.css';

type ModuleCard = {
  id: string;
  title: string;
  description: string;
  path?: string;
  permission: Permission;
  enabled: boolean;
};

export function SeguridadAccesosPage() {
  const { hasPermissions } = useAuth();

  const cards: ModuleCard[] = [
    {
      id: 'profiles',
      title: 'Gestion de Perfiles',
      description: 'Administra usuarios, perfiles y alcance operativo.',
      path: ROUTES.ORDER_MANAGER_PROFILES,
      permission: 'users.manage',
      enabled: true,
    },
    {
      id: 'permissions',
      title: 'Gestion de Permisos',
      description: 'Matriz de permisos por perfil para control RBAC.',
      path: ROUTES.ORDER_MANAGER_PERMISSIONS,
      permission: 'security.manage',
      enabled: true,
    },
    {
      id: 'employees',
      title: 'Gestion de Empleados',
      description: 'Alta y mantenimiento de usuarios empleados (proximamente).',
      permission: 'users.manage',
      enabled: false,
    },
    {
      id: 'employee-access',
      title: 'Acceso de Empleados',
      description: 'Asignacion detallada de acceso por modulo (proximamente).',
      permission: 'users.manage',
      enabled: false,
    },
  ];

  return (
    <section className="module-parent-page">
      <header className="module-parent-header">
        <h1>Seguridad y Accesos</h1>
        <p>Modulo padre para perfiles, permisos y gobierno de acceso.</p>
      </header>

      <div className="module-parent-grid">
        {cards.map((card) => {
          const hasAccess = hasPermissions([card.permission]);
          const canOpen = card.enabled && hasAccess && Boolean(card.path);

          return (
            <article
              key={card.id}
              className={`module-parent-card ${canOpen ? '' : 'is-disabled'}`.trim()}
            >
              <div className="module-parent-card-header">
                <h2>{card.title}</h2>
                <span
                  className={`module-parent-status ${
                    canOpen ? 'ok' : hasAccess ? 'warn' : 'blocked'
                  }`}
                >
                  {canOpen ? 'Disponible' : hasAccess ? 'Proximamente' : 'Sin permiso'}
                </span>
              </div>
              <p>{card.description}</p>
              {canOpen ? (
                <Link to={card.path ?? ''} className="module-parent-link">
                  Abrir
                </Link>
              ) : (
                <span className="module-parent-link disabled">No disponible</span>
              )}
            </article>
          );
        })}
      </div>

      <Link to={ROUTES.ORDER_MANAGER_GENERAL_CONFIG} className="transportadora-back-link">
        Volver a Configuracion General
      </Link>
    </section>
  );
}
