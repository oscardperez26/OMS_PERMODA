/**
 * OrderRow
 * --------
 * Minimal type to render an order row in the table.
 */
export type OrderRow = {
  pedidoId: number;
  id: string;
  reference: string;
  origin: string;
  newCustomer: "Sí" | "No";
  delivery: string;
  customer: string;
  total: string;
  payment: string;
  status: "Asignado" | "Preparación en curso" | "Con novedad" | "Entregado";
  date: string; // "YYYY-MM-DD HH:mm:ss"
  detail?: OrderDetail;
};

export type OrderItem = {
  name: string;
  reference: string;
  quantity: number;
  total: string;
};

export type OrderDetail = {
  shippingCarrier: string;
  trackingNumber: string;
  shippingAddress: string;
  billingEmail: string;
  billingName: string;
  billingAddress: string;
  items: OrderItem[];
};

export type OrdersFilters = {
  id: string;
  reference: string;
  origin: string;
  newCustomer: "" | "Sí" | "No";
  delivery: string;
  customer: string;
  total: string;
  payment: string;
  status: "" | OrderRow["status"];
  dateFrom: string;
  dateTo: string;
};

export function OrdersTable({
  rows,
  filters,
  onChangeFilters,
  onSearch,
  onClear,
  onView,
}: {
  rows: OrderRow[];
  filters: OrdersFilters;
  onChangeFilters: (next: OrdersFilters) => void;
  onSearch: () => void;
  onClear: () => void;
  onView: (row: OrderRow) => void;
}) {
  const set = <K extends keyof OrdersFilters>(key: K, value: OrdersFilters[K]) => {
    onChangeFilters({ ...filters, [key]: value });
  };

  return (
    <div>
      <div className="w-100 koaj-table-wrapper">
        <table className="koaj-table">
          <thead>
            <tr className="orders-head-row">
              <th className="col-check text-center">
                <input type="checkbox" aria-label="Seleccionar todos" />
              </th>
              <th className="col-id">ID</th>
              <th className="col-ref">Referencia</th>
              <th className="col-ref">Origen</th>
              <th className="col-new">Nuevo cliente</th>
              <th className="col-delivery">Entrega</th>
              <th className="col-customer">Cliente</th>
              <th className="col-total">
                Total <i className="bi bi-chevron-down ms-1" style={{ fontSize: "0.7rem" }}></i>
              </th>
              <th className="col-pay">Pago</th>
              <th className="col-status">Estado</th>
              <th className="col-date">Fecha</th>
              <th className="col-actions">Acciones</th>
            </tr>

            <tr className="orders-filter-row" style={{ backgroundColor: "#f8fafc" }}>
              <td className="text-center align-middle">
                <i className="bi bi-square text-muted" style={{ opacity: 0.3 }}></i>
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  placeholder="ID"
                  value={filters.id}
                  onChange={(e) => set("id", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  placeholder="Buscar ref"
                  value={filters.reference}
                  onChange={(e) => set("reference", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  placeholder="Origen"
                  value={filters.origin}
                  onChange={(e) => set("origin", e.target.value)}
                />
              </td>
              <td>
                <select
                  className="koaj-select py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  value={filters.newCustomer}
                  onChange={(e) => set("newCustomer", e.target.value as OrdersFilters["newCustomer"])}
                >
                  <option value="">Todos</option>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td>
                <select
                  className="koaj-select py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  value={filters.delivery}
                  onChange={(e) => set("delivery", e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Colombia">Colombia</option>
                </select>
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  placeholder="Buscar cliente"
                  value={filters.customer}
                  onChange={(e) => set("customer", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  placeholder="Buscar total"
                  value={filters.total}
                  onChange={(e) => set("total", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  placeholder="Buscar pago"
                  value={filters.payment}
                  onChange={(e) => set("payment", e.target.value)}
                />
              </td>
              <td>
                <select
                  className="koaj-select py-1 px-2"
                  style={{ fontSize: "0.8rem", height: "32px" }}
                  value={filters.status}
                  onChange={(e) => set("status", e.target.value as OrdersFilters["status"])}
                >
                  <option value="">Todos</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Preparación en curso">Preparación en curso</option>
                  <option value="Con novedad">Con novedad</option>
                  <option value="Entregado">Entregado</option>
                </select>
              </td>
              <td>
                <div className="d-flex flex-column gap-1">
                  <input
                    className="koaj-input py-1 px-2"
                    style={{ fontSize: "0.8rem", height: "32px" }}
                    placeholder="Desde (YYYY-MM-DD)"
                    value={filters.dateFrom}
                    onChange={(e) => set("dateFrom", e.target.value)}
                  />
                  <input
                    className="koaj-input py-1 px-2"
                    style={{ fontSize: "0.8rem", height: "32px" }}
                    placeholder="Hasta (YYYY-MM-DD)"
                    value={filters.dateTo}
                    onChange={(e) => set("dateTo", e.target.value)}
                  />
                </div>
              </td>
              <td className="text-center align-middle">
                <div className="d-flex justify-content-center gap-1">
                  <button
                    className="btn-koaj-outline py-1 px-2 d-flex align-items-center gap-1"
                    style={{
                      fontSize: "0.85rem",
                      color: "#94a3b8",
                      borderColor: "#e2e8f0",
                      backgroundColor: "#f1f5f9",
                    }}
                    type="button"
                    onClick={onSearch}
                  >
                    <i className="bi bi-search"></i> Buscar
                  </button>
                  <button className="btn-koaj-outline py-1 px-2" type="button" onClick={onClear}>
                    Limpiar
                  </button>
                </div>
              </td>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="orders-body-row">
                <td className="center">
                  <input type="checkbox" aria-label={`Seleccionar pedido ${r.id}`} />
                </td>
                <td>{r.id}</td>
                <td>{r.reference}</td>
                <td>{r.origin}</td>
                <td>{r.newCustomer}</td>
                <td>{r.delivery}</td>
                <td>
                  <a className="orders-link" href="#" onClick={(e) => e.preventDefault()}>
                    {r.customer}
                  </a>
                </td>
                <td>{r.total}</td>
                <td>{r.payment}</td>
                <td>
                  <span className={`orders-badge ${badgeColor(r.status)}`}>{r.status}</span>
                </td>
                <td>{r.date}</td>
                <td className="center">
                  <div className="d-flex justify-content-center align-items-center">
                    <button
                      className="btn-koaj-action-blue"
                      type="button"
                      title="Ver detalles"
                      aria-label={`Ver pedido ${r.id}`}
                      onClick={() => onView(r)}
                    >
                      <i className="bi bi-eye-fill"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={12} className="orders-empty">
                  No hay pedidos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function badgeColor(status: OrderRow["status"]) {
  switch (status) {
    case "Asignado":
      return "green";
    case "Preparación en curso":
      return "blue";
    case "Con novedad":
      return "yellow";
    case "Entregado":
      return "gray";
    default:
      return "gray";
  }
}
