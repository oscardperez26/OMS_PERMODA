import { Link } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import type { Permission } from '../../src/auth/auth.types';
import { ROUTES } from '../../src/routes/routes';
import './ModuleParentPage.css';

type ModuleCard = {
  id: string;
  title: string;
  description: string;
  path: string;
  permission: Permission;
};

export function ComercialPage() {
  const { hasPermissions } = useAuth();

  const cards: ModuleCard[] = [
    {
      id: 'store-params',
      title: 'Store Params',
      description: 'Branding por franquicia para panel y portal tienda.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_COMERCIAL_STORE_PARAMS,
      permission: 'config.read',
    },
    {
      id: 'empresa-cliente',
      title: 'Empresa Cliente',
      description: 'Administra franquicias y su informacion comercial.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_EMPRESA_CLIENTE,
      permission: 'config.read',
    },
    {
      id: 'tiendas',
      title: 'Tiendas',
      description: 'Gestiona tiendas por empresa y asignacion de franquicia.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TIENDA,
      permission: 'config.read',
    },
    {
      id: 'bodegas',
      title: 'Bodegas',
      description: 'Administra bodegas operativas asociadas a tiendas.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_BODEGA,
      permission: 'config.read',
    },
  ];

  return (
    <section className="module-parent-page">
      <header className="module-parent-header">
        <h1>Comercial / Franquicias</h1>
        <p>Modulo padre para branding, franquicias y estructura comercial.</p>
      </header>

      <div className="module-parent-grid">
        {cards.map((card) => {
          const canOpen = hasPermissions([card.permission]);

          return (
            <article
              key={card.id}
              className={`module-parent-card ${canOpen ? '' : 'is-disabled'}`.trim()}
            >
              <div className="module-parent-card-header">
                <h2>{card.title}</h2>
                <span className={`module-parent-status ${canOpen ? 'ok' : 'blocked'}`}>
                  {canOpen ? 'Disponible' : 'Sin permiso'}
                </span>
              </div>
              <p>{card.description}</p>
              {canOpen ? (
                <Link to={card.path} className="module-parent-link">
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
