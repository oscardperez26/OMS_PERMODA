/**
 * storeOrdersMock.ts
 * ------------------
 * Fuente de datos compartida para el módulo de pedidos de tienda.
 *
 * ¿Por qué existe este archivo?
 * - Separa los datos de la lógica de presentación.
 * - Permite que tanto `StoreOrdersPage` (lista) como
 *   `StoreOrderDetailPage` (detalle) usen los mismos datos
 *   sin duplicación de código.
 *
 * Cuando haya una API real:
 * - Este archivo se reemplaza por llamadas al servicio:
 *   `ordersService.getAll()` y `ordersService.getById(id)`.
 * - Las interfaces se pueden mover a un archivo `store.types.ts`
 *   si crecen mucho.
 */

// ─────────────────────────────────────────────
// INTERFACES (contratos de tipo de datos)
// ─────────────────────────────────────────────

/** Un artículo dentro de un pedido */
export interface OrderItem {
    id: number;
    image: string;
    name: string;
    color: string;
    size: string;
    sku: string;
    reference: string;
    price: number;
}

/** Un paso del historial de estado del pedido */
export interface OrderStatusHistory {
    status: string;
    date: string;
}

/** Información logística del transportador */
export interface LogisticDetails {
    provider: string;
    id: string;
    logisticStatus: string;
    trackingUrl?: string;
}

/** Pedido completo */
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

// ─────────────────────────────────────────────
// CONFIGURACIÓN DE ESTADOS (badge colors)
// ─────────────────────────────────────────────

/**
 * STATUS_CONFIG
 * Mapea cada código de estado a su etiqueta visual y color Bootstrap.
 * Usado tanto en la tabla de lista como en la página de detalle.
 */
export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    "5": { label: "Entregado", color: "success" },
    "4": { label: "Despachado", color: "primary" },
    "10": { label: "Confirmado", color: "info" },
    "6": { label: "Cancelado", color: "danger" },
};

// ─────────────────────────────────────────────
// DATOS MOCK
// ─────────────────────────────────────────────

/**
 * STORE_ORDERS_MOCK
 * -----------------
 * Lista de pedidos de ejemplo.
 *
 * Estos datos simulan la respuesta del backend.
 * Cuando la API esté lista, este array se elimina
 * y se reemplaza por una llamada HTTP.
 */
export const STORE_ORDERS_MOCK: Order[] = [
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
        history: [
            { status: "Pte. Validacion", date: "23 Jun, 2025 22:38" },
            { status: "Pendiente de Servir", date: "23 Jun, 2025 22:38" },
        ],
        subtotal: 25900, shippingCost: 6900, taxes: 4135, discount: 0,
        discountCodeValue: "0", discountReference: "", total: 32800,
        paymentMethod: "Pagos por transferencia bancaria",
        transactionId: "TRX-9912", cardNo: "", transactionValue: 32800,
        invoiceDate: "23 Jun, 2025", invoiceNumber: "POS-12345",
        items: [
            {
                id: 101, image: "https://via.placeholder.com/150", name: "NEW CLUB 8007",
                color: "Rojo Oscuro", size: "L", sku: "7702684832757", reference: "105205731219-968", price: 25900
            },
        ],
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
        history: [
            { status: "Pte. Validacion", date: "24 Jun, 2025 10:15" },
            { status: "Despachado", date: "24 Jun, 2025 14:00" },
        ],
        subtotal: 89900, shippingCost: 0, taxes: 14353, discount: 10000,
        discountCodeValue: "BIENVENIDA10", discountReference: "Cupón Primera Compra", total: 79900,
        paymentMethod: "Tarjeta de Crédito",
        transactionId: "TRX-10022", cardNo: "**** 4412", transactionValue: 79900,
        invoiceDate: "24 Jun, 2025", invoiceNumber: "POS-12346",
        items: [
            {
                id: 102, image: "https://via.placeholder.com/150", name: "JEAN SLIM FIT AZUL",
                color: "Azul Indigo", size: "32", sku: "7702684899999", reference: "10882211-001", price: 89900
            },
        ],
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
        history: [
            { status: "Pte. Validacion", date: "25 Jun, 2025 08:45" },
            { status: "Confirmado", date: "25 Jun, 2025 09:00" },
        ],
        subtotal: 45000, shippingCost: 7500, taxes: 7185, discount: 0,
        discountCodeValue: "", discountReference: "", total: 52500,
        paymentMethod: "MercadoPago",
        transactionId: "MP-998877", cardNo: "", transactionValue: 52500,
        invoiceDate: "", invoiceNumber: "Sin factura",
        items: [
            {
                id: 103, image: "https://via.placeholder.com/150", name: "T-SHIRT BASIC WHITE",
                color: "Blanco", size: "M", sku: "7702684111222", reference: "20551100-10", price: 45000
            },
        ],
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
        history: [
            { status: "Pte. Validacion", date: "25 Jun, 2025 15:30" },
            { status: "Cancelado", date: "25 Jun, 2025 16:00" },
        ],
        subtotal: 120000, shippingCost: 0, taxes: 19159, discount: 0,
        discountCodeValue: "", discountReference: "", total: 120000,
        paymentMethod: "CMR Falabella",
        transactionId: "FAL-00912", cardNo: "**** 1111", transactionValue: 120000,
        invoiceDate: "", invoiceNumber: "Sin factura",
        items: [
            {
                id: 104, image: "https://via.placeholder.com/150", name: "CHAQUETA BIKER NEGRA",
                color: "Negro", size: "S", sku: "7702684998877", reference: "30559988-900", price: 120000
            },
        ],
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
        history: [
            { status: "Pte. Validacion", date: "26 Jun, 2025 09:00" },
            { status: "Entregado", date: "26 Jun, 2025 18:00" },
        ],
        subtotal: 35000, shippingCost: 6900, taxes: 5588, discount: 0,
        discountCodeValue: "", discountReference: "", total: 41900,
        paymentMethod: "Pagos por transferencia bancaria",
        transactionId: "TRX-55443", cardNo: "", transactionValue: 41900,
        invoiceDate: "26 Jun, 2025", invoiceNumber: "POS-99881",
        items: [
            {
                id: 105, image: "https://via.placeholder.com/150", name: "GORRA URBAN STYLE",
                color: "Gris", size: "Única", sku: "7702684223344", reference: "90881122-00", price: 35000
            },
        ],
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
        subtotal: 55000, shippingCost: 6900, taxes: 8781, discount: 5000,
        discountCodeValue: "PUNTOS10", discountReference: "Canje Puntos", total: 56900,
        paymentMethod: "Gift Card",
        transactionId: "GC-009988", cardNo: "123456789", transactionValue: 56900,
        invoiceDate: "26 Jun, 2025", invoiceNumber: "POS-10022",
        items: [
            {
                id: 106, image: "https://via.placeholder.com/150", name: "VESTIDO CORTO PRINT",
                color: "Flores", size: "M", sku: "7702684000111", reference: "50442233-101", price: 55000
            },
        ],
    },
];
