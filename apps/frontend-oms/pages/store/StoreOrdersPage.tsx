import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { STORE_ORDERS_MOCK, type Order } from "./storeOrdersMock";
import {
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  TRANSPORTER_OPTIONS,
  STORE_OPTIONS,
} from "./storeFilterOptions";

function badgeColor(statusLabel: string) {
  switch (statusLabel) {
    case "Confirmado":
    case "Asignado":
      return { bg: "#bbf7d0", color: "#166534" }; // green
    case "Despachado":
    case "Preparación en curso":
      return { bg: "#bfdbfe", color: "#1e3a8a" }; // blue
    case "Entregado":
      return { bg: "#d1d5db", color: "#374151" }; // gray
    case "Cancelado":
      return { bg: "#fee2e2", color: "#991b1b" }; // red
    default:
      return { bg: "#f1f5f9", color: "#475569" }; // light gray
  }
}

const INITIAL_FILTERS = {
  orderAlias: "",
  orderSearch: "",
  startDate: "",
  endDate: "",
  origin: "0",
  status: "0",
  transporter: "0",
  store: "0",
  sub1: "0",
  sub2: "0",
  sub3: "0"
};

export function StoreOrdersPage() {
  const navigate = useNavigate();

  const orders: Order[] = STORE_ORDERS_MOCK;
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [activeTab, setActiveTab] = useState("Ver Todos");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.date-range-container')) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const set = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const alias = filters.orderAlias.trim().toLowerCase();
      const matchAlias =
        alias === "" ||
        o.assignment.toLowerCase().includes(alias) ||
        o.orderId.toString().includes(alias) ||
        o.reference.toLowerCase().includes(alias);

      const search = filters.orderSearch.toLowerCase();
      const matchSearch =
        search === "" ||
        o.assignment.toLowerCase().includes(search) ||
        o.customer.toLowerCase().includes(search) ||
        o.orderId.toString().includes(search);

      const matchOrigin = filters.origin === "0" || o.originCode === filters.origin;
      const matchStatus = filters.status === "0" || o.statusCode === filters.status;
      const matchTransporter = filters.transporter === "0" || o.transporterCode === filters.transporter;
      const matchStore = filters.store === "0" || o.store === filters.store;

      const orderDateObj = new Date(o.date);
      const matchDate = (() => {
        if (isNaN(orderDateObj.getTime())) return false;

        const y = orderDateObj.getFullYear();
        const m = orderDateObj.getMonth();
        const d = orderDateObj.getDate();
        const orderTime = new Date(y, m, d).getTime();

        let startMatch = true;
        if (filters.startDate) {
          const [sY, sM, sD] = filters.startDate.split('-').map(Number);
          const sTime = new Date(sY, sM - 1, sD).getTime();
          startMatch = orderTime >= sTime;
        }

        let endMatch = true;
        if (filters.endDate) {
          const [eY, eM, eD] = filters.endDate.split('-').map(Number);
          const eTime = new Date(eY, eM - 1, eD).getTime();
          endMatch = orderTime <= eTime;
        }

        return startMatch && endMatch;
      })();

      // ── TAB FILTERING LOGIC ──
      let matchTab = true;
      if (activeTab === "Pendiente") {
        matchTab = o.statusLabel === "Confirmado";
      } else if (activeTab === "Recogida en Tienda") {
        matchTab = o.service.toLowerCase().includes("recogida");
      } else if (activeTab === "Procesados") {
        matchTab = (o.statusLabel === "Entregado" || o.statusLabel === "Despachado");
      } else if (activeTab === "Pedido con Incidencia") {
        matchTab = o.statusLabel === "Cancelado";
      }

      return (
        matchAlias &&
        matchSearch &&
        matchOrigin &&
        matchStatus &&
        matchTransporter &&
        matchStore &&
        matchTab &&
        matchDate
      );
    });
  }, [filters, orders, activeTab]);

  const goToDetail = (order: Order) => navigate(`/tienda/orders/${order.orderId}`);
  const goToTicket = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/tienda/orders/${order.orderId}/ticket`, '_blank');
  };

  return (
    <div className="w-100">
      <div className="mb-4">
        <h1 className="m-0 fw-bold text-dark h4 mb-3">Listado de pedidos - <span style={{ color: 'blue' }}>GESTOR</span></h1>

        <div className="bg-white p-2 border border-light rounded mb-2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {/* Main Filter Row: All in one or wrapping tightly */}
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <div className="d-flex border rounded overflow-hidden" style={{ height: '30px' }}>
              <div className="bg-light px-2 d-flex align-items-center border-end small text-muted" style={{ fontSize: '0.65rem' }}>Búsqueda</div>
              <input
                className="border-0 px-2 small"
                style={{ width: '150px', outline: 'none', fontSize: '0.75rem' }}
                placeholder="ID / REF / ALIAS"
                value={filters.orderAlias}
                onChange={(e) => set("orderAlias", e.target.value)}
              />
            </div>

            <div className="d-flex align-items-center border rounded px-2 bg-white" style={{ height: '30px', width: '220px' }}>
              <i className="bi bi-search text-muted me-2" style={{ fontSize: '0.75rem' }}></i>
              <input
                className="border-0 small w-100"
                style={{ outline: 'none', fontSize: '0.75rem' }}
                placeholder="Id pedido, producto..."
                value={filters.orderSearch}
                onChange={(e) => set("orderSearch", e.target.value)}
              />
            </div>

            <div className="date-range-container position-relative">
              <div
                className="border rounded px-2 d-flex align-items-center bg-white cursor-pointer"
                style={{ height: '30px', width: '220px', cursor: 'pointer' }}
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <i className="bi bi-calendar3 text-muted me-2" style={{ fontSize: '0.75rem' }}></i>
                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                  {filters.startDate || filters.endDate
                    ? `${filters.startDate || '...'} - ${filters.endDate || '...'}`
                    : 'Desde - Hasta'
                  }
                </span>
              </div>

              {showDatePicker && (
                <div
                  className="position-absolute bg-white border rounded shadow-lg p-3 z-3"
                  style={{ top: '35px', left: 0, minWidth: '300px' }}
                >
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="koaj-label mb-1" style={{ fontSize: '0.65rem' }}>Desde</label>
                      <input
                        type="date"
                        className="koaj-input py-1"
                        style={{ fontSize: '0.75rem' }}
                        value={filters.startDate}
                        onChange={(e) => set("startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="koaj-label mb-1" style={{ fontSize: '0.65rem' }}>Hasta</label>
                      <input
                        type="date"
                        className="koaj-input py-1"
                        style={{ fontSize: '0.75rem' }}
                        value={filters.endDate}
                        onChange={(e) => set("endDate", e.target.value)}
                      />
                    </div>
                    <div className="d-flex justify-content-end">
                      <button
                        className="btn-koaj-primary py-1 px-3"
                        style={{ fontSize: '0.7rem' }}
                        onClick={() => setShowDatePicker(false)}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <select
              className="koaj-select"
              style={{ height: '30px', fontSize: '0.75rem', width: '150px', padding: '0 8px' }}
              value={filters.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="0">Estado</option>
              {STATUS_OPTIONS.filter(o => o.value !== "0").map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className="koaj-select"
              style={{ height: '30px', fontSize: '0.75rem', width: '130px', padding: '0 8px' }}
              value={filters.origin}
              onChange={(e) => set("origin", e.target.value)}
            >
              <option value="0">Origen</option>
              {ORIGIN_OPTIONS.filter(o => o.value !== "0").map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className="koaj-select"
              style={{ height: '30px', fontSize: '0.75rem', width: '140px', padding: '0 8px' }}
              value={filters.transporter}
              onChange={(e) => set("transporter", e.target.value)}
            >
              <option value="0">Transporte</option>
              {TRANSPORTER_OPTIONS.filter(o => o.value !== "0").map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className="koaj-select"
              style={{ height: '30px', fontSize: '0.75rem', width: '160px', padding: '0 8px' }}
              value={filters.store}
              onChange={(e) => set("store", e.target.value)}
            >
              <option value="0">Tienda</option>
              {STORE_OPTIONS.filter(o => o.value !== "0").map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <div className="ms-auto d-flex gap-2">
              <button
                className="btn-koaj-outline px-3 py-0 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: 'white', borderColor: '#e2e8f0', color: '#64748b', height: '30px', width: '40px' }}
                title="Borrar filtros"
                onClick={() => setFilters(INITIAL_FILTERS)}
              >
                <i className="bi bi-eraser"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="d-flex border-bottom mb-0 bg-white px-3 flex-wrap">
        {[
          { label: "Pendiente", icon: "" },
          { label: "Recogida en Tienda", icon: "bi-box-seam" },
          { label: "Procesados", icon: "bi-check-circle" },
          { label: "Pedido con Incidencia", icon: "bi-exclamation-circle" },
          { label: "Ver Todos", icon: "bi-eye" }
        ].map((tab) => (
          <button
            key={tab.label}
            className={`btn border-0 rounded-0 px-3 py-3 d-flex align-items-center gap-2 small fw-medium ${activeTab === tab.label ? 'border-primary border-bottom border-3 text-primary bg-light bg-opacity-10' : 'text-muted'}`}
            style={{ borderBottomWidth: activeTab === tab.label ? '2px !important' : '0' }}
            onClick={() => setActiveTab(tab.label)}
          >
            {tab.icon && <i className={`bi ${tab.icon}`}></i>}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-100 koaj-table-wrapper border-top-0">
        <table className="koaj-table">
          <thead style={{ backgroundColor: '#003366' }}>
            <tr className="orders-head-row">
              <th className="col-check text-center" style={{ width: '40px' }}>
                <input type="checkbox" />
              </th>
              <th className="fw-bold text-white small" style={{ width: '120px' }}>Asignacion</th>
              <th className="fw-bold text-white small" style={{ width: '100px' }}>Id pedido</th>
              <th className="fw-bold text-white small" style={{ width: '120px' }}>Referencia</th>
              <th className="fw-bold text-white small">Cliente</th>
              <th className="fw-bold text-white small" style={{ width: '80px' }}>Tienda</th>
              <th className="fw-bold text-white small" style={{ width: '150px' }}>Fecha</th>
              <th className="fw-bold text-white small" style={{ width: '130px' }}>Origen</th>
              <th className="fw-bold text-white small" style={{ width: '130px' }}>Servicio</th>
              <th className="fw-bold text-white small" style={{ width: '150px' }}>Estado</th>
              <th className="text-center text-white" style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-muted py-5">
                  No se encontraron pedidos en la categoría <strong>{activeTab}</strong>.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const sColor = badgeColor(order.statusLabel);
                return (
                  <tr key={order.orderId}>
                    <td className="text-center align-middle">
                      <input type="checkbox" />
                    </td>
                    <td className="small">{order.assignment}</td>
                    <td className="fw-bold text-dark">{order.orderId}</td>
                    <td className="small">{order.reference}</td>
                    <td className="small">{order.customer} ({order.customerId})</td>
                    <td className="small">{order.storeNumber}</td>
                    <td className="small">{order.date.split(' ').slice(0, 3).join(' ')}</td>
                    <td className="small">{order.originLabel}</td>
                    <td className="small">{order.service}</td>
                    <td>
                      <span
                        className="badge px-3 py-2 fw-normal border-0"
                        style={{
                          backgroundColor: sColor.bg,
                          color: sColor.color,
                          fontSize: '0.75rem',
                          width: '100%',
                          display: 'block'
                        }}
                      >
                        {order.statusLabel}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn p-0 text-primary"
                          onClick={() => goToDetail(order)}
                          title="Ver detalle"
                        >
                          <i className="bi bi-eye-fill fs-5"></i>
                        </button>
                        <button
                          className="btn p-0 text-primary"
                          onClick={(e) => goToTicket(order, e)}
                          title="Imprimir ticket"
                        >
                          <i className="bi bi-printer-fill fs-5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
