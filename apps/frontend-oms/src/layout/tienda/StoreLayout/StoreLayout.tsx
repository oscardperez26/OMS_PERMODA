import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/useAuth';
import { useBranding } from '../../../branding/useBranding';


export function StoreLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { branding } = useBranding();

  async function handleLogout() {
    await logout();
    navigate('/tienda/login');
  }

  return (
    <div className="koaj-app-shell">

      {/* ── MAIN AREA ── */}
      <div className="koaj-main-area">
        {/* Header */}
        <header className="koaj-topbar">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.displayName}
              className="koaj-topbar-logo-image"
            />
          ) : (
            <h1 className="koaj-topbar-logo">{branding.displayName || 'KOAJ'}</h1>
          )}

          <div className="koaj-topbar-actions gap-3">
            <button className="btn-koaj-outline" title="Panel" onClick={() => window.location.href = '/panel'}>
              <i className="bi bi-grid-1x2"></i> Ir al Panel
            </button>
            <button className="btn-koaj-outline" title="Cerrar sesión" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Salir
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="koaj-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 
