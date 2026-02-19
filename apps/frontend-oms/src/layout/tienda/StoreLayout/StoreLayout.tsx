import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import './store-layout.css';

/**
 * StoreLayout
 * -----------
 * Layout para usuarios tipo tienda.
 */
export function StoreLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/tienda/login');
  }

  return (
    <div className="store-shell">
      <header className="store-header">
        <div className="store-brand">OMS - Tienda</div>

        <nav className="store-nav">
          <Link to="/tienda/orders">Pedidos</Link>
        </nav>

        <div>
          <button onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="store-content">
        <Outlet />
      </main>
    </div>
  );
}
