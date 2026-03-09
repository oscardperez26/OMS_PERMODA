

/**
 * OrderRow
 * --------
 * Tipo mínimo para pintar una fila de pedido en la tabla.
 */
export type OrderRow = {
  pedidoId: number;
  id: string;
  reference: string;
  newCustomer: "Sí" | "No";
  delivery: string;
  customer: string;
  total: string;
  payment: string;
  status: "Asignado" | "Preparación en curso" | "Con novedad" | "Entregado";
  date: string; // "YYYY-MM-DD HH:mm:ss"
  detail?: OrderDetail; // detalle del pedido (para el modal)
};

/** OrderItem
 * ---------
 * Representa un producto dentro del detalle de un pedido.
 */

export type OrderItem = {
  name: string;
  reference: string;
  quantity: number;
  total: string;
};

export type OrderDetail = {
  shippingCarrier: string;   // "Recogida en tienda"
  trackingNumber: string;    // "-"
  shippingAddress: string;   // multilinea
  billingEmail: string;
  billingName: string;
  billingAddress: string;    // multilinea
  items: OrderItem[];
};

/**
 * OrdersFilters
 * -------------
 * Representa los filtros de la tabla.
 * Son los valores que el usuario escribe en la fila de filtros.
 */
export type OrdersFilters = {
  id: string;
  reference: string;
  newCustomer: "" | "Sí" | "No";
  delivery: string;
  customer: string;
  total: string;
  payment: string;
  status: "" | OrderRow["status"];
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;   // "YYYY-MM-DD"
};

/**
 * OrdersTable
 * -----------
 * Tabla estilo OMS anterior:
 * - Encabezados
 * - Fila de filtros (controlados)
 * - Botón Buscar + Limpiar
 * - Acción 🔍 para ver detalle (onView)
 */
