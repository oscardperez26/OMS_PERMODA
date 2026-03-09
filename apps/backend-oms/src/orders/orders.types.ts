export type KoajPsOrder = {
  id?: number | string;
  reference?: string;
  id_shop?: number | string;
  id_address_delivery?: number | string;
  id_customer?: number | string;
  date_add?: string;
  total_discounts?: number | string;
  total_discounts_tax_incl?: number | string;
  total_paid?: number | string;
  total_paid_tax_incl?: number | string;
  total_paid_tax_excl?: number | string;
  total_products?: number | string;
  total_products_wt?: number | string;
  total_shipping?: number | string;
  total_shipping_tax_incl?: number | string;
};

export type KoajPsOrdersResponse = {
  orders?: KoajPsOrder[];
};

export type KoajPsAddress = {
  id?: number | string;
  firstname?: string;
  lastname?: string;
  city?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  phone?: string;
  phone_mobile?: string;
};

export type KoajPsAddressResponse = {
  address?: KoajPsAddress;
  addresses?: KoajPsAddress[];
};

export type KoajPsCustomer = {
  id?: number | string;
  firstname?: string;
  lastname?: string;
  email?: string;
  dni?: string;
};

export type KoajPsCustomerResponse = {
  customer?: KoajPsCustomer;
  customers?: KoajPsCustomer[];
};

export type OrderListItem = {
  pedidoId: number;
  id: string;
  reference: string;
  newCustomer: string;
  delivery: string;
  customer: string;
  total: string;
  payment: string;
  status: string;
  date: string;
  alias: string;
  koajOrderId: number;
  origen: number;
  tiendaOrigenId: number | null;
  tiendaOrigenCodigo: string | null;
  tiendaOrigenNombre: string | null;
};

export type OrdersSyncContext = {
  empresaId: number | null;
  tiendaId: number | null;
  monedaId: number | null;
  estadoId: number | null;
  paisId: number | null;
  canales: Array<{
    canalVentaId: number;
    codigo: string;
  }>;
  ciudades: Array<{
    ciudadId: number;
    nombre: string;
  }>;
};

export type CreatePedidoInput = {
  empresaId: number;
  empresaClienteId: number | null;
  canalVentaId: number;
  tiendaOrigenId: number | null;
  monedaId: number;
  numeroPedido: string;
  numeroExterno: string | null;
  estadoId: number;
  clienteNombre: string;
  clienteDocumento: string | null;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  shippingPaisId: number | null;
  shippingCiudadId: number | null;
  shippingDireccion: string | null;
  shippingBarrio: string | null;
  shippingZip: string | null;
  subtotal: number;
  descuento: number;
  impuestos: number;
  costoEnvio: number;
  total: number;
  pasarelaPagoId: number | null;
  pagoReferencia: string | null;
  pagoEstadoId: number | null;
  createdAt: Date;
};

export type PedidoListRow = {
  pedidoId: number;
  numeroPedido: string;
  numeroExterno: string | null;
  clienteNombre: string;
  total: number;
  createdAt: string;
  estadoCodigo: string | null;
  estadoNombre: string | null;
  paisNombre: string | null;
  tiendaOrigenId: number | null;
  tiendaOrigenCodigo: string | null;
  tiendaOrigenNombre: string | null;
};

export type PedidoDetail = {
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

export type AssignmentStrategy = 'FALLBACK_FIXED' | 'COST_MIN';

export type AssignmentPreview = {
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

export type AssignmentConfirmResult = {
  success: true;
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

export type SyncDiagnostic = {
  code: string;
  ok: boolean;
  message: string;
};

export type SyncPendingItemResult = {
  koajOrderId: number;
  numeroPedido: string;
  status: 'inserted' | 'skipped_existing' | 'skipped_validation' | 'failed';
  pedidoId: number | null;
  reason: string | null;
};

export type SyncPendingSummary = {
  pendingReceived: number;
  inserted: number;
  skippedExisting: number;
  skippedValidation: number;
  failed: number;
};

export type SyncPendingResult = {
  success: true;
  blockedByDiagnostics: boolean;
  summary: SyncPendingSummary;
  diagnostics: SyncDiagnostic[];
  items: SyncPendingItemResult[];
};
