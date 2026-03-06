import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "../../../src/routes/routes";
import { MOCK_ORDERS } from "./orders.mock";

function badgeColor(status: string) {
  switch (status) {
    case "Asignado":
      return { bg: "#bbf7d0", color: "#166534" };
    case "Preparación en curso":
      return { bg: "#bfdbfe", color: "#1e3a8a" };
    case "Con novedad":
      return { bg: "#fca5a5", color: "#7f1d1d" };
    case "Cancelado":
      return { bg: "#e5e7eb", color: "#374151" };
    case "Entregado":
      return { bg: "#d1d5db", color: "#374151" };
    case "En espera de pago por transferencia bancaria":
      return { bg: "#fef08a", color: "#854d0e" };
    case "En espera de validación por contra reembolso":
      return { bg: "#fef08a", color: "#854d0e" };
    default:
      return { bg: "#bbf7d0", color: "#166534" };
  }
}

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Buscar el pedido real en el mock
  const order = useMemo(() => MOCK_ORDERS.find(o => o.id === id), [id]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(order?.status || "Asignado");

  const statusStyle = badgeColor(selectedStatus);

  if (!order) {
    return (
      <div className="p-5 text-center">
        <h2 className="mb-4">Pedido #{id} no encontrado</h2>
        <button className="btn-koaj-outline" onClick={() => navigate(ROUTES.SELL_ORDERS)}>
          Volver al listado
        </button>
      </div>
    );
  }

  const d = order.detail;
  const dateSplit = order.date.split(' ');
  const orderDate = dateSplit[0];
  const orderTime = dateSplit[1] || "";

  return (
    <div className="w-100 pb-5">
      <div className="d-flex align-items-center mb-2">
        <span className="text-muted small">Pedidos</span>
      </div>

      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-4" style={{ borderColor: 'var(--koaj-border-light)' }}>
        <div className="d-flex align-items-center flex-wrap gap-2">
          <h2 className="m-0 text-dark fw-bold d-flex align-items-center gap-2">
            #{order.id} {order.reference} <span className="fw-normal text-muted fs-5">de {order.customer}</span>
          </h2>
          <span className="badge bg-dark fs-6 px-3 py-2 ms-2">{order.total}</span>
          <span className="text-muted ms-2">{orderDate} en {orderTime}</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-koaj-outline" style={{ backgroundColor: '#6c8693', color: 'white', border: 'none' }}>
            <i className="bi bi-puzzle-fill me-2"></i>Aumentar ventas
          </button>
          <button className="btn-koaj-outline">Ayuda</button>
        </div>
      </div>

      {/* TOOLBAR SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded" style={{ backgroundColor: '#f1f5f9', border: '1px solid var(--koaj-border-light)' }}>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div className="position-relative" style={{ width: '280px' }}>
            <div
              className="koaj-select fw-semibold d-flex justify-content-between align-items-center"
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
                border: `1px solid ${statusStyle.color}`,
                cursor: 'pointer',
                borderRadius: isDropdownOpen ? 'var(--koaj-radius-sm) var(--koaj-radius-sm) 0 0' : 'var(--koaj-radius-sm)'
              }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedStatus}</span>

            </div>

            {isDropdownOpen && (
              <div
                className="position-absolute start-0 w-100 bg-white shadow-lg overflow-hidden z-3"
                style={{
                  top: '100%',
                  border: '1px solid var(--koaj-border-color)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--koaj-radius-sm) var(--koaj-radius-sm)'
                }}
              >
                <div className="p-2 border-bottom">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Filtrar estados..."
                    style={{ borderRadius: 'var(--koaj-radius-sm)' }}
                  />
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="py-2">
                  {[
                    "Asignado",
                    "Cancelado",
                    "Con novedad",
                    "En espera de pago por transferencia bancaria",
                    "En espera de validación por contra reembolso",
                    "Entregado",
                    "Preparación en curso"
                  ].map((s) => (
                    <div
                      key={s}
                      className="px-3 py-2 small"
                      style={{ cursor: 'pointer', backgroundColor: selectedStatus === s ? '#f8fafc' : 'transparent', color: '#475569' }}
                      onClick={() => {
                        setSelectedStatus(s as any);
                        setIsDropdownOpen(false);
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = selectedStatus === s ? '#f8fafc' : 'transparent')}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="btn-koaj-outline" disabled style={{ backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', color: '#94a3b8' }}>
            Actualizar el estado
          </button>

          <button className="btn-koaj-outline bg-white">
            <i className="bi bi-printer-fill me-2 text-muted"></i>Imprimir pedido
          </button>

          <button className="btn-koaj-primary" style={{ backgroundColor: '#2dd4bf', borderColor: '#2dd4bf', color: 'white' }}>
            Pedidos a tienda
          </button>

          <button className="btn-koaj-outline bg-white">
            <i className="bi bi-arrow-left-right me-2 text-muted"></i>Reembolso parcial
          </button>
        </div>

        <div className="d-flex gap-2">
          <button className="btn-koaj-outline bg-white px-3" onClick={() => navigate(ROUTES.SELL_ORDERS)}>
            <i className="bi bi-arrow-left"></i>
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="row g-4">
        {/* LEFT COLUMN: CLIENTE */}
        <div className="col-lg-4">
          <div className="koaj-container p-4 mt-0 border" style={{ boxShadow: 'none', borderColor: 'var(--koaj-border-light)' }}>
            <h5 className="mb-4 fw-bold text-dark pb-3 border-bottom">Cliente</h5>

            <div className="d-flex align-items-start gap-3 mb-4 p-3 rounded" style={{ backgroundColor: '#f4f4f5' }}>
              <div className="bg-secondary bg-opacity-25 rounded p-2">
                <i className="bi bi-person-fill fs-4 text-dark"></i>
              </div>
              <div>
                <h5 className="fw-bold m-0 text-dark">
                  {order.customer}
                </h5>
                <a href="#" className="text-decoration-none small" style={{ color: '#0ea5e9' }}>Ver perfil</a>
                <div className="mt-2">
                  <span className="badge rounded-pill bg-white text-secondary border px-3 py-1 fw-normal">{order.delivery}</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <span className="fw-bold text-dark d-block">Email:</span>
              <span className="text-muted small">{d?.billingEmail || 'No disponible'}</span>
            </div>

            <div className="mb-3">
              <span className="fw-bold text-dark d-block">Método de pago:</span>
              <span className="text-muted small">{order.payment}</span>
            </div>

            <div className="mb-3">
              <span className="fw-bold text-dark d-block">Nuevo cliente:</span>
              <span className="text-muted small">{order.newCustomer}</span>
            </div>

            <div className="mb-3 pt-3 border-top">
              <span className="fw-bold text-dark d-block">Dirección de facturación:</span>
              <pre className="text-muted small mt-1" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {d?.billingAddress || 'No disponible'}
              </pre>
            </div>
          </div>

          <div className="koaj-container p-4 mt-4 border" style={{ boxShadow: 'none', borderColor: 'var(--koaj-border-light)' }}>
            <h5 className="mb-4 fw-bold text-dark pb-3 border-bottom">Envío</h5>
            <div className="mb-3">
              <span className="fw-bold text-dark d-block">Transportadora:</span>
              <span className="text-muted small">{d?.shippingCarrier || 'No disponible'}</span>
            </div>
            <div className="mb-3">
              <span className="fw-bold text-dark d-block">Seguimiento:</span>
              <span className="text-muted small">{d?.trackingNumber || '-'}</span>
            </div>
            <div className="mb-3">
              <span className="fw-bold text-dark d-block text-decoration-underline mb-2">Dirección:</span>
              <pre className="text-muted small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {d?.shippingAddress || 'No disponible'}
              </pre>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PRODUCTOS */}
        <div className="col-lg-8">
          <div className="koaj-container p-4 mt-0 border" style={{ boxShadow: 'none', borderColor: 'var(--koaj-border-light)' }}>
            <h5 className="mb-4 pb-3 fw-bold text-dark border-bottom">Productos ({d?.items.length || 0})</h5>

            <div className="table-responsive">
              <table className="koaj-table text-start w-100" style={{ border: 'none' }}>
                <thead style={{ backgroundColor: 'transparent' }}>
                  <tr>
                    <th className="text-dark bg-transparent pb-3" style={{ border: 'none', borderBottom: '2px solid #38bdf8', paddingLeft: 0 }}>Producto</th>
                    <th className="text-center bg-transparent pb-3" style={{ border: 'none', borderBottom: '2px solid #38bdf8', width: '130px' }}>
                      <div className="fw-bold text-dark">P. Unitario</div>
                    </th>
                    <th className="text-center bg-transparent pb-3" style={{ border: 'none', borderBottom: '2px solid #38bdf8', width: '90px' }}>
                      <div className="fw-bold text-dark">Cant.</div>
                    </th>
                    <th className="text-center bg-transparent pb-3" style={{ border: 'none', borderBottom: '2px solid #38bdf8', width: '130px' }}>
                      <div className="fw-bold text-dark">Total</div>
                    </th>
                    <th className="text-center bg-transparent pb-3 text-dark fw-bold" style={{ border: 'none', borderBottom: '2px solid #38bdf8', width: '80px', paddingRight: 0 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {d?.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-start py-4" style={{ border: 'none', borderBottom: '1px solid var(--koaj-border-light)', paddingLeft: 0 }}>
                        <div className="d-flex align-items-center gap-3">
                          <div className="bg-light d-flex align-items-center justify-content-center border" style={{ width: '45px', height: '60px', flexShrink: 0 }}>
                            <i className="bi bi-image text-muted"></i>
                          </div>
                          <div>
                            <span className="text-dark small fw-bold d-block mb-1">{item.name}</span>
                            <span className="small text-muted d-block" style={{ fontSize: '0.75rem' }}>Ref: {item.reference}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center align-middle" style={{ border: 'none', borderBottom: '1px solid var(--koaj-border-light)' }}>
                        <span className="text-dark fw-medium small">{item.total}</span>
                      </td>
                      <td className="text-center align-middle" style={{ border: 'none', borderBottom: '1px solid var(--koaj-border-light)' }}>
                        <span className="text-dark small">{item.quantity}</span>
                      </td>
                      <td className="text-center align-middle" style={{ border: 'none', borderBottom: '1px solid var(--koaj-border-light)' }}>
                        <span className="text-dark fw-bold small">{item.total}</span>
                      </td>
                      <td className="text-center align-middle" style={{ border: 'none', borderBottom: '1px solid var(--koaj-border-light)', paddingRight: 0 }}>
                        <div className="d-flex flex-column align-items-center gap-2">
                          <button className="btn p-0 text-muted" title="Editar"><i className="bi bi-pencil-fill"></i></button>
                          <button className="btn p-0 text-muted" title="Eliminar"><i className="bi bi-trash-fill"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!d || d.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">No hay productos en este pedido</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