export function OrdersTable({
  rows,
  filters,
  onChangeFilters,
  onSearch,
  onView,
}: {
  rows: OrderRow[];
  filters: OrdersFilters;

  /** Notifica cambios de cualquier filtro */
  onChangeFilters: (next: OrdersFilters) => void;

  /** Se ejecuta cuando el usuario da click en "Buscar" */
  onSearch: () => void;

  /** Limpia todos los filtros */
  onClear: () => void;

  /** Accion del icono 🔍 (ver detalle del pedido) */
  onView: (row: OrderRow) => void;
}) {
  /**
   * helper: actualiza un campo de filters sin repetir código
   */
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
              <th className="col-new">Nuevo cliente</th>
              <th className="col-delivery">Entrega</th>
              <th className="col-customer">Cliente</th>
              <th className="col-total">
                Total <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.7rem' }}></i>
              </th>
              <th className="col-pay">Pago</th>
              <th className="col-status">Estado</th>
              <th className="col-date">Fecha</th>
              <th className="col-actions">Acciones</th>
            </tr>

          {/* FILTROS CONTROLADOS */}
          <tr className="orders-filter-row">
            <th className="center">
              <input type="checkbox" aria-label="Seleccionar todos" />
            </th>

            <th>
              <input
                className="orders-input"
                placeholder="Buscar"
                value={filters.id}
                onChange={(e) => set("id", e.target.value)}
              />
            </th>

            <th>
              <input
                className="orders-input"
                placeholder="Buscar referencia"
                value={filters.reference}
                onChange={(e) => set("reference", e.target.value)}
              />
            </th>

            <th>
              <select
                className="orders-select"
                value={filters.newCustomer}
                onChange={(e) => set("newCustomer", e.target.value as any)}
              >
                <option value="">Todas</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </th>

            <th>
              <input
                className="orders-input"
                value={filters.delivery}
                onChange={(e) => set("delivery", e.target.value)}
              />
            </th>

            <th>
              <input
                className="orders-input"
                placeholder="Buscar cliente"
                value={filters.customer}
                onChange={(e) => set("customer", e.target.value)}
              />
            </th>

            <th>
              <input
                className="orders-input"
                placeholder="Buscar total"
                value={filters.total}
                onChange={(e) => set("total", e.target.value)}
              />
            </th>

            <th>
              <input
                className="orders-input"
                placeholder="Buscar pago"
                value={filters.payment}
                onChange={(e) => set("payment", e.target.value)}
              />
            </th>

            <th>
              <select
                className="orders-select"
                value={filters.status}
                onChange={(e) => set("status", e.target.value as any)}
              >
                <option value="">Todos</option>
                <option value="Asignado">Asignado</option>
                <option value="Preparación en curso">Preparación en curso</option>
                <option value="Con novedad">Con novedad</option>
                <option value="Entregado">Entregado</option>
              </select>
            </th>

            <th>
              <div className="orders-date-range">
                <input
                  className="orders-input"
                  placeholder="YYYY-MM-DD"
                  value={filters.dateFrom}
                  onChange={(e) => set("dateFrom", e.target.value)}
                />
                <span className="cal">📅</span>
                <input
                  className="orders-input"
                  placeholder="YYYY-MM-DD"
                  value={filters.dateTo}
                  onChange={(e) => set("dateTo", e.target.value)}
                />
                <span className="cal">📅</span>
              </div>
            </th>

            <th>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="orders-search-btn" type="button" onClick={onSearch}>
                  Buscar
                </button>
                <button className="orders-clear-btn" type="button" onClick={onClear}>
                  Limpiar
                </button>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.pedidoId} className="orders-body-row">
              <td className="center">
                <input type="checkbox" aria-label={`Seleccionar pedido ${r.id}`} />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: '0.8rem', height: '32px' }}
                  placeholder="ID"
                  value={filters.id}
                  onChange={(e) => set("id", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: '0.8rem', height: '32px' }}
                  placeholder="Buscar re"
                  value={filters.reference}
                  onChange={(e) => set("reference", e.target.value)}
                />
              </td>
              <td>
                <select
                  className="koaj-select py-1 px-2"
                  style={{ fontSize: '0.8rem', height: '32px' }}
                  value={filters.newCustomer}
                  onChange={(e) => set("newCustomer", e.target.value as any)}
                >
                  <option value="">Todos</option>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td>
                <select
                  className="koaj-select py-1 px-2"
                  style={{ fontSize: '0.8rem', height: '32px' }}
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
                  style={{ fontSize: '0.8rem', height: '32px' }}
                  placeholder="Buscar cliente"
                  value={filters.customer}
                  onChange={(e) => set("customer", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: '0.8rem', height: '32px' }}
                  placeholder="Buscar todos"
                  value={filters.total}
                  onChange={(e) => set("total", e.target.value)}
                />
              </td>
              <td>
                <input
                  className="koaj-input py-1 px-2"
                  style={{ fontSize: '0.8rem', height: '32px' }}
                  placeholder="Bus"
                  value={filters.payment}
                  onChange={(e) => set("payment", e.target.value)}
                />
              </td>
              <td>
                <select
                  className="koaj-select py-1 px-2"
                  style={{ fontSize: '0.8rem', height: '32px' }}
                  value={filters.status}
                  onChange={(e) => set("status", e.target.value as any)}
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
                  <div className="d-flex align-items-center bg-white border rounded px-1" style={{ height: '30px' }}>
                    <span className="text-muted small me-1">Y</span>
                    <i className="bi bi-calendar-event me-1 text-muted" style={{ fontSize: '0.75rem' }}></i>
                  </div>
                  <div className="d-flex align-items-center bg-white border rounded px-1" style={{ height: '30px' }}>
                    <span className="text-muted small me-1">Y</span>
                    <i className="bi bi-calendar-event me-1 text-muted" style={{ fontSize: '0.75rem' }}></i>
                  </div>
                </div>
              </td>
              <td className="text-center align-middle">
                <button
                  className="btn-koaj-outline py-1 px-2 d-flex align-items-center gap-1 mx-auto"
                  style={{ fontSize: '0.85rem', color: '#94a3b8', borderColor: '#e2e8f0', backgroundColor: '#f1f5f9' }}
                  onClick={onSearch}
                >
                  <i className="bi bi-search"></i> Buscar
                </button>
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
                      title="Ver Detalles"
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
                <td colSpan={11} className="orders-empty">
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
