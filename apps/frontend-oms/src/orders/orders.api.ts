const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type OrdersListItem = {
  pedidoId: number;
  id: string;
  reference: string;
  newCustomer: string;
  origin: string;
  delivery: string;
  customer: string;
  total: string;
  payment: string;
  status: string;
  date: string;
  alias: string;
  koajOrderId: number;
  origen: number;
  origenLabel: string;
  origenCanalCodigo: string | null;
  origenCanalNombre: string | null;
  origenConectorCodigo: string | null;
  origenProveedorCodigo: string | null;
  origenIntegracionId: number | null;
  origenExternalOrderId: string | null;
  tiendaOrigenId: number | null;
  tiendaOrigenCodigo: string | null;
  tiendaOrigenNombre: string | null;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (!response.ok) {
    const fallback = "No se pudo completar la operacion";
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : (payload?.message ?? fallback);
    throw new Error(message);
  }

  return payload as T;
}
// TODO: agregar paginacion, filtros, etc a esta funcion cuando sea necesario
export async function listOrders(
  accessToken: string,
): Promise<OrdersListItem[]> {
  const response = await fetch(`${API_URL}/orders`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ orders: OrdersListItem[] }>(
    response,
  );
  return payload.orders;
}

export type SyncPendingOrdersResponse = {
  success: boolean;
  blockedByDiagnostics: boolean;
  summary: {
    pendingReceived: number;
    inserted: number;
    skippedExisting: number;
    skippedValidation: number;
    failed: number;
  };
  diagnostics: Array<{
    code: string;
    ok: boolean;
    message: string;
  }>;
  items: Array<{
    koajOrderId: number;
    numeroPedido: string;
    status: "inserted" | "skipped_existing" | "skipped_validation" | "failed";
    pedidoId: number | null;
    reason: string | null;
  }>;
};

export type AssignmentStrategy = "FALLBACK_FIXED" | "COST_MIN";

export type OrderDetail = {
  pedidoId: number;
  numeroPedido: string;
  numeroExterno: string | null;
  estado: {
    estadoId: number | null;
    codigo: string | null;
    nombre: string | null;
  };
  cliente: {
    nombre: string;
    documento: string | null;
    email: string | null;
    telefono: string | null;
  };
  shipping: {
    direccion: string | null;
    barrio: string | null;
    zip: string | null;
    ciudadId: number | null;
    ciudad: string | null;
    paisId: number | null;
    pais: string | null;
  };
  totales: {
    subtotal: number;
    descuento: number;
    impuestos: number;
    costoEnvio: number;
    total: number;
    monedaId: number | null;
    monedaCodigo: string | null;
    monedaNombre: string | null;
  };
  tiendaOrigen: {
    tiendaId: number | null;
    codigo: string | null;
    nombre: string | null;
    activa: boolean | null;
  };
  empresaId: number;
  createdAt: string;
  updatedAt: string | null;
};

export type AssignmentPreviewResponse = {
  pedidoId: number;
  strategy: AssignmentStrategy;
  estadoActual: {
    estadoId: number | null;
    codigo: string | null;
    nombre: string | null;
  };
  tiendaActual: {
    tiendaId: number | null;
    codigo: string | null;
    nombre: string | null;
    activa: boolean | null;
  };
  zonaEnvio: {
    zonaTransporteId: number;
    codigo: string;
    nombre: string;
  } | null;
  tiendaSugerida: {
    tiendaId: number;
    codigo: string;
    nombre: string;
  } | null;
  transportadoraSugerida: {
    transportadoraId: number;
    codigo: string;
    nombre: string;
  } | null;
  costoSugerido: {
    costoTransporteId: string;
    costo: number;
    diasMin: number | null;
    diasMax: number | null;
    monedaId: number;
    monedaCodigo: string;
  } | null;
  reglas: string[];
  advertencias: string[];
};

export type AssignmentPreviewRequest = {
  storeCodesCandidate?: string[];
  strategy?: AssignmentStrategy;
};

export type AssignmentConfirmRequest = AssignmentPreviewRequest & {
  estadoEntidad?: string;
  estadoCodigo?: string;
};

export type AssignmentConfirmResponse = {
  success: boolean;
  pedidoId: number;
  persisted: {
    store: boolean;
    status: boolean;
    carrier: false;
    carrierLogged: boolean;
  };
  detalle: {
    tiendaAnteriorId: number | null;
    tiendaAplicadaId: number | null;
    estadoAnteriorId: number | null;
    estadoAplicadoId: number;
    transportadoraSugeridaId: number | null;
    costoSugerido: number | null;
  };
  advertencias: string[];
};

export async function syncPendingOrders(
  accessToken: string,
  limit?: number,
): Promise<SyncPendingOrdersResponse> {
  const response = await fetch(`${API_URL}/orders/sync/full`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(limit ? { limit } : {}),
  });

  return parseJsonResponse<SyncPendingOrdersResponse>(response);
}

export async function getOrderDetail(
  accessToken: string,
  pedidoId: number,
): Promise<OrderDetail> {
  const response = await fetch(`${API_URL}/orders/${pedidoId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<{ order: OrderDetail }>(response);
  return payload.order;
}

export async function previewOrderAssignment(
  accessToken: string,
  pedidoId: number,
  request?: AssignmentPreviewRequest,
): Promise<AssignmentPreviewResponse> {
  const response = await fetch(
    `${API_URL}/orders/${pedidoId}/assignment/preview`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request ?? {}),
    },
  );

  return parseJsonResponse<AssignmentPreviewResponse>(response);
}

export async function confirmOrderAssignment(
  accessToken: string,
  pedidoId: number,
  request?: AssignmentConfirmRequest,
): Promise<AssignmentConfirmResponse> {
  const response = await fetch(
    `${API_URL}/orders/${pedidoId}/assignment/confirm`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request ?? {}),
    },
  );

  return parseJsonResponse<AssignmentConfirmResponse>(response);
}
