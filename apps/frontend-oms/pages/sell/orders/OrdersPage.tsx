import { useMemo, useState } from "react";
import { OrderDetailModal } from "./OrderDetailModal";

import { OrdersShell } from "./OrdersShell";
import { OrdersTable, type OrderRow, type OrdersFilters } from "./OrdersTable";

/**
 * OrdersPage
 * ----------
 * - Mantiene el "source of truth" de los pedidos (mock por ahora)
 * - Mantiene filtros en estado
 * - Filtra cuando el usuario da click en Buscar
 */
export function OrdersPage() {
  /**
   * rowsAll:
   * Lista completa de pedidos (mock).
   * Cuando haya API, esto será lo que nos devuelva el backend.
   */
  const rowsAll: OrderRow[] = [
    {
      id: "21829",
      reference: "ZSPTHAYRG",
      newCustomer: "No",
      delivery: "Colombia",
      customer: "T. Tienda",
      total: "96.900,00 $",
      payment: "Pago en caja",
      status: "Asignado",
      date: "2026-01-30 16:53:06",
      detail: {
  shippingCarrier: "Recogida en tienda",
  trackingNumber: "-",
  shippingAddress:
    "Paula Tadino\nCarrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
  billingEmail: "tadinopaula@gmail.com",
  billingName: "Paula Tadino",
  billingAddress:
    "Carrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
  items: [
    { name: "Camiseta gris interna con manga corta...", reference: "105105691390-908", quantity: 1, total: "25.900,00 $" },
    { name: "Camiseta crema clara con diseños de Snoopy...", reference: "105105714478-910", quantity: 1, total: "25.900,00 $" },
  ],
},
    },
    {
      id: "21820",
      reference: "HPPZPFSHE",
      newCustomer: "No",
      delivery: "Colombia",
      customer: "E. Míguez",
      total: "114.880,00 $",
      payment: "Pago mediante efecty",
      status: "Preparación en curso",
      date: "2026-01-30 04:23:40",
      detail: {
  shippingCarrier: "Recogida en tienda",
  trackingNumber: "-",
  shippingAddress:
    "Paula Tadino\nCarrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
  billingEmail: "tadinopaula@gmail.com",
  billingName: "Paula Tadino",
  billingAddress:
    "Carrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
  items: [
    { name: "Camiseta gris interna con manga corta...", reference: "105105691390-908", quantity: 1, total: "25.900,00 $" },
    { name: "Camiseta crema clara con diseños de Snoopy...", reference: "105105714478-910", quantity: 1, total: "25.900,00 $" },
  ],
},
    },
    {
      id: "21806",
      reference: "OSEFORRAV",
      newCustomer: "Sí",
      delivery: "Colombia",
      customer: "Cliente Nuevo",
      total: "106.800,00 $",
      payment: "Pago en caja",
      status: "Entregado",
      date: "2026-01-28 08:58:47",
      detail: {
  shippingCarrier: "Recogida en tienda",
  trackingNumber: "-",
  shippingAddress:
    "Paula Tadino\nCarrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
  billingEmail: "tadinopaula@gmail.com",
  billingName: "Paula Tadino",
  billingAddress:
    "Carrera 35 número 36-37\nApt. 601. Edificio Jan Lui\nBUCARAMANGA\nColombia",
  items: [
    { name: "Camiseta gris interna con manga corta...", reference: "105105691390-908", quantity: 1, total: "25.900,00 $" },
    { name: "Camiseta crema clara con diseños de Snoopy...", reference: "105105714478-910", quantity: 1, total: "25.900,00 $" },
  ],
},
    },
  ];

  /**
   * filters:
   * Estado de filtros controlados (inputs/selects).
   */
  const [filters, setFilters] = useState<OrdersFilters>({
    id: "",
    reference: "",
    newCustomer: "",
    delivery: "",
    customer: "",
    total: "",
    payment: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  /**
   * rows:
   * Lo que realmente se pinta.
   * - Inicia mostrando todo.
   * - Se actualiza al dar click en "Buscar".
   */
  const [rows, setRows] = useState<OrderRow[]>(rowsAll);

  /**
   * total:
   * Cantidad mostrada (para el título "Pedidos (N)")
   */
  const total = useMemo(() => rows.length, [rows]);

  /**
   * onSearch
   * --------
   * Filtra la data usando los valores actuales de filters.
   *
   * Importante:
   * - Esto es frontend-only.
   * - Cuando haya API, "Buscar" llamará al backend con query params.
   */
  const onSearch = () => {
    const next = rowsAll.filter((r) => {
      // Comparaciones: usamos "includes" en minúscula para texto
      const idOk = !filters.id || r.id.toLowerCase().includes(filters.id.toLowerCase());
      const refOk = !filters.reference || r.reference.toLowerCase().includes(filters.reference.toLowerCase());
      const newOk = !filters.newCustomer || r.newCustomer === filters.newCustomer;
      const delOk = !filters.delivery || r.delivery.toLowerCase().includes(filters.delivery.toLowerCase());
      const customerOk = !filters.customer || r.customer.toLowerCase().includes(filters.customer.toLowerCase());
      const totalOk = !filters.total || r.total.toLowerCase().includes(filters.total.toLowerCase());
      const payOk = !filters.payment || r.payment.toLowerCase().includes(filters.payment.toLowerCase());
      const statusOk = !filters.status || r.status === filters.status;

      // Fecha: comparamos solo por "YYYY-MM-DD" (parte inicial del string)
      const rowDateOnly = r.date.substring(0, 10); // "2026-01-30"
      const fromOk = !filters.dateFrom || rowDateOnly >= filters.dateFrom;
      const toOk = !filters.dateTo || rowDateOnly <= filters.dateTo;

      return idOk && refOk && newOk && delOk && customerOk && totalOk && payOk && statusOk && fromOk && toOk;
    });

    

    setRows(next);
  };

/**detalles de pedido  */
const [detailOpen, setDetailOpen] = useState(false);
const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

const openDetail = (row: OrderRow) => {
  setSelectedOrder(row);
  setDetailOpen(true);
};
/**cierra detalles de pedido */


/*limpiar filtros */

  const clearFilters = () => {
  const empty: OrdersFilters = {
    id: "",
    reference: "",
    newCustomer: "",
    delivery: "",
    customer: "",
    total: "",
    payment: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  };

  setFilters(empty);
  setRows(rowsAll);
};

  return (
    <OrdersShell
      title="Pedidos"
      total={total}
      onOpenSettings={() => alert("Configuración (pendiente)")}
      
    >
    <OrdersTable
      rows={rows}
      filters={filters}
      onChangeFilters={setFilters}
      onSearch={onSearch}
      onClear={clearFilters}
      onView={openDetail}
    />
    <OrderDetailModal
      open={detailOpen}
      order={selectedOrder}
      onClose={() => setDetailOpen(false)}
    />
        


    </OrdersShell>
    
  );
  
}
