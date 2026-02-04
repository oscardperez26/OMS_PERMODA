import { ROUTES } from "../../../src/routes/routes";
import type { OrderRow } from "./OrdersTable";
import "./order-detail-modal.css";
import { useNavigate } from "react-router-dom";




/**
 * OrderDetailModal
 * ----------------
 * Modal de consulta (solo lectura).
 * Layout igual al OMS anterior:
 * - Columna Envío
 * - Columna Factura
 * - Columna Productos (tabla)
 */
export function OrderDetailModal({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
}) {
  if (!open || !order) return null;

  const d = order.detail;
const navigate = useNavigate();
  return (
    <div className="odm-backdrop" onClick={onClose}>
      <div className="odm-panel odm-panel-wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="odm-header">
          <div>
            <div className="odm-title">Pedido #{order.id}</div>
            <div className="odm-subtitle">
              Ref: <b>{order.reference}</b> • Estado: <b>{order.status}</b> • Fecha: <b>{order.date}</b>
            </div>
          </div>

          <button className="odm-close" onClick={onClose} type="button" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="odm-body">
          {/* Si aún no hay detail, mostramos placeholder */}
          {!d ? (
            <div className="odm-muted">
              Detalle no disponible todavía. (Pendiente de API / data real)
            </div>
          ) : (
            <div className="odm-like-oms">
              {/* Columna 1: Envío */}
              <section className="odm-col">
                <div className="odm-block-title">🚚 Transportista</div>
                <div className="odm-line">
                  <b>Transportista:</b> {d.shippingCarrier}
                </div>
                <div className="odm-line">
                  <b>Número de seguimiento:</b> {d.trackingNumber || "-"}
                </div>

                <div className="odm-block-title odm-mt">📦 Detalles del envío</div>
                <pre className="odm-pre">{d.shippingAddress}</pre>
              </section>

              {/* Columna 2: Factura */}
              <section className="odm-col">
                <div className="odm-block-title">✉️ Email</div>
                <div className="odm-line">{d.billingEmail}</div>

                <div className="odm-block-title odm-mt">🧾 Detalles de la factura</div>
                <div className="odm-line">{d.billingName}</div>
                <pre className="odm-pre">{d.billingAddress}</pre>
              </section>

              {/* Columna 3: Productos */}
              <section className="odm-col odm-col-products">
                <div className="odm-products-head">
                  <div className="odm-block-title">Productos ({d.items.length})</div>
                </div>

                <table className="odm-products-table">
                  <thead>
                    <tr>
                      <th>Productos</th>
                      <th>Referencia</th>
                      <th className="right">Cantidad</th>
                      <th className="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.items.slice(0, 12).map((it, idx) => (
                      <tr key={idx}>
                        <td className="odm-product-name">☑ {it.name}</td>
                        <td>{it.reference}</td>
                        <td className="right">{it.quantity}</td>
                        <td className="right">{it.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {d.items.length > 12 && (
                  <div className="odm-more">… ({d.items.length - 12} más)</div>
                )}

                <div className="odm-products-actions">
                  <button className="odm-open-details" type="button" onClick={() => navigate(`${ROUTES.SELL_ORDERS}/${order.id}`)}>
                    Abrir detalles →
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Footer */}
          <div className="odm-footer">
            <button className="odm-primary" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
