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

export function ParametrosBasePage() {
  const { hasPermissions } = useAuth();

  const cards: ModuleCard[] = [
    {
      id: 'pais',
      title: 'Paises',
      description: 'Catalogo base de paises para ubicaciones y reglas globales.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PAIS,
      permission: 'config.read',
    },
    {
      id: 'ciudad',
      title: 'Ciudades',
      description: 'Gestion de ciudades asociadas a pais para operacion local.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_CIUDAD,
      permission: 'config.read',
    },
    {
      id: 'moneda',
      title: 'Monedas',
      description: 'Monedas disponibles para empresas, pedidos y costos.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_MONEDA,
      permission: 'config.read',
    },
  ];

  return (
    <section className="module-parent-page">
      <header className="module-parent-header">
        <h1>Parametros Base</h1>
        <p>Modulo padre para catalogos maestros base del sistema OMS.</p>
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
