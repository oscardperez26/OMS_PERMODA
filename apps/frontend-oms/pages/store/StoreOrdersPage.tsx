import React, { useState, useEffect } from "react";



// --- INTERFACES ---



export interface OrderItem {

  id: number;

  image: string;

  name: string;

  color: string;

  size: string;

  sku: string;

  reference: string;

}



export interface OrderStatusHistory {

  status: string;

  date: string;

}



export interface LogisticDetails {

  provider: string;

  id: string;

  logisticStatus: string;

  trackingUrl?: string;

}



export interface Order {

  id: number;

  assignment: string;

  orderId: number;

  reference: string;

  date: string;

  purchaseDate: string;

  customer: string;

  customerId: string;

  email: string;

  phone: string;

  address: string;

  city: string;

  store: string;

  storeName: string;

  storeNumber: string;

  originCode: string;

  originLabel: string;

  service: string;

  transporterCode: string;

  transporterLabel: string;

  logisticDetails: LogisticDetails;

  statusCode: string;

  statusLabel: string;

  history: OrderStatusHistory[];

  subtotal: number;

  shippingCost: number;

  taxes: number;

  discount: number;

  discountCodeValue: string;

  discountReference: string;

  total: number;

  paymentMethod: string;

  transactionId: string;

  cardNo: string;

  transactionValue: number;

  invoiceDate: string;

  invoiceNumber: string;

  items: OrderItem[];

}



// --- CONSTANTES DE CONFIGURACIÓN ---



const ORIGIN_OPTIONS = [

  { value: "0", label: "Origen" },

  { value: "1-4", label: "WEB - Colombia" },

  { value: "2-1", label: "Market - Mercado Libre" },

  { value: "2-3", label: "Market - Falabella" }

];



const STATUS_CONFIG: Record<string, { label: string; color: string }> = {

  "5": { label: "Entregado", color: "success" },

  "4": { label: "Despachado", color: "primary" },

  "10": { label: "Confirmado", color: "info" },

  "6": { label: "Cancelado", color: "danger" }

};



const INITIAL_FILTERS = {

  search: "",

  date: "",

  origin: "0",

  status: "0",

  transporter: "0",

  store: "0"

};



// --- COMPONENTE PRINCIPAL ---



