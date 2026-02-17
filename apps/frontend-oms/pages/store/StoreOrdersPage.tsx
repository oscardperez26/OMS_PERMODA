import { useState, useEffect } from "react";
import type { Order } from "../../models/order.model";

// CONSTANTES

const ORIGIN_OPTIONS = [
  { value: "0", label: "Ver Todo" },
  { value: "1-0", label: "WEB" },
  { value: "1-4", label: "WEB - Colombia" },
  { value: "2-0", label: "Market" },
  { value: "2-1", label: "Market - Mercado Libre" },
  { value: "2-3", label: "Market - Falabella" },
  { value: "2-2", label: "Market - Dafiti" }
];

const TRANSPORT_OPTIONS = [
  { value: "0", label: "Ver Todo" },
  { value: "1", label: "Coordinadora" },
  { value: "15", label: "Manual" },
  { value: "17", label: "Last Mile" },
  { value: "18", label: "Sin transporte" }
];

const STORE_OPTIONS = [
  { value: "0", label: "Ver Todo" },
  { value: "1012", label: "031 TIENDA KOAJ CAFAM FLORESTA" },
  { value: "1013", label: "037 T.KOAJ CALLE 18 MONTEVIDEO" },
  { value: "1014", label: "081 TIENDA KOAJ K-60" }
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  "4": { label: "Despachado", color: "primary" },
  "5": { label: "Entregado", color: "info" },
  "6": { label: "Cancelado", color: "danger" },
  "10": { label: "Confirmado", color: "success" },
  "15": { label: "Reasignado", color: "dark" },
  "20": { label: "Expirado", color: "secondary" }
};

const INITIAL_FILTERS = {
  search: "",
  exactSearch: false,
  origin: "0",
  status: "0",
  transporter: "0",
  store: "0"
};

// COMPONENTE

