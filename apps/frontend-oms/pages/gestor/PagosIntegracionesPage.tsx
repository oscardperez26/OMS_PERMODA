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

export function PagosIntegracionesPage() {
  const { hasPermissions } = useAuth();

  const cards: ModuleCard[] = [
    {
      id: 'pasarela-pago',
      title: 'Pasarelas de Pago',
      description: 'Configura pasarelas de pago por empresa y su estado.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PASARELA_PAGO,
      permission: 'config.read',
      enabled: true,
    },
    {
      id: 'integraciones',
      title: 'Integraciones',
      description: 'Conectores externos para recibir pedidos confirmados.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_INTEGRACIONES_ENTRANTES,
      permission: 'config.read',
      enabled: true,
    },
    {
      id: 'zi-sync',
      title: 'Sincronizacion ZI',
      description:
        'Ejecucion one-click de sincronizacion ZI (full, categorias y producto).',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZI_SYNC,
      permission: 'config.read',
      enabled: true,
    },
  ];

  return (
    <section className="module-parent-page">
      <header className="module-parent-header">
        <h1>Pagos e Integraciones</h1>
        <p>Modulo padre para servicios de pago e integraciones externas.</p>
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
