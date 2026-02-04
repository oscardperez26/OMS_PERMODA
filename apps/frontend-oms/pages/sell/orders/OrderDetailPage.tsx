import { Link, useParams } from "react-router-dom";
import "./OrderDetailPage.css";
import { ROUTES } from "../../../src/routes/routes";

/**
 * OrderDetailPage
 * ---------------
 * Página de detalle COMPLETO del pedido.
 *
 * Ruta:
 * - /sell/orders/:id
 *
 * Estado actual:
 * - Mock (sin API).
 *
 * Próximo:
 * - GET /orders/:id para traer todo el detalle real.
 */
export function OrderDetailPage() {
  const { id } = useParams();

  // TODO: aquí luego llamas al backend con ese id.
  // const order = await ordersService.getOrderDetail(id)

  return (
    <div className="odp-page">
      <div className="odp-topbar">
        <div>
          <h1 className="odp-title">Detalle del pedido</h1>
          <div className="odp-subtitle">Pedido #{id}</div>
        </div>

        <div className="odp-actions">
          <Link className="odp-back" to={ROUTES.SELL_ORDERS}>
            ← Volver a pedidos
          </Link>
        </div>
      </div>

      {/* CONTENIDO (por ahora mock visual) */}
      <div className="odp-grid">
        <section className="odp-card">
          <h3>Envío</h3>
          <p><b>Transportista:</b> Recogida en tienda</p>
          <p><b>Número de seguimiento:</b> -</p>
          <pre className="odp-pre">
Paula Tadino
Carrera 35 número 36-37
Apt. 601. Edificio Jan Lui
BUCARAMANGA
Colombia
          </pre>
        </section>

        <section className="odp-card">
          <h3>Factura</h3>
          <p><b>Email:</b> tadinopaula@gmail.com</p>
          <p><b>Nombre:</b> Paula Tadino</p>
          <pre className="odp-pre">
Carrera 35 número 36-37
Apt. 601. Edificio Jan Lui
BUCARAMANGA
Colombia
          </pre>
        </section>

        <section className="odp-card odp-products">
          <h3>Productos</h3>

          <table className="odp-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Referencia</th>
                <th className="right">Cantidad</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>☑ Camiseta gris interna con manga corta...</td>
                <td>105105691390-908</td>
                <td className="right">1</td>
                <td className="right">25.900,00 $</td>
              </tr>
              <tr>
                <td>☑ Camiseta crema clara con diseños de Snoopy...</td>
                <td>105105714478-910</td>
                <td className="right">1</td>
                <td className="right">25.900,00 $</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
