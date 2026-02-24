import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import './store-layout.css';

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

        <img
          src="https://panelpedidos.dev.koaj.co/img/logo-1730883911.jpg"
          alt="Koaj"
          height="70px"
        />

        <nav className="navbar" style={{ display: "flex" }}>
          <ul className="nav">
            <li className="nav-item">
              <a className="nav-link" href="" style={{ color: '#F527EE' }}>
                ADMIN
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="" style={{ color: '#000fdd' }}>
                GESTOR
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="" style={{ color: '#128808' }}>
                LINEAS PENDIENTES
              </a>
            </li>
          </ul>

          <div className="UserContentBox" style={{ display: "flex", gap: "20px" }}>
            <div className="UserInfo" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span>USUARIO</span>
              <span>Todas las tiendas</span>
              <span>(TIENDA)</span>
            </div>

            <div className="d-flex">
              <button onClick={handleLogout}>
                <i className="bi bi-box-arrow-right"></i> Salir
              </button>
            </div>
          </div>
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