export function StoreOrdersPage() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // MOCK DATA

  useEffect(() => {
    const mock: Order[] = [
      {
        id: 1,
        assignment: "G-16925",
        orderId: 675,
        reference: "#FXDJXLLDG",
        customer: "Carlos Julio Valderrama",
        store: "1012",
        date: "10 Feb, 2026",
        originCode: "1-0",
        originLabel: "WEB",
        service: "Domicilio",
        transporterCode: "18",
        transporterLabel: "Sin transporte",
        statusCode: "20",
        statusLabel: "Expirado",
        items: []
      },
      {
        id: 2,
        assignment: "G-16924",
        orderId: 674,
        reference: "#AAA123",
        customer: "Laura Gómez",
        store: "1013",
        date: "09 Feb, 2026",
        originCode: "2-1",
        originLabel: "Mercado Libre",
        service: "Domicilio",
        transporterCode: "17",
        transporterLabel: "Last Mile",
        statusCode: "10",
        statusLabel: "Confirmado",
        items: []
      },
      {
        id: 3,
        assignment: "G-16923",
        orderId: 673,
        reference: "#BBB456",
        customer: "Andrés López",
        store: "1014",
        date: "08 Feb, 2026",
        originCode: "1-4",
        originLabel: "WEB Colombia",
        service: "Domicilio",
        transporterCode: "1",
        transporterLabel: "Coordinadora",
        statusCode: "5",
        statusLabel: "Entregado",
        items: []
      },
      {
        id: 4,
        assignment: "G-16922",
        orderId: 672,
        reference: "#CCC789",
        customer: "María Torres",
        store: "1012",
        date: "07 Feb, 2026",
        originCode: "2-3",
        originLabel: "Falabella",
        service: "Domicilio",
        transporterCode: "15",
        transporterLabel: "Manual",
        statusCode: "4",
        statusLabel: "Despachado",
        items: []
      },
      {
        id: 5,
        assignment: "G-16921",
        orderId: 671,
        reference: "#DDD000",
        customer: "Juan Ramirez",
        store: "1013",
        date: "06 Feb, 2026",
        originCode: "2-2",
        originLabel: "Dafiti",
        service: "Domicilio",
        transporterCode: "18",
        transporterLabel: "Sin transporte",
        statusCode: "6",
        statusLabel: "Cancelado",
        items: []
      },
      {
        id: 6,
        assignment: "G-16920",
        orderId: 670,
        reference: "#EEE111",
        customer: "Camila Rojas",
        store: "1014",
        date: "05 Feb, 2026",
        originCode: "1-0",
        originLabel: "WEB",
        service: "Domicilio",
        transporterCode: "17",
        transporterLabel: "Last Mile",
        statusCode: "15",
        statusLabel: "Reasignado",
        items: []
      }
    ];

    setOrders(mock);
    setFilteredOrders(mock);
  }, []);

  // FILTRADO

  useEffect(() => {
    let result = [...orders];

    if (filters.search) {
      if (filters.exactSearch) {
        result = result.filter(o =>
          o.assignment === filters.search ||
          o.reference === filters.search ||
          o.orderId.toString() === filters.search
        );
      } else {
        result = result.filter(o =>
          o.assignment.includes(filters.search) ||
          o.reference.includes(filters.search) ||
          o.customer.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
    }

    if (filters.origin !== "0") {
      result = result.filter(o => o.originCode === filters.origin);
    }

    if (filters.status !== "0") {
      result = result.filter(o => o.statusCode === filters.status);
    }

    if (filters.transporter !== "0") {
      result = result.filter(o => o.transporterCode === filters.transporter);
    }

    if (filters.store !== "0") {
      result = result.filter(o => o.store === filters.store);
    }

    setFilteredOrders(result);
  }, [filters, orders]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFilters(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleClear = () => setFilters(INITIAL_FILTERS);

  // RENDER

  return (
    <div className="container mt-4">
      <h4 className="mb-4">Listado de pedidos - <text style={{ color: 'blue' }}>GESTOR</text></h4>

      <div className="card shadow-sm mb-4 p-3">
        <div className="row g-3">

          {/* Busqueda */}
          <div className="col-md-4">
            <label className="form-label">Buscar</label>
            <input
              type="text"
              className="form-control"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Id / Referencia / Cliente"
            />
          </div>

          {/* Exacta */}
          <div className="col-md-2 d-flex align-items-end">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                name="exactSearch"
                checked={filters.exactSearch}
                onChange={handleFilterChange}
              />
              <label className="form-check-label">Búsqueda exacta</label>
            </div>
          </div>

          {/* Origen */}
          <div className="col-md-3">
            <label className="form-label">Origen</label>
            <select
              className="form-select"
              name="origin"
              value={filters.origin}
              onChange={handleFilterChange}
            >
              {ORIGIN_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3 d-flex align-items-end">
            <button
              className="btn btn-info me-2"
              type="button"
              onClick={() => setShowMoreFilters(prev => !prev)}
            >
              {showMoreFilters ? "Ocultar filtros" : "Otros filtros"}
            </button>
            <button className="btn btn-warning" type="button" onClick={handleClear}>Borrar</button>
          </div>

          {showMoreFilters && (
            <>
              {/* Estado */}
              <div className="col-md-3">
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="0">Ver Todo</option>
                  {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>

              {/* Transportadora */}
              <div className="col-md-3">
                <label className="form-label">Transportadora</label>
                <select
                  className="form-select"
                  name="transporter"
                  value={filters.transporter}
                  onChange={handleFilterChange}
                >
                  {TRANSPORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Tienda */}
              <div className="col-md-3">
                <label className="form-label">Tienda</label>
                <select
                  className="form-select"
                  name="store"
                  value={filters.store}
                  onChange={handleFilterChange}
                >
                  {STORE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <table className="table table-bordered table-hover">
        <thead className="table-light">
          <tr>
            <th>Asignación</th>
            <th>Pedido</th>
            <th>Referencia</th>
            <th>Cliente</th>
            <th>Tienda</th>
            <th>Fecha</th>
            <th>Origen</th>
            <th>Servicio</th>
            <th>Transportadora</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => {
            const status = STATUS_CONFIG[order.statusCode];
            return (
              <tr key={order.id}>
                <td>{order.assignment}</td>
                <td>{order.orderId}</td>
                <td>{order.reference}</td>
                <td>{order.customer}</td>
                <td>{order.store}</td>
                <td>{order.date}</td>
                <td>{order.originLabel}</td>
                <td>{order.service}</td>
                <td>{order.transporterLabel}</td>
                <td>
                  <span className={`badge bg-${status?.color || "secondary"}`}>
                    {status?.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
