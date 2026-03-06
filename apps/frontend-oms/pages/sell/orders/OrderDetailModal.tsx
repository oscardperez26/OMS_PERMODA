import { ROUTES } from "../../../src/routes/routes";
import type { OrderRow } from "./OrdersTable";

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
    <div
      className="d-flex align-items-center justify-content-center"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        padding: '24px'
      }}
    >
      <div
        className="koaj-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 0,
          minHeight: 'auto',
          width: '100%',
          maxWidth: '850px',
          padding: '40px',
          borderRadius: 'var(--koaj-radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        {/* Header - Styled like mockup text */}
        <div className="text-center mb-4">
          <h2 style={{ color: 'var(--koaj-text-main)', fontWeight: 700, fontSize: '1.5rem', marginBottom: '8px' }}>
            Información de Pedido #{order.id}
          </h2>
          <p className="text-muted small m-0 fw-medium">
            ¿Deseas gestionar los detalles de esta orden?
          </p>
        </div>

        {/* Body - Order Information */}
        <div className="mb-4" style={{ maxHeight: '50vh', overflowY: 'auto', overflowX: 'hidden' }}>
          {!d ? (
            <div className="text-center text-muted p-4">
              Detalle no disponible todavía. (Pendiente de API)
            </div>
          ) : (
            <div className="row g-4">
              {/* Columna 1: Envío */}
              <div className="col-md-4">
                <div className="koaj-label" style={{ fontSize: '0.85rem' }}>🚚 Transporte</div>
                <div className="small text-muted mb-1">
                  <b>Carrier:</b> {d.shippingCarrier}
                </div>
                <div className="small text-muted mb-3">
                  <b>Tracking:</b> {d.trackingNumber || "-"}
                </div>

                <div className="koaj-label" style={{ fontSize: '0.85rem' }}>📦 Envío</div>
                <pre className="small text-muted" style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
                  {d.shippingAddress}
                </pre>
              </div>

              {/* Columna 2: Factura */}
              <div className="col-md-4">
                <div className="koaj-label" style={{ fontSize: '0.85rem' }}>✉️ Contacto</div>
                <div className="small text-muted mb-3">{d.billingEmail}</div>

                <div className="koaj-label" style={{ fontSize: '0.85rem' }}>🧾 Facturación</div>
                <div className="small text-muted mb-1">{d.billingName}</div>
                <pre className="small text-muted" style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
                  {d.billingAddress}
                </pre>
              </div>

              {/* Columna 3: Productos */}
              <div className="col-md-4">
                <div className="koaj-label" style={{ fontSize: '0.85rem' }}>🛍️ Productos ({d.items.length})</div>

                <div className="d-flex flex-column gap-2">
                  {d.items.slice(0, 4).map((it, idx) => (
                    <div key={idx} className="p-2 border rounded" style={{ borderColor: 'var(--koaj-border-color)' }}>
                      <div className="small fw-bold text-dark text-truncate">{it.name}</div>
                      <div className="d-flex justify-content-between mt-1">
                        <span className="small text-muted">Cant: {it.quantity}</span>
                        <span className="small fw-semibold text-primary">{it.total}</span>
                      </div>
                    </div>
                  ))}
                  {d.items.length > 4 && (
                    <div className="small text-muted text-center pt-2">
                      ...y {d.items.length - 4} más
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Styled like mockup buttons */}
        <div className="d-flex justify-content-center gap-3 mt-2">
          <button
            className="btn-koaj-primary"
            style={{ width: '160px', padding: '10px 0', fontSize: '1rem', fontWeight: 600 }}
            onClick={() => navigate(`${ROUTES.SELL_ORDERS}/${order.id}`)}
          >
            Más detalle
          </button>
          <button
            className="btn-koaj-outline"
            style={{ width: '160px', padding: '10px 0', fontSize: '1rem', fontWeight: 600 }}
            onClick={onClose}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
