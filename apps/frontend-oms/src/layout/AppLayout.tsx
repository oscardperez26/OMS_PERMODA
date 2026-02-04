import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './panel/Sidebar/Sidebar';
import '../../styles/layout.css'; 

/**
 * AppLayout
 * ---------
 * Base del panel:
 * - Sidebar fijo
 * - Contenido cambia por ruta (Outlet)
 */
export function AppLayout() {
  const navigate = useNavigate();

function logout() {
  localStorage.removeItem("role");
  navigate("/panel/login");
}

// botón donde quieras
<button onClick={logout}>Salir</button>
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <div className="link-gestor-tiendas"> 
          <button className="btn-gestor-tiendas" onClick={() => {
            window.location.href = '/tienda/orders';
          }}>
            Tienda
          </button>
<button onClick={logout}>Salir</button>
        </div>
      <Outlet />
      </main>
    </div>
  );
}