export function StoreOrdersPage() {

  const [view, setView] = useState<'list' | 'detail'>('list');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);



  useEffect(() => {

    const mocks: Order[] = [

      {

        id: 1,

        assignment: "WCO-9611",

        orderId: 629,

        reference: "#CPUHFYPGA",

        date: "23 Jun, 2025 22:38",

        purchaseDate: "23 Jun, 2025",

        customer: "Felipe Quintero",

        customerId: "80174626",

        email: "luisfqm@permoda.com.co",

        phone: "3112032171",

        address: "Calle 158 #101B-19",

        city: "BOGOTÁ, D.C.",

        store: "111811",

        storeName: "105 TIENDA KOAJ SALITRE 2",

        storeNumber: "031",

        originCode: "1-4",

        originLabel: "WEB - Colombia",

        service: "Envio a domicilio",

        transporterCode: "17",

        transporterLabel: "CLICOH",

        logisticDetails: { provider: "CLICOH", id: "141799430509", logisticStatus: "Sin estado logístico" },

        statusCode: "5",

        statusLabel: "Entregado",

        history: [{ status: "Pte. Validacion", date: "23 Jun, 2025 22:38" }, { status: "Pendiente de Servir", date: "23 Jun, 2025 22:38" }],

        subtotal: 25900, shippingCost: 6900, taxes: 4135, discount: 0, discountCodeValue: "0", discountReference: "", total: 32800,

        paymentMethod: "Pagos por transferencia bancaria", transactionId: "TRX-9912", cardNo: "", transactionValue: 32800,

        invoiceDate: "23 Jun, 2025", invoiceNumber: "POS-12345",

        items: [{ id: 101, image: "https://via.placeholder.com/150", name: "NEW CLUB 8007", color: "Rojo Oscuro", size: "L", sku: "7702684832757", reference: "105205731219-968" }]

      },

      {

        id: 2,

        assignment: "WCO-9612",

        orderId: 630,

        reference: "#AXZ8821B",

        date: "24 Jun, 2025 10:15",

        purchaseDate: "24 Jun, 2025",

        customer: "Elena Rodríguez",

        customerId: "1020445332",

        email: "elena.rod@gmail.com",

        phone: "3005554433",

        address: "Cra 7 #72-10 Apt 402",

        city: "BOGOTÁ, D.C.",

        store: "1014",

        storeName: "081 TIENDA KOAJ K-60",

        storeNumber: "081",

        originCode: "1-4",

        originLabel: "WEB - Colombia",

        service: "Envio a domicilio",

        transporterCode: "17",

        transporterLabel: "CLICOH",

        logisticDetails: { provider: "CLICOH", id: "141799440001", logisticStatus: "En tránsito" },

        statusCode: "4",

        statusLabel: "Despachado",

        history: [{ status: "Pte. Validacion", date: "24 Jun, 2025 10:15" }, { status: "Despachado", date: "24 Jun, 2025 14:00" }],

        subtotal: 89900, shippingCost: 0, taxes: 14353, discount: 10000, discountCodeValue: "BIENVENIDA10", discountReference: "Cupón Primera Compra", total: 79900,

        paymentMethod: "Tarjeta de Crédito", transactionId: "TRX-10022", cardNo: "**** 4412", transactionValue: 79900,

        invoiceDate: "24 Jun, 2025", invoiceNumber: "POS-12346",

        items: [{ id: 102, image: "https://via.placeholder.com/150", name: "JEAN SLIM FIT AZUL", color: "Azul Indigo", size: "32", sku: "7702684899999", reference: "10882211-001" }]

      },

      {

        id: 3,

        assignment: "ML-5520",

        orderId: 631,

        reference: "2000003412",

        date: "25 Jun, 2025 08:45",

        purchaseDate: "25 Jun, 2025",

        customer: "Marcos Aurelio",

        customerId: "79443221",

        email: "maurelio_90@hotmail.com",

        phone: "3158887766",

        address: "Calle 100 #15-20",

        city: "BOGOTÁ, D.C.",

        store: "1013",

        storeName: "037 T.KOAJ CALLE 18 MONTEVIDEO",

        storeNumber: "037",

        originCode: "2-1",

        originLabel: "Market - Mercado Libre",

        service: "Envio a domicilio",

        transporterCode: "05",

        transporterLabel: "SERVIENTREGA",

        logisticDetails: { provider: "SERVIENTREGA", id: "9982211002", logisticStatus: "Entregado a transportadora" },

        statusCode: "10",

        statusLabel: "Confirmado",

        history: [{ status: "Pte. Validacion", date: "25 Jun, 2025 08:45" }, { status: "Confirmado", date: "25 Jun, 2025 09:00" }],

        subtotal: 45000, shippingCost: 7500, taxes: 7185, discount: 0, discountCodeValue: "", discountReference: "", total: 52500,

        paymentMethod: "MercadoPago", transactionId: "MP-998877", cardNo: "", transactionValue: 52500,

        invoiceDate: "", invoiceNumber: "Sin factura",

        items: [{ id: 103, image: "https://via.placeholder.com/150", name: "T-SHIRT BASIC WHITE", color: "Blanco", size: "M", sku: "7702684111222", reference: "20551100-10" }]

      },

      {

        id: 4,

        assignment: "FAL-8891",

        orderId: 632,

        reference: "FAL-CO-10029",

        date: "25 Jun, 2025 15:30",

        purchaseDate: "25 Jun, 2025",

        customer: "Paola Casallas",

        customerId: "52441009",

        email: "p.casallas@outlook.com",

        phone: "3124443322",

        address: "Av. Siempre Viva 123",

        city: "BOGOTÁ, D.C.",

        store: "111811",

        storeName: "105 TIENDA KOAJ SALITRE 2",

        storeNumber: "031",

        originCode: "2-3",

        originLabel: "Market - Falabella",

        service: "Envio a domicilio",

        transporterCode: "17",

        transporterLabel: "CLICOH",

        logisticDetails: { provider: "CLICOH", id: "141799558877", logisticStatus: "Sin estado logístico" },

        statusCode: "6",

        statusLabel: "Cancelado",

        history: [{ status: "Pte. Validacion", date: "25 Jun, 2025 15:30" }, { status: "Cancelado", date: "25 Jun, 2025 16:00" }],

        subtotal: 120000, shippingCost: 0, taxes: 19159, discount: 0, discountCodeValue: "", discountReference: "", total: 120000,

        paymentMethod: "CMR Falabella", transactionId: "FAL-00912", cardNo: "**** 1111", transactionValue: 120000,

        invoiceDate: "", invoiceNumber: "Sin factura",

        items: [{ id: 104, image: "https://via.placeholder.com/150", name: "CHAQUETA BIKER NEGRA", color: "Negro", size: "S", sku: "7702684998877", reference: "30559988-900" }]

      },

      {

        id: 5,

        assignment: "WCO-9615",

        orderId: 633,

        reference: "#GGYT771",

        date: "26 Jun, 2025 09:00",

        purchaseDate: "26 Jun, 2025",

        customer: "Ricardo Arjona",

        customerId: "1018223344",

        email: "arjona.fanz@gmail.com",

        phone: "3201112233",

        address: "Calle 80 #45-10",

        city: "BOGOTÁ, D.C.",

        store: "1012",

        storeName: "031 TIENDA KOAJ CAFAM FLORESTA",

        storeNumber: "031",

        originCode: "1-4",

        originLabel: "WEB - Colombia",

        service: "Envio a domicilio",

        transporterCode: "17",

        transporterLabel: "CLICOH",

        logisticDetails: { provider: "CLICOH", id: "141799665544", logisticStatus: "Entregado" },

        statusCode: "5",

        statusLabel: "Entregado",

        history: [{ status: "Pte. Validacion", date: "26 Jun, 2025 09:00" }, { status: "Entregado", date: "26 Jun, 2025 18:00" }],

        subtotal: 35000, shippingCost: 6900, taxes: 5588, discount: 0, discountCodeValue: "", discountReference: "", total: 41900,

        paymentMethod: "Pagos por transferencia bancaria", transactionId: "TRX-55443", cardNo: "", transactionValue: 41900,

        invoiceDate: "26 Jun, 2025", invoiceNumber: "POS-99881",

        items: [{ id: 105, image: "https://via.placeholder.com/150", name: "GORRA URBAN STYLE", color: "Gris", size: "Única", sku: "7702684223344", reference: "90881122-00" }]

      },

      {

        id: 6,

        assignment: "WCO-9616",

        orderId: 634,

        reference: "#ZXY001",

        date: "26 Jun, 2025 11:30",

        purchaseDate: "26 Jun, 2025",

        customer: "Lucia Méndez",

        customerId: "41998776",

        email: "lucia_m@permoda.com.co",

        phone: "3187776655",

        address: "Carrera 15 #124-30",

        city: "BOGOTÁ, D.C.",

        store: "1014",

        storeName: "081 TIENDA KOAJ K-60",

        storeNumber: "081",

        originCode: "1-4",

        originLabel: "WEB - Colombia",

        service: "Envio a domicilio",

        transporterCode: "17",

        transporterLabel: "CLICOH",

        logisticDetails: { provider: "CLICOH", id: "141799770011", logisticStatus: "Sin estado logístico" },

        statusCode: "10",

        statusLabel: "Confirmado",

        history: [{ status: "Pte. Validacion", date: "26 Jun, 2025 11:30" }],

        subtotal: 55000, shippingCost: 6900, taxes: 8781, discount: 5000, discountCodeValue: "PUNTOS10", discountReference: "Canje Puntos", total: 56900,

        paymentMethod: "Gift Card", transactionId: "GC-009988", cardNo: "123456789", transactionValue: 56900,

        invoiceDate: "26 Jun, 2025", invoiceNumber: "POS-10022",

        items: [{ id: 106, image: "https://via.placeholder.com/150", name: "VESTIDO CORTO PRINT", color: "Flores", size: "M", sku: "7702684000111", reference: "50442233-101" }]

      }

    ];

    setOrders(mocks);

    setFilteredOrders(mocks);

  }, []);



  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {

    const { name, value } = e.target;

    setFilters(prev => ({ ...prev, [name]: value }));

  };



  const applyFilters = () => {

    let result = orders.filter(o => {

      const s = filters.search.toLowerCase();

      const matchSearch = s === "" || o.assignment.toLowerCase().includes(s) || o.customer.toLowerCase().includes(s) || o.orderId.toString().includes(s);

      const matchOrigin = filters.origin === "0" || o.originCode === filters.origin;

      const matchStatus = filters.status === "0" || o.statusCode === filters.status;

      const matchStore = filters.store === "0" || o.storeNumber === filters.store;

      const matchTransporter = filters.transporter === "0" || o.transporterCode === filters.transporter;

      return matchSearch && matchOrigin && matchStatus && matchStore && matchTransporter;

    });

    setFilteredOrders(result);

  };



  if (view === 'detail' && selectedOrder) {

    return <OrderDetailPage order={selectedOrder} onBack={() => setView('list')} />;

  }



  return (

    <div className="container-fluid mt-4 px-4">

      <h4 className="mb-4 fw-bold">Listado de pedidos - <span className="text-primary">GESTOR OMS</span></h4>



      {/* PANEL DE FILTROS RESTAURADO */}

      <div className="card shadow-sm mb-4 p-3 border-0 bg-white">

        <div className="row g-2 align-items-center mb-3">

          <div className="col-md-4">

            <div className="input-group">

              <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>

              <input type="text" className="form-control border-start-0" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Buscar por Id de pedido, producto, origen..." />

            </div>

          </div>

          <div className="col-md-2">

            <input type="date" className="form-control" name="date" value={filters.date} onChange={handleFilterChange} />

          </div>

          <div className="col-md-3">

            <select className="form-select" name="origin" value={filters.origin} onChange={handleFilterChange}>

              {ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}

            </select>

          </div>

          <div className="col-md-3 d-flex gap-2">

            <button className="btn btn-primary flex-grow-1" onClick={applyFilters}><i className="bi bi-funnel"></i> Filtrar</button>

            <button className="btn btn-warning text-white" onClick={() => { setFilters(INITIAL_FILTERS); setFilteredOrders(orders); }}><i className="bi bi-eraser"></i> Borrar</button>

            <button className="btn btn-info text-white" onClick={() => setShowMoreFilters(!showMoreFilters)}>

              <i className={`bi bi-${showMoreFilters ? 'dash' : 'plus'}-square`}></i> Otros filtros

            </button>

          </div>

        </div>



        {showMoreFilters && (

          <div className="row g-2 animate__animated animate__fadeIn">

            <div className="col-md-4">

              <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>

                <option value="0">Estado de pedido</option>

                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}

              </select>

            </div>

            <div className="col-md-4">

              <select className="form-select" name="transporter" value={filters.transporter} onChange={handleFilterChange}>

                <option value="0">Transportadora</option>

                <option value="17">CLICOH</option>

                <option value="05">SERVIENTREGA</option>

              </select>

            </div>

            <div className="col-md-4">

              <select className="form-select" name="store" value={filters.store} onChange={handleFilterChange}>

                <option value="0">Todas las tiendas</option>

                <option value="031">031 TIENDA KOAJ CAFAM FLORESTA</option>

                <option value="105">105 TIENDA KOAJ SALITRE 2</option>

                <option value="081">081 TIENDA KOAJ K-60</option>

              </select>

            </div>

          </div>

        )}

      </div>



      {/* TABLA DE RESULTADOS */}

      <div className="table-responsive shadow-sm rounded border bg-white">

        <table className="table table-hover align-middle mb-0">

          <thead className="table-light">

            <tr className="small text-uppercase text-muted">

              <th style={{ width: '40px' }}></th>

              <th>Asignación</th>

              <th>Tienda</th>

              <th>Cliente</th>

              <th>Fecha</th>

              <th>Origen</th>

              <th>Servicio</th>

              <th>Estado</th>

              <th className="text-center">Acción</th>

            </tr>

          </thead>

          <tbody>

            {filteredOrders.map(order => (

              <React.Fragment key={order.id}>

                <tr onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} style={{ cursor: 'pointer' }}>

                  <td className="text-center text-muted small">{expandedOrderId === order.id ? '▼' : '▶'}</td>

                  <td className="fw-bold text-primary">{order.assignment}</td>

                  <td><span className="badge bg-light text-dark border">{order.storeNumber}</span></td>

                  <td className="small">{order.customer}</td>

                  <td className="small">{order.date}</td>

                  <td className="small">{order.originLabel}</td>

                  <td className="small">{order.service}</td>

                  <td>

                    <span className={`badge bg-${STATUS_CONFIG[order.statusCode]?.color || "secondary"} border`}>

                      {order.statusLabel}

                    </span>

                  </td>

                  <td className="text-center">

                    <button className="btn btn-sm btn-outline-primary px-3 fw-bold" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setView('detail'); }}>

                      Ver detalle

                    </button>

                  </td>

                </tr>

                {expandedOrderId === order.id && (

                  <tr className="bg-light">

                    <td colSpan={9} className="p-3">

                      <div className="d-flex gap-4 bg-white p-3 rounded shadow-sm border mx-4">

                        <img src={order.items[0].image} alt="p" style={{ width: '80px', height: '110px', objectFit: 'cover' }} className="rounded border" />

                        <div className="flex-grow-1">

                          <h6 className="fw-bold mb-1">{order.items[0].name}</h6>

                          <div className="row small text-muted">

                            <div className="col-md-4"><strong>SKU:</strong> {order.items[0].sku}</div>

                            <div className="col-md-4"><strong>Color:</strong> {order.items[0].color}</div>

                            <div className="col-md-4"><strong>Talla:</strong> {order.items[0].size}</div>

                          </div>

                          <button className="btn btn-sm btn-primary mt-2" onClick={() => { setSelectedOrder(order); setView('detail'); }}>Ir a la asignación</button>

                        </div>

                      </div>

                    </td>

                  </tr>

                )}

              </React.Fragment>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}



