import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../src/auth/useAuth";
import { getOrderDetail } from "../../src/orders/orders.api";
import {
  mapOrderDetailToStoreVm,
  type StoreOrderDetailVm,
} from "./storeOrdersAdapter";

function badgeColor(statusLabel: string) {
  switch (statusLabel) {
    case "Confirmado":
    case "Asignado":
      return { bg: "#bbf7d0", color: "#166534" };
    case "Despachado":
    case "Preparacion en curso":
      return { bg: "#bfdbfe", color: "#1e3a8a" };
    case "Entregado":
      return { bg: "#d1d5db", color: "#374151" };
    case "Cancelado":
    case "Novedad ICG":
    case "Con novedad":
      return { bg: "#fee2e2", color: "#991b1b" };
    default:
      return { bg: "#f1f5f9", color: "#475569" };
  }
}

function formatTotal(value: number): string {
  return Number(value || 0).toFixed(2);
}

export function StoreOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading, user } = useAuth();

  const parsedOrderId = useMemo(() => {
    const value = Number(orderId);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [orderId]);

  const [order, setOrder] = useState<StoreOrderDetailVm | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    async function loadOrder() {
      if (!parsedOrderId) {
        setLoadError("Id de pedido invalido");
        setOrder(null);
        setIsLoadingOrder(false);
        return;
      }
      if (!accessToken) {
        setLoadError("Sesion no disponible");
        setOrder(null);
        setIsLoadingOrder(false);
        return;
      }

      setIsLoadingOrder(true);
      setLoadError("");
      try {
        const detail = await getOrderDetail(accessToken, parsedOrderId);
        setOrder(mapOrderDetailToStoreVm(detail, user?.storeId));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `No se pudo cargar el pedido ${parsedOrderId}`;
        setLoadError(message);
        setOrder(null);
      } finally {
        setIsLoadingOrder(false);
      }
    }

    void loadOrder();
  }, [accessToken, isAuthLoading, parsedOrderId, user?.storeId]);

  if (isLoadingOrder) {
    return (
      <div className="p-5 text-center">
        <h2 className="mb-4">Cargando pedido...</h2>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-5 text-center">
        <h2 className="mb-3">No fue posible abrir el pedido #{orderId}</h2>
        <p className="text-muted mb-4">{loadError}</p>
        <button className="btn-koaj-outline" onClick={() => navigate("/tienda/orders")}>
          Volver al listado
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-5 text-center">
        <h2 className="mb-4">Pedido #{orderId} no encontrado</h2>
        <button className="btn-koaj-outline" onClick={() => navigate("/tienda/orders")}>
          Volver al listado
        </button>
      </div>
    );
  }

  const selectedStatus = order.statusLabel;
  const currentStatusStyle = badgeColor(selectedStatus);

  return (
    <div className="w-100 pb-5">
      <div className="alert alert-warning py-2 px-3 small mb-3">
        {order.integrationWarnings.join(" ")}
      </div>

      <div
        className="koaj-container p-3 mb-3 border d-flex align-items-center justify-content-between flex-wrap gap-2"
        style={{
          boxShadow: "none",
          borderColor: "var(--koaj-border-light)",
          minHeight: "auto",
          margin: "0 0 16px 0",
        }}
      >
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <button className="btn p-0 text-primary" onClick={() => navigate("/tienda/orders")}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="fw-bold text-dark small">Asign. {order.assignment}</span>
          <span className="fw-bold text-dark small">ID {order.orderId}</span>
          <span className="fw-bold text-dark small">Ref #{order.reference}</span>
          <span className="text-muted small">Origen : {order.originLabel}</span>
          <span className="text-muted small">Servicio: {order.service}</span>
          <div className="d-flex align-items-center gap-1">
            <i className="bi bi-shop text-muted"></i>
            <span className="small text-muted">{order.storeNumber}</span>
          </div>
          <span
            className="badge small px-3 py-1"
            style={{ backgroundColor: currentStatusStyle.bg, color: currentStatusStyle.color }}
          >
            {selectedStatus}
          </span>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-warning btn-sm fw-bold px-3 py-2"
            style={{ backgroundColor: "#fbbf24", border: "none", color: "black" }}
          >
            Comprobar incidencias
          </button>
          <button
            className="btn btn-primary btn-sm fw-bold px-3 py-2"
            style={{ backgroundColor: "#1d4ed8", border: "none" }}
          >
            <i className="bi bi-printer me-2"></i>Imprimir busqueda
          </button>
          <button
            className="btn btn-primary btn-sm fw-bold px-3 py-2"
            style={{ backgroundColor: "#1d4ed8", border: "none" }}
            onClick={() => window.open(`/tienda/orders/${order.orderId}/ticket`, "_blank")}
          >
            <i className="bi bi-printer me-2"></i>Imprimir ticket
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div
            className="koaj-container p-0 border mb-3"
            style={{
              boxShadow: "none",
              borderColor: "var(--koaj-border-light)",
              minHeight: "auto",
              margin: "0",
            }}
          >
            <div className="px-3 py-2 border-bottom">
              <h6 className="m-0 fw-bold text-muted small">Detalles de producto</h6>
            </div>
            <div className="p-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="d-flex gap-4 align-items-start border-bottom pb-4 mb-4 last-child-no-border"
                >
                  <div className="position-relative">
                    <input type="checkbox" className="position-absolute top-0 start-0 m-2" />
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: "120px", height: "160px", objectFit: "cover" }}
                      className="rounded border"
                    />
                  </div>
                  <div className="flex-grow-1">
                    <h5 className="fw-bold text-dark">{item.name}</h5>
                    <div className="small text-muted mb-1">color: {item.color}</div>
                    <div className="small text-muted mb-1">talla: {item.size}</div>
                    <div className="small text-muted mb-1">SKU: {item.sku}</div>
                    <div className="small text-muted mb-1">Referencia: {item.reference}</div>
                    <div className="small text-muted mb-1">Cantidad: 1</div>
                    <div className="fw-bold text-dark small mt-2">Envio normal</div>

                    <div className="mt-4 d-flex align-items-center gap-2">
                      <span className="small text-muted">Estado detalle:</span>
                      <span
                        className="badge px-3 py-1 rounded-pill fw-normal"
                        style={{ backgroundColor: "#ccfbf1", color: "#0f766e" }}
                      >
                        {selectedStatus}
                      </span>
                    </div>
                  </div>
                  <div className="align-self-end">
                    <button
                      className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                      style={{ backgroundColor: "#3b82f6", border: "none" }}
                    >
                      Acciones agrupadas <i className="bi bi-chevron-down"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <div
                className="koaj-container p-0 border"
                style={{
                  boxShadow: "none",
                  borderColor: "var(--koaj-border-light)",
                  minHeight: "auto",
                  margin: "0",
                }}
              >
                <div className="px-3 py-2 border-bottom">
                  <h6 className="m-0 fw-bold text-muted small">Estado de pedido</h6>
                </div>
                <div className="p-4">
                  <div className="vstack gap-4 position-relative">
                    <div className="position-absolute start-0 top-0 h-100 border-start border-2 border-light ms-3 z-0"></div>

                    {order.history.map((step, index) => (
                      <div
                        key={`${step.status}-${step.date}-${index}`}
                        className="d-flex gap-3 align-items-center z-1"
                      >
                        <div
                          className="rounded-circle bg-info d-flex align-items-center justify-content-center text-white"
                          style={{ width: "32px", height: "32px" }}
                        >
                          <i className="bi bi-shop small"></i>
                        </div>
                        <div>
                          <span className="fw-bold text-dark small d-block">
                            {step.status} - {step.date}
                          </span>
                        </div>
                      </div>
                    ))}

                    {[
                      "Listo para generar guia",
                      "Envio Disponible",
                      "Despachado",
                      "Entregado",
                    ].map((step, idx) => (
                      <div key={idx} className="d-flex gap-3 align-items-center z-1">
                        <div
                          className="rounded-circle border border-2 border-light bg-white d-flex align-items-center justify-content-center text-muted"
                          style={{
                            width: "32px",
                            height: "32px",
                            backgroundColor: "#f9fafb",
                          }}
                        >
                          <i className="bi bi-check opacity-25"></i>
                        </div>
                        <div>
                          <span className="text-muted small fw-bold">{step}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div
                className="koaj-container p-0 border mb-3"
                style={{
                  boxShadow: "none",
                  borderColor: "var(--koaj-border-light)",
                  minHeight: "auto",
                  margin: "0",
                }}
              >
                <div className="px-3 py-2 border-bottom">
                  <h6 className="m-0 fw-bold text-muted small">Datos facturacion</h6>
                </div>
                <div className="p-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="small text-dark fw-medium">Pedido POS</span>
                    <span className="small text-muted">Pendiente por integrar</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="small text-dark fw-medium">Factura</span>
                    <span className="small text-muted">{order.invoiceNumber}</span>
                  </div>
                </div>
              </div>

              <div
                className="koaj-container p-0 border"
                style={{
                  boxShadow: "none",
                  borderColor: "var(--koaj-border-light)",
                  minHeight: "auto",
                  margin: "0",
                }}
              >
                <div className="px-3 py-2 border-bottom">
                  <h6 className="m-0 fw-bold text-muted small">Resumen de pedido</h6>
                </div>
                <div className="p-3">
                  <div className="mb-3">
                    <div className="fw-bold text-dark small mb-1">{order.items[0]?.name}</div>
                    <div className="text-muted small">SKU: {order.items[0]?.sku}</div>
                    <div className="text-muted small">
                      Precio venta: {formatTotal(order.items[0]?.price ?? 0)}
                    </div>
                  </div>
                  <div className="border-top pt-2">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="small text-dark fw-medium">Sub total:</span>
                      <span className="small text-dark">{formatTotal(order.subtotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="small text-dark fw-medium">Gastos de envio:</span>
                      <span className="small text-dark">{formatTotal(order.shippingCost)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="small text-dark fw-medium">Impuestos:</span>
                      <span className="small text-dark">{formatTotal(order.taxes)}</span>
                    </div>
                    <div className="d-flex justify-content-between fw-bold h6 mt-3 pt-2 border-top text-dark">
                      <span>Total(COP)</span>
                      <span>{formatTotal(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div
            className="koaj-container p-3 border mb-3"
            style={{
              boxShadow: "none",
              borderColor: "var(--koaj-border-light)",
              minHeight: "auto",
              margin: "0",
            }}
          >
            <div className="fw-bold text-dark mb-1 small">{order.customer}</div>
            <div className="text-muted small">{order.address}</div>
            <div className="text-muted small">{order.city}</div>
            <div className="text-muted small">{order.phone}</div>
            <div className="text-muted small">{order.email}</div>
          </div>

          <div
            className="koaj-container p-0 border mb-3"
            style={{
              boxShadow: "none",
              borderColor: "var(--koaj-border-light)",
              minHeight: "auto",
              margin: "0",
            }}
          >
            <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="m-0 fw-bold text-muted small d-flex align-items-center gap-2">
                <i className="bi bi-truck"></i> Detalles logisticos
              </h6>
              <button
                className="btn btn-warning btn-sm fw-bold px-3 py-1"
                style={{
                  backgroundColor: "#fbbf24",
                  border: "none",
                  fontSize: "0.7rem",
                  color: "black",
                }}
              >
                Modificar transportista
              </button>
            </div>
            <div className="p-4 text-center">
              <i className="bi bi-truck fs-1 text-muted opacity-25 block mb-2"></i>
              <div className="fw-bold text-dark small text-uppercase mt-2">
                {order.logisticDetails.provider}
              </div>
              <div className="text-muted small">{order.logisticDetails.logisticStatus}</div>
            </div>
          </div>

          <div
            className="koaj-container p-0 border mb-3"
            style={{
              boxShadow: "none",
              borderColor: "var(--koaj-border-light)",
              minHeight: "auto",
              margin: "0",
            }}
          >
            <div className="px-3 py-2 border-bottom">
              <h6 className="m-0 fw-bold text-muted small">Observaciones</h6>
            </div>
            <div className="p-3">
              <span className="text-muted small">No hay observaciones</span>
            </div>
          </div>

          <div
            className="koaj-container p-0 border mb-3"
            style={{
              boxShadow: "none",
              borderColor: "var(--koaj-border-light)",
              minHeight: "auto",
              margin: "0",
            }}
          >
            <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="m-0 fw-bold text-muted small d-flex align-items-center gap-2">
                <i className="bi bi-geo-alt"></i> Direccion de transporte
              </h6>
              <button
                className="btn btn-primary btn-sm fw-bold px-3 py-1"
                style={{ backgroundColor: "#3b82f6", border: "none", fontSize: "0.7rem" }}
              >
                <i className="bi bi-pencil me-1"></i> Modificar
              </button>
            </div>
            <div className="p-3">
              <div className="fw-bold text-dark mb-1 small">{order.customer}</div>
              <div className="text-muted small">DNI: {order.customerId}</div>
              <div className="text-muted small">{order.address}</div>
              <div className="text-muted small">{order.city}</div>
              <div className="text-muted small">{order.phone}</div>
              <div className="text-muted small">{order.email}</div>
            </div>
          </div>

          <div
            className="koaj-container p-0 border mb-3"
            style={{
              boxShadow: "none",
              borderColor: "var(--koaj-border-light)",
              minHeight: "auto",
              margin: "0",
            }}
          >
            <div className="px-3 py-2 border-bottom">
              <h6 className="m-0 fw-bold text-muted small d-flex align-items-center gap-2">
                <i className="bi bi-credit-card"></i> Informacion de pago
              </h6>
            </div>
            <div className="p-3">
              <div className="mb-2">
                <div className="text-dark small fw-medium">Id. de transaccion:</div>
                <div className="text-muted small">{order.transactionId}</div>
              </div>
              <div className="mb-2">
                <div className="text-dark small fw-medium">Metodo de pago:</div>
                <div className="text-muted small">{order.paymentMethod}</div>
              </div>
              <div>
                <div className="text-dark small fw-medium">Total del pago:</div>
                <div className="text-muted small">{formatTotal(order.total)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
