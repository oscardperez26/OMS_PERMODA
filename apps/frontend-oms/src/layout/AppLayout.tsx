import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './panel/Sidebar/Sidebar';
import { useAuth } from '../auth/AuthContext';
import '../../styles/layout.css';

/**
 * AppLayout
 * ---------
 * Layout base del panel admin.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/panel/login');
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <div className="link-gestor-tiendas">
          <button
            className="btn-gestor-tiendas"
            onClick={() => {
              window.location.href = '/tienda/orders';
            }}
          >
            Tienda
          </button>
          <button onClick={handleLogout}>Salir</button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