// --- VISTA DETALLE ---



function OrderDetailPage({ order, onBack }: { order: Order; onBack: () => void }) {

  return (

    <div className="container-fluid p-4 bg-light min-vh-100">

      <div className="d-flex justify-content-between align-items-center mb-3 bg-white p-3 rounded border shadow-sm">

        <div className="d-flex align-items-center gap-3">

          <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>←</button>

          <h5 className="mb-0 fw-bold">Asign. {order.assignment}</h5>

          <span className="text-muted small">ID {order.orderId} | Ref {order.reference}</span>

          <div className="d-flex gap-2 ms-2 border-start ps-3">

            <span className="badge bg-light text-dark border">{order.storeNumber}</span>

            <span className={`badge bg-${STATUS_CONFIG[order.statusCode]?.color || "secondary"}`}>{order.statusLabel}</span>

          </div>

        </div>

        <div className="d-flex gap-2">

          <button className="btn btn-outline-primary btn-sm">Imprimir búsqueda</button>

          <button className="btn btn-primary btn-sm">Imprimir ticket</button>

        </div>

      </div>



      <div className="row g-3">

        <div className="col-lg-9">

          <div className="card mb-3 border-0 shadow-sm">

            <div className="card-header bg-white py-3 fw-bold text-muted small text-uppercase">Detalles pedido</div>

            <div className="card-body">

              {order.items.map(item => (

                <div key={item.id} className="d-flex gap-4 border-bottom pb-3 mb-3">

                  <img src={item.image} alt="p" style={{ width: '110px', height: '150px', objectFit: 'cover' }} className="rounded border" />

                  <div className="flex-grow-1">

                    <h6 className="fw-bold mb-1 text-primary">{item.name}</h6>

                    <div className="small text-muted mb-2">

                      color: {item.color} <br /> talla: {item.size} <br />

                      SKU: {item.sku} <br /> Referencia: {item.reference} <br />

                      Cantidad: 1 | <span className="fw-bold text-dark">Envío normal</span>

                    </div>

                    <span className="badge bg-info-subtle text-info border border-info-subtle">Estado detalle: Confirmado</span>

                  </div>

                </div>

              ))}

              <div className="text-end"><button className="btn btn-sm btn-light border text-muted">Acciones agrupadas</button></div>

            </div>

          </div>



          <div className="row g-3">

            <div className="col-md-6">

              <div className="card border-0 shadow-sm h-100">

                <div className="card-header bg-white py-3 fw-bold text-muted small text-uppercase">Estado de pedido</div>

                <div className="card-body small vstack gap-2">

                  {["Pte. Validacion", "Pendiente de Servir", "Descargado ICG", "Listo para generar guía", "Entregado"].map((step, i) => (

                    <div key={i} className="d-flex gap-2 align-items-center">

                      <i className={`bi bi-circle-fill ${step === order.statusLabel ? 'text-success' : 'text-info'}`} style={{ fontSize: '8px' }}></i>

                      <span><strong>{step}</strong> - {order.date}</span>

                    </div>

                  ))}

                </div>

              </div>

            </div>

            <div className="col-md-6">

              <div className="card border-0 shadow-sm mb-3">

                <div className="card-header bg-white py-3 fw-bold text-muted small text-uppercase">Datos facturación</div>

                <div className="card-body small d-flex justify-content-between">

                  <div><strong>Pedido POS</strong> <p className="text-muted mb-0">{order.invoiceNumber !== "Sin factura" ? "Generado" : "Sin POS"}</p></div>

                  <div><strong>Factura</strong> <p className="text-muted mb-0">{order.invoiceNumber}</p></div>

                </div>

              </div>

              <div className="card border-0 shadow-sm">

                <div className="card-header bg-white py-3 fw-bold text-muted small text-uppercase">Resumen de pedido</div>

                <div className="card-body small">

                  <div className="d-flex justify-content-between mb-1"><span>Sub total:</span> <span>${order.subtotal.toLocaleString()}</span></div>

                  <div className="d-flex justify-content-between mb-1"><span>Gastos de envío:</span> <span>${order.shippingCost.toLocaleString()}</span></div>

                  <div className="d-flex justify-content-between mb-1"><span>Impuestos:</span> <span>${order.taxes.toLocaleString()}</span></div>

                  {order.discount > 0 && <div className="d-flex justify-content-between mb-1 text-danger"><span>Descuento:</span> <span>-${order.discount.toLocaleString()}</span></div>}

                  <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-2 h6 text-primary">

                    <span>Total(COP)</span> <span>${order.total.toLocaleString()}</span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>



        <div className="col-lg-3">

          <div className="card border-0 shadow-sm mb-3 text-center p-3">

            <div className="d-flex justify-content-between mb-3 border-bottom pb-2">

              <span className="fw-bold text-muted small text-uppercase">Detalles logísticos</span>

              <button className="btn btn-link btn-sm p-0 text-muted"><i className="bi bi-printer"></i></button>

            </div>

            <div className="display-6 text-muted mb-2"><i className="bi bi-truck"></i></div>

            <h6 className="fw-bold">{order.logisticDetails.provider} - BOGOTA</h6>

            <div className="small text-muted mb-2">ID: {order.logisticDetails.id}</div>

            <div className="small text-muted mb-3">{order.logisticDetails.logisticStatus}</div>

            <button className="btn btn-outline-secondary btn-sm w-100 mb-2">Consultar seguimiento</button>

            <button className="btn btn-outline-primary btn-sm w-100">Imprimir guía</button>

          </div>



          <div className="card border-0 shadow-sm mb-3">

            <div className="card-header bg-white py-3 fw-bold text-muted small text-uppercase">Dirección tienda envío</div>

            <div className="card-body small">

              <div className="fw-bold">{order.storeName}</div>

              <div className="text-muted">{order.store} | Cundinamarca</div>

            </div>

          </div>



          <div className="card border-0 shadow-sm mb-3">

            <div className="card-header bg-white py-3 fw-bold text-muted small text-uppercase">Detalles de factura</div>

            <div className="card-body small">

              <div className="fw-bold">{order.customer}</div>

              <div className="text-muted small">DNI: {order.customerId}</div>

              <div className="text-muted small">{order.address}</div>

              <div className="text-muted small">{order.city}</div>

              <div className="text-primary small">{order.email}</div>

              <div className="text-muted small">{order.phone}</div>

            </div>

          </div>



          <div className="card border-0 shadow-sm">

            <div className="card-header bg-white py-3 fw-bold text-muted small text-uppercase">Información pago</div>

            <div className="card-body small">

              <div><strong>Método:</strong> {order.paymentMethod}</div>

              <div><strong>Total pago:</strong> ${order.total.toLocaleString()}</div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}