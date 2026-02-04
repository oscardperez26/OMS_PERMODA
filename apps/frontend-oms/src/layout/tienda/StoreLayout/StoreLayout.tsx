import { Link, Outlet, useNavigate } from "react-router-dom";
import "./store-layout.css";

/**
 * StoreLayout
 * -----------
 * Layout para usuarios tipo TIENDA.
 */
export function StoreLayout() {
  const navigate = useNavigate();

function logout() {
  localStorage.removeItem("role");
  navigate("/tienda/login");
}
  return (
    <div className="store-shell">
      <header className="store-header">
        <div className="store-brand">OMS • Tienda</div>

        <nav className="store-nav">
          <Link to="/tienda/orders">Pedidos</Link>
        </nav>

        <div>
          <button onClick={logout}>Salir</button>
        </div>
      </header>

      <main className="store-content">
        <Outlet />
      </main>
    </div>
  );
}
