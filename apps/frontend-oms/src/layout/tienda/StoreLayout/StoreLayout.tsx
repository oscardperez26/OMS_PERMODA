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

        <img src="https://panelpedidos.dev.koaj.co/img/logo-1730883911.jpg" alt="Koaj" height="70px" />

        <nav className="navbar" style={{display:"flex"}}>
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
          <div className="UserContentBox" style={{display:"flex", gap:"20px"}}>
            <div className="UserInfo" style={{display:"flex", flexDirection:"column", gap:"1px"}}>
              <span>USUARIO</span>
              <span>Todas las tiendas</span>
              <span>(TIENDA)</span>
            </div>
            <div className="d-flex">
              <button onClick={logout}><i className="bi bi-box-arrow-right"></i>Salir</button>
            </div>
          </div>
        </nav>
        
      </header>

      <main className="store-content">
        <Outlet />
      </main>
    </div>
  );
}
