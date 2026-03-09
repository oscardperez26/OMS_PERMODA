import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../src/auth/useAuth";
import { getOrderDetail } from "../../src/orders/orders.api";
import {
  mapOrderDetailToStoreVm,
  type StoreOrderDetailVm,
} from "./storeOrdersAdapter";

const PRINT_STYLES = `
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; }
    .ticket-wrapper {
      max-width: 100% !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
  }
`;

function formatCurrency(value: number): string {
  return Number(value || 0).toLocaleString("es-CO");
}

export function StoreOrderTicketPage() {
  const { orderId } = useParams<{ orderId: string }>();
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
    const styleTag = document.createElement("style");
    styleTag.id = "ticket-print-styles";
    styleTag.textContent = PRINT_STYLES;
    document.head.appendChild(styleTag);

    return () => {
      document.getElementById("ticket-print-styles")?.remove();
    };
  }, []);

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

  useEffect(() => {
    if (!order || loadError) {
      return;
    }

    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [order, loadError]);

  if (isLoadingOrder) {
    return (
      <div className="container p-4">
        <div className="alert alert-info">Cargando ticket...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container p-4">
        <div className="alert alert-warning">
          <strong>No se pudo generar ticket para pedido #{orderId}.</strong> {loadError}{" "}
          <Link to="/tienda/orders">{"<- Volver a la lista"}</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container p-4">
        <div className="alert alert-warning">
          <strong>Pedido #{orderId} no encontrado.</strong>{" "}
          <Link to="/tienda/orders">{"<- Volver a la lista"}</Link>
        </div>
      </div>
    );
  }

  const now = new Date().toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px" }}>
      <div className="no-print d-flex justify-content-center gap-3 mb-4">
        <button className="btn-koaj-primary px-4" onClick={() => window.print()}>
          <i className="bi bi-printer me-2" />
          Imprimir
        </button>
        <button
          className="btn-koaj-outline bg-white px-4"
          onClick={() => navigate("/tienda/orders")}
        >
          <i className="bi bi-arrow-left me-2" />
          Volver
        </button>
      </div>

      <div className="no-print alert alert-warning py-2 px-3 small mx-auto mb-3" style={{ maxWidth: "420px" }}>
        {order.integrationWarnings.join(" ")}
      </div>

      <div
        className="ticket-wrapper bg-white mx-auto p-4 shadow-sm"
        style={{ maxWidth: "420px", fontFamily: "monospace", fontSize: "13px" }}
      >
        <div className="text-center border-bottom pb-3 mb-3">
          <div className="fw-bold fs-5">PERMODA LTDA</div>
          <div className="text-muted small">KOAJ - Factura de venta</div>
          <div className="text-muted small">NIT 800.000.000-0</div>
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="d-flex justify-content-between">
            <span className="text-muted">Asignacion:</span>
            <span className="fw-bold">{order.assignment}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">ID Pedido:</span>
            <span className="fw-bold">#{order.orderId}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Referencia:</span>
            <span>{order.reference}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Fecha pedido:</span>
            <span>{order.date}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Impresion:</span>
            <span>{now}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Estado:</span>
            <span className="fw-bold">{order.statusLabel}</span>
          </div>
          {order.invoiceNumber !== "Sin factura" && (
            <div className="d-flex justify-content-between">
              <span className="text-muted">Factura:</span>
              <span>{order.invoiceNumber}</span>
            </div>
          )}
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="fw-bold mb-1 small text-uppercase">Tienda asignada</div>
          <div>{order.storeName ?? order.storeNumber}</div>
          <div className="text-muted small">Cod. {order.storeNumber}</div>
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="fw-bold mb-1 small text-uppercase">Cliente</div>
          <div>{order.customer}</div>
          {order.customerId && <div className="text-muted small">C.C. {order.customerId}</div>}
          {order.email && <div className="text-muted small">{order.email}</div>}
          {order.phone && <div className="text-muted small">{order.phone}</div>}
          {order.address && (
            <div className="text-muted small">
              {order.address}
              {order.city ? `, ${order.city}` : ""}
            </div>
          )}
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="fw-bold mb-2 small text-uppercase">Articulos</div>
          {order.items.map((item) => (
            <div key={item.id} className="mb-2">
              <div className="fw-bold">{item.name}</div>
              <div className="text-muted small">
                SKU: {item.sku} | Ref: {item.reference} | {item.color} - Talla {item.size}
              </div>
              <div className="d-flex justify-content-between">
                <span>Cant: 1</span>
                <span>${formatCurrency(item.price)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span>Envio:</span>
            <span>${formatCurrency(order.shippingCost)}</span>
          </div>
          {order.discount > 0 && (
            <div className="d-flex justify-content-between mb-1">
              <span>Descuento ({order.discountCodeValue}):</span>
              <span>-${formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-1">
            <span>TOTAL COP</span>
            <span>${formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="fw-bold mb-1 small text-uppercase">Pago</div>
          <div>Metodo: {order.paymentMethod}</div>
          {order.transactionId && (
            <div className="text-muted small">Trans. {order.transactionId}</div>
          )}
        </div>

        <div className="border-bottom pb-3 mb-3">
          <div className="fw-bold mb-1 small text-uppercase">Logistica</div>
          <div>Transportadora: {order.logisticDetails?.provider ?? order.service}</div>
          {order.logisticDetails?.id && (
            <div className="text-muted small">Guia: {order.logisticDetails.id}</div>
          )}
          <div>Origen: {order.originLabel}</div>
          <div>Servicio: {order.service}</div>
        </div>

        <div className="text-center small text-muted pt-2">
          <div>Gracias por su preferencia</div>
          <div>PERMODA LTDA - {now}</div>
          <div>www.koaj.co</div>
        </div>
      </div>
    </div>
  );
}

