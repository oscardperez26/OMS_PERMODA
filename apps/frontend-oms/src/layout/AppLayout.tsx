import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './panel/Sidebar/Sidebar';
import { useAuth } from '../auth/useAuth';


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
    <div className="koaj-app-shell">
      <Sidebar />
      <div className="koaj-main-area">
        {/* Header */}
        <header className="koaj-topbar">
          <h1 className="koaj-topbar-logo">KOAJ</h1>

          <div className="koaj-topbar-actions gap-3">
            <button
              className="btn-koaj-outline"
              onClick={() => {
                window.location.href = '/tienda/orders';
              }}
            >
              <i className="bi bi-shop"></i> Ir a Tienda
            </button>
            <button className="btn-koaj-outline" title="Cerrar sesión" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Salir
            </button>
          </div>
        </header>

        <main className="koaj-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
