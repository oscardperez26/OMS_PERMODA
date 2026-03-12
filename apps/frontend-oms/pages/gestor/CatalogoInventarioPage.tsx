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

export function CatalogoInventarioPage() {
  const { hasPermissions } = useAuth();

  const cards: ModuleCard[] = [
    {
      id: 'producto',
      title: 'Productos',
      description: 'Catalogo base de productos para operacion comercial.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO,
      permission: 'config.read',
    },
    {
      id: 'producto-variante',
      title: 'Producto Variante',
      description: 'Variantes por talla/color, SKU y datos logisticos.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO_VARIANTE,
      permission: 'config.read',
    },
    {
      id: 'inventario',
      title: 'Inventario',
      description: 'Stock total, reservado y disponible por bodega.',
      path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_INVENTARIO,
      permission: 'config.read',
    },
  ];

  return (
    <section className="module-parent-page">
      <header className="module-parent-header">
        <h1>Catalogo e Inventario</h1>
        <p>Modulo padre para administrar datos de producto y disponibilidad.</p>
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
