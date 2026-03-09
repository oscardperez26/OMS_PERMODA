import type { OrderDetail, OrdersListItem } from "../../src/orders/orders.api";

export type StoreOrderItemVm = {
  id: number;
  image: string;
  name: string;
  color: string;
  size: string;
  sku: string;
  reference: string;
  price: number;
};

export type StoreOrderHistoryVm = {
  status: string;
  date: string;
};

export type StoreOrderListItemVm = {
  assignment: string;
  orderId: number;
  reference: string;
  customer: string;
  customerId: string;
  store: string;
  storeName: string;
  storeNumber: string;
  date: string;
  originCode: string;
  originLabel: string;
  service: string;
  transporterCode: string;
  transporterLabel: string;
  statusCode: string;
  statusLabel: string;
};

export type StoreOrderDetailVm = StoreOrderListItemVm & {
  purchaseDate: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  logisticDetails: {
    provider: string;
    id: string;
    logisticStatus: string;
    trackingUrl?: string;
  };
  history: StoreOrderHistoryVm[];
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
  items: StoreOrderItemVm[];
  integrationWarnings: string[];
};

export const STORE_LIST_INTEGRATION_WARNING =
  "Pendiente por integrar: origen comercial, servicio y transportadora en listado de tienda.";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function formatUiDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function normalizeStoreCode(storeId?: string): string {
  const trimmed = storeId?.trim();
  if (!trimmed) {
    return "-";
  }

  if (/^\d+$/.test(trimmed) && trimmed.length < 3) {
    return trimmed.padStart(3, "0");
  }

  return trimmed;
}

function normalizeStatusLabel(rawStatus: string | null): string {
  const normalized = normalizeText(rawStatus ?? "");
  if (normalized.includes("ENTREGADO")) {
    return "Entregado";
  }
  if (normalized.includes("NOVEDAD")) {
    return "Con novedad";
  }
  if (normalized.includes("ALISTA") || normalized.includes("PREPARA")) {
    return "Preparacion en curso";
  }
  if (normalized.includes("ASIGNA") || normalized.includes("CONFIRMA")) {
    return "Asignado";
  }

  const cleaned = rawStatus?.trim();
  return cleaned || "Asignado";
}

function statusCodeFromLabel(statusLabel: string): string {
  const normalized = normalizeText(statusLabel);
  if (normalized.includes("ENTREGADO")) {
    return "5";
  }
  if (normalized.includes("NOVEDAD")) {
    return "8";
  }
  if (normalized.includes("PREPARA") || normalized.includes("ALISTA")) {
    return "17";
  }
  if (normalized.includes("ASIGNADO") || normalized.includes("CONFIRMADO")) {
    return "10";
  }
  return "0";
}

function buildCommonListVm(input: {
  pedidoId: number;
  reference: string;
  customer: string;
  statusLabel: string;
  date: string;
  tiendaOrigenId: number | null;
  tiendaOrigenCodigo: string | null;
  tiendaOrigenNombre: string | null;
  fallbackStoreId?: string;
}): StoreOrderListItemVm {
  const storeNumber =
    input.tiendaOrigenCodigo?.trim() ||
    normalizeStoreCode(input.fallbackStoreId);

  return {
    assignment: input.reference,
    orderId: input.pedidoId,
    reference: input.reference,
    customer: input.customer,
    customerId: "Pendiente por integrar",
    store: input.tiendaOrigenId ? String(input.tiendaOrigenId) : storeNumber,
    storeName: input.tiendaOrigenNombre?.trim() || `Tienda ${storeNumber}`,
    storeNumber,
    date: formatUiDate(input.date),
    originCode: "0",
    originLabel: "Pendiente por integrar",
    service: "Pendiente por integrar",
    transporterCode: "0",
    transporterLabel: "Pendiente por integrar",
    statusCode: statusCodeFromLabel(input.statusLabel),
    statusLabel: input.statusLabel,
  };
}

export function mapOrdersListItemToStoreVm(
  item: OrdersListItem,
  userStoreId?: string,
): StoreOrderListItemVm {
  return buildCommonListVm({
    pedidoId: item.pedidoId,
    reference: item.reference,
    customer: item.customer,
    statusLabel: normalizeStatusLabel(item.status),
    date: item.date,
    tiendaOrigenId: item.tiendaOrigenId,
    tiendaOrigenCodigo: item.tiendaOrigenCodigo,
    tiendaOrigenNombre: item.tiendaOrigenNombre,
    fallbackStoreId: userStoreId,
  });
}

export function mapOrderDetailToStoreVm(
  detail: OrderDetail,
  userStoreId?: string,
): StoreOrderDetailVm {
  const statusLabel = normalizeStatusLabel(detail.estado.nombre);
  const common = buildCommonListVm({
    pedidoId: detail.pedidoId,
    reference: detail.numeroPedido,
    customer: detail.cliente.nombre,
    statusLabel,
    date: detail.createdAt,
    tiendaOrigenId: detail.tiendaOrigen.tiendaId,
    tiendaOrigenCodigo: detail.tiendaOrigen.codigo,
    tiendaOrigenNombre: detail.tiendaOrigen.nombre,
    fallbackStoreId: userStoreId,
  });

  const integrationWarnings = [
    "Pendiente por integrar: origen comercial, transportadora y servicio.",
    "Pendiente por integrar: items detallados del pedido.",
    "Pendiente por integrar: datos de factura/pago transaccional.",
  ];

  return {
    ...common,
    assignment: detail.numeroPedido,
    reference: detail.numeroExterno?.trim() || detail.numeroPedido,
    purchaseDate: formatUiDate(detail.createdAt),
    email: detail.cliente.email ?? "Pendiente por integrar",
    phone: detail.cliente.telefono ?? "Pendiente por integrar",
    address: detail.shipping.direccion ?? "Pendiente por integrar",
    city: detail.shipping.ciudad ?? "Pendiente por integrar",
    logisticDetails: {
      provider: "Pendiente por integrar",
      id: "Pendiente por integrar",
      logisticStatus: "Pendiente por integrar",
    },
    history: [
      {
        status: statusLabel,
        date: formatUiDate(detail.updatedAt ?? detail.createdAt),
      },
    ],
    subtotal: detail.totales.subtotal,
    shippingCost: detail.totales.costoEnvio,
    taxes: detail.totales.impuestos,
    discount: detail.totales.descuento,
    discountCodeValue: "Pendiente por integrar",
    discountReference: "Pendiente por integrar",
    total: detail.totales.total,
    paymentMethod: "Pendiente por integrar",
    transactionId: "Pendiente por integrar",
    cardNo: "Pendiente por integrar",
    transactionValue: detail.totales.total,
    invoiceDate: "Pendiente por integrar",
    invoiceNumber: "Pendiente por integrar",
    items: [
      {
        id: detail.pedidoId,
        image: "https://via.placeholder.com/120x160?text=Pendiente",
        name: detail.numeroPedido,
        color: "Pendiente por integrar",
        size: "Pendiente por integrar",
        sku: "Pendiente por integrar",
        reference: detail.numeroExterno ?? detail.numeroPedido,
        price: detail.totales.subtotal || detail.totales.total,
      },
    ],
    integrationWarnings,
  };
}
