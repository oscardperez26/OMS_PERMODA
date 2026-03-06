/**
 * StoreOrderTicketPage.tsx
 * ------------------------
 * Página de TICKET/FACTURA para imprimir de un pedido de tienda.
 * RUTA: /tienda/orders/:orderId/ticket
 *
 * Comportamiento:
 * - Abre automáticamente el diálogo de impresión del navegador al montar el componente.
 * - Diseño tipo recibo/ticket en blanco y negro para impresión térmica o en papel.
 * - En pantalla adicional mantiene botones de control (imprimir, cerrar).
 * - El CSS @media print oculta los botones de control y sólo imprime el ticket.
 *
 * Flujo:
 *   Lista → clic "Imprimir" → navigate("/tienda/orders/629/ticket")
 *   → useParams extrae orderId → busca pedido → renderiza ticket → window.print()
 */

import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { STORE_ORDERS_MOCK } from "./storeOrdersMock";

// ─────────────────────────────────────────────
// ESTILOS DE IMPRESIÓN (inyectados en <head>)
// ─────────────────────────────────────────────

/**
 * PRINT_STYLES
 * Se inyectan como un <style> en el DOM para controlar
 * cómo se ve la página al imprimir sin afectar otras páginas.
 *
 * @media print:
 * - Oculta los botones de control (.no-print)
 * - Fuerza fondo blanco y texto negro
 * - Ajusta el ancho del ticket al tamaño del papel
 */
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

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

export function StoreOrderTicketPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();

    const order = STORE_ORDERS_MOCK.find((o) => o.orderId === Number(orderId));

    /**
     * useEffect de estilos de impresión:
     * Inyecta el <style> en el <head> cuando el componente monta y lo limpia al desmontar.
     * Esto evita que los estilos de impresión afecten otras páginas de la app.
     */
    useEffect(() => {
        const styleTag = document.createElement("style");
        styleTag.id = "ticket-print-styles";
        styleTag.textContent = PRINT_STYLES;
        document.head.appendChild(styleTag);

        return () => {
            document.getElementById("ticket-print-styles")?.remove();
        };
    }, []);

    /**
     * useEffect de impresión automática:
     * Cuando el componente monta y el pedido existe, dispara window.print()
     * después de 300 ms para asegurarse de que el DOM ya está pintado.
     * El usuario ve un pequeño flash del ticket y el diálogo de impresión aparece.
     */
    useEffect(() => {
        if (!order) return;
        const timer = setTimeout(() => window.print(), 300);
        return () => clearTimeout(timer);
    }, [order]);

    // ── GUARD: pedido no encontrado ──────────────────────────────────────
    if (!order) {
        return (
            <div className="container p-4">
                <div className="alert alert-warning">
                    <strong>Pedido #{orderId} no encontrado.</strong>{" "}
                    <Link to="/tienda/orders">← Volver a la lista</Link>
                </div>
            </div>
        );
    }

    // Fecha formateada para el ticket
    const now = new Date().toLocaleString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────
    return (
        <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px" }}>

            {/* ── CONTROLES (solo en pantalla, ocultos al imprimir) ── */}
            <div className="no-print d-flex justify-content-center gap-3 mb-4">
                <button
                    className="btn-koaj-primary px-4"
                    onClick={() => window.print()}
                >
                    <i className="bi bi-printer me-2" />Imprimir
                </button>
                <button
                    className="btn-koaj-outline bg-white px-4"
                    onClick={() => navigate("/tienda/orders")}
                >
                    <i className="bi bi-arrow-left me-2" />Volver
                </button>
            </div>

            {/* ── TICKET ── */}
            <div
                className="ticket-wrapper bg-white mx-auto p-4 shadow-sm"
                style={{ maxWidth: "420px", fontFamily: "monospace", fontSize: "13px" }}
            >
                {/* Encabezado de empresa */}
                <div className="text-center border-bottom pb-3 mb-3">
                    <div className="fw-bold fs-5">PERMODA LTDA</div>
                    <div className="text-muted small">KOAJ – Factura de venta</div>
                    <div className="text-muted small">NIT 800.000.000-0</div>
                </div>

                {/* Datos del pedido */}
                <div className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between">
                        <span className="text-muted">Asignación:</span>
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
                        <span className="text-muted">Impresión:</span>
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

                {/* Tienda */}
                <div className="border-bottom pb-3 mb-3">
                    <div className="fw-bold mb-1 small text-uppercase">Tienda asignada</div>
                    <div>{order.storeName ?? order.storeNumber}</div>
                    <div className="text-muted small">Cod. {order.storeNumber}</div>
                </div>

                {/* Datos del cliente */}
                <div className="border-bottom pb-3 mb-3">
                    <div className="fw-bold mb-1 small text-uppercase">Cliente</div>
                    <div>{order.customer}</div>
                    {order.customerId && <div className="text-muted small">C.C. {order.customerId}</div>}
                    {order.email && <div className="text-muted small">{order.email}</div>}
                    {order.phone && <div className="text-muted small">{order.phone}</div>}
                    {order.address && (
                        <div className="text-muted small">{order.address}{order.city ? `, ${order.city}` : ""}</div>
                    )}
                </div>

                {/* Artículos */}
                <div className="border-bottom pb-3 mb-3">
                    <div className="fw-bold mb-2 small text-uppercase">Artículos</div>
                    {order.items.map((item) => (
                        <div key={item.id} className="mb-2">
                            <div className="fw-bold">{item.name}</div>
                            <div className="text-muted small">
                                SKU: {item.sku} | Ref: {item.reference} | {item.color} – Talla {item.size}
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>Cant: 1</span>
                                <span>${item.price.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Resumen de costos */}
                <div className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between mb-1">
                        <span>Subtotal:</span>
                        <span>${order.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                        <span>Envío:</span>
                        <span>${order.shippingCost.toLocaleString()}</span>
                    </div>
                    {order.discount > 0 && (
                        <div className="d-flex justify-content-between mb-1">
                            <span>Descuento ({order.discountCodeValue}):</span>
                            <span>-${order.discount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-1">
                        <span>TOTAL COP</span>
                        <span>${order.total.toLocaleString()}</span>
                    </div>
                </div>

                {/* Método de pago */}
                <div className="border-bottom pb-3 mb-3">
                    <div className="fw-bold mb-1 small text-uppercase">Pago</div>
                    <div>Método: {order.paymentMethod}</div>
                    {order.transactionId && <div className="text-muted small">Trans. {order.transactionId}</div>}
                </div>

                {/* Logística */}
                <div className="border-bottom pb-3 mb-3">
                    <div className="fw-bold mb-1 small text-uppercase">Logística</div>
                    <div>Transportadora: {order.logisticDetails?.provider ?? order.service}</div>
                    {order.logisticDetails?.id && (
                        <div className="text-muted small">Guía: {order.logisticDetails.id}</div>
                    )}
                    <div>Origen: {order.originLabel}</div>
                    <div>Servicio: {order.service}</div>
                </div>

                {/* Pie de ticket */}
                <div className="text-center small text-muted pt-2">
                    <div>Gracias por su preferencia</div>
                    <div>PERMODA LTDA · {now}</div>
                    <div>www.koaj.co</div>
                </div>
            </div>
        </div>
    );
}
