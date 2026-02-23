
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
  // Identificación y General
  id: number;
  assignment: string;    // Ejemplo: WCO-9611
  orderId: number;      // Número de subpedido / pedido POS
  reference: string;    // Referencia pedido original
  date: string;         // Fecha y hora completa del pedido
  purchaseDate: string; // Fecha de compra simple
  
  // Cliente y Contacto
  customer: string;     // Nombre del cliente
  customerId: string;   // Identificación (DNI/Cédula)
  email: string;
  phone: string;
  address: string;
  city: string;
  
  // Ubicación y Canal
  store: string;        // ID de la tienda (ej: 111811)
  storeName: string;    // Nombre legible (ej: 105 TIENDA KOAJ SALITRE 2)
  storeNumber: string;  // Número de tienda (ej: 105)
  originCode: string;   // Código técnico del canal
  originLabel: string;  // Nombre del canal (ej: WEB - Colombia)
  
  // Logística y Servicio
  service: string;           // Ej: Envío a domicilio
  transporterCode: string;
  transporterLabel: string;  // Nombre de la transportadora
  logisticDetails: LogisticDetails;
  
  // Estado
  statusCode: string;
  statusLabel: string;       // Estado actual (ej: Entregado)
  history: OrderStatusHistory[];
  
  // Financiero y Facturación
  subtotal: number;
  shippingCost: number;      // Gastos de envío
  taxes: number;             // Impuestos
  discount: number;
  discountCodeValue: string; // Código del cupón
  discountReference: string; // Nombre de la promoción
  total: number;             // Total en COP
  
  // Pago y Factura
  paymentMethod: string;     // Forma de pago
  transactionId: string;     // ID de transacción FP
  cardNo: string;            // Nro Tarjeta (Ogloba u otros)
  transactionValue: number;
  invoiceDate: string;       // Fecha y hora factura
  invoiceNumber: string;     // Número de factura / Factura POS
  
  // Productos
  items: OrderItem[];
}