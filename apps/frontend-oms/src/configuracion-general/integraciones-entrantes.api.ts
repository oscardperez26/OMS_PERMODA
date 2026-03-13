const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type IntegracionEntranteOperationStatus = 'OK' | 'BLOCKED' | 'FAILED';

export type IntegracionEntranteDiagnosticsSummary = {
  total: number;
  ok: number;
  failed: number;
  failedCodes: string[];
};

export type IntegracionEntranteConfig = {
  flowType: 'INBOUND';
  providerCode: string;
  mode: 'KOAJ_PILOT' | 'GENERIC';
  connection: {
    baseUrl: string | null;
    authType: 'API_KEY';
    timeoutMs: number;
  };
  endpoints: {
    listConfirmedOrdersEndpoint: string | null;
    orderDetailEndpoint: string | null;
  };
  filters: {
    confirmedStatuses: string[];
  };
  mapping: {
    externalOrderIdField: string | null;
    externalReferenceField: string | null;
    customerNameField: string | null;
    totalField: string | null;
    statusField: string | null;
  };
  validation: {
    isValid: boolean;
    status: IntegracionEntranteOperationStatus;
    message: string;
    errors: string[];
    validatedAt: string | null;
    runId: string | null;
    durationMs: number | null;
    executedBy: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    diagnosticsSummary: IntegracionEntranteDiagnosticsSummary | null;
  };
  lastSync: {
    runId: string;
    executedAt: string;
    status: IntegracionEntranteOperationStatus;
    message: string;
    success: boolean;
    blockedByDiagnostics: boolean;
    pendingReceived: number;
    ingested: number;
    duplicated: number;
    skippedValidation: number;
    failed: number;
    durationMs: number | null;
    executedBy: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    diagnosticsSummary: IntegracionEntranteDiagnosticsSummary | null;
  } | null;
};

export type IntegracionEntranteDedupeSummary = {
  total: number;
  ingestado: number;
  duplicado: number;
  failed: number;
  lastUpdatedAt: string | null;
};

export type IntegracionEntranteListItem = {
  integracionId: number;
  empresaId: number;
  empresaCodigo: string;
  empresaNombre: string;
  canalVentaId: number;
  canalVentaCodigo: string;
  canalVentaNombre: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  config: IntegracionEntranteConfig;
  dedupe: IntegracionEntranteDedupeSummary | null;
  createdAt: string;
  updatedAt: string | null;
};

export type IntegracionEntranteRunLog = {
  runId: string;
  status: IntegracionEntranteOperationStatus;
  message: string;
  executedAt: string;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  summary: {
    pendingReceived: number;
    ingested: number;
    duplicated: number;
    skippedValidation: number;
    failed: number;
  };
};

export type IntegracionesEntrantesBootstrapResponse = {
  integracionesEntrantes: IntegracionEntranteListItem[];
  empresas: Array<{
    empresaId: number;
    codigo: string;
    nombre: string;
  }>;
  canalesVenta: Array<{
    canalVentaId: number;
    empresaId: number;
    codigo: string;
    nombre: string;
  }>;
  templates: Array<{
    id: string;
    label: string;
    description: string;
    providerCode: string;
    mode: 'KOAJ_PILOT' | 'GENERIC';
    connection: {
      baseUrl: string;
      authType: 'API_KEY';
      timeoutMs: number;
    };
    endpoints: {
      listConfirmedOrdersEndpoint: string;
      orderDetailEndpoint: string;
    };
    filters: {
      confirmedStatuses: string[];
    };
    mapping: {
      externalOrderIdField: string;
      externalReferenceField: string;
      customerNameField: string;
      totalField: string;
      statusField: string;
    };
  }>;
  zonaIntegracion: {
    enabled: false;
    status: 'PENDIENTE';
    message: string;
  };
};

export type CreateIntegracionEntranteRequest = {
  empresaId: number;
  canalVentaId: number;
  codigo: string;
  nombre: string;
  activo?: boolean;
  providerCode: string;
  mode?: 'KOAJ_PILOT' | 'GENERIC';
  baseUrl?: string | null;
  authType?: 'API_KEY';
  timeoutMs?: number;
  listConfirmedOrdersEndpoint?: string | null;
  orderDetailEndpoint?: string | null;
  confirmedStatuses?: string[];
  externalOrderIdField?: string | null;
  externalReferenceField?: string | null;
  customerNameField?: string | null;
  totalField?: string | null;
  statusField?: string | null;
};

export type UpdateIntegracionEntranteRequest =
  Partial<CreateIntegracionEntranteRequest>;

export type SyncIntegracionEntranteRequest = {
  limit?: number;
};

export type IntegracionEntranteSyncResult = {
  integracionId: number;
  providerCode: string;
  mode: 'KOAJ_PILOT' | 'GENERIC';
  status: IntegracionEntranteOperationStatus;
  message: string;
  runId: string;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  blockedByDiagnostics: boolean;
  summary: {
    pendingReceived: number;
    ingested: number;
    duplicated: number;
    skippedValidation: number;
    failed: number;
  };
  diagnostics: Array<{
    code: string;
    ok: boolean;
    message: string;
  }>;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const fallback = 'No se pudo completar la operacion';
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? fallback;
    throw new Error(message);
  }

  return payload as T;
}

export async function getIntegracionesEntrantesBootstrap(
  accessToken: string,
): Promise<IntegracionesEntrantesBootstrapResponse> {
  const response = await fetch(
    `${API_URL}/configuracion-general/integraciones/entrantes`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseJsonResponse<IntegracionesEntrantesBootstrapResponse>(response);
}

export async function getIntegracionEntranteById(
  accessToken: string,
  integracionId: number,
): Promise<IntegracionEntranteListItem> {
  const response = await fetch(
    `${API_URL}/configuracion-general/integraciones/entrantes/${integracionId}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = await parseJsonResponse<{
    integracionEntrante: IntegracionEntranteListItem;
  }>(response);
  return payload.integracionEntrante;
}

export async function getIntegracionEntranteRuns(
  accessToken: string,
  integracionId: number,
  limit = 20,
): Promise<IntegracionEntranteRunLog[]> {
  const response = await fetch(
    `${API_URL}/configuracion-general/integraciones/entrantes/${integracionId}/runs?limit=${limit}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = await parseJsonResponse<{
    runs: IntegracionEntranteRunLog[];
  }>(response);
  return payload.runs;
}

export async function createIntegracionEntrante(
  accessToken: string,
  request: CreateIntegracionEntranteRequest,
): Promise<{ success: true; integracionId: number }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/integraciones/entrantes`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    },
  );

  return parseJsonResponse<{ success: true; integracionId: number }>(response);
}

export async function updateIntegracionEntrante(
  accessToken: string,
  integracionId: number,
  request: UpdateIntegracionEntranteRequest,
): Promise<{ success: true }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/integraciones/entrantes/${integracionId}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    },
  );

  return parseJsonResponse<{ success: true }>(response);
}

export async function validateIntegracionEntrante(
  accessToken: string,
  integracionId: number,
): Promise<{
  success: true;
  validation: {
    integracionId: number;
    status: IntegracionEntranteOperationStatus;
    message: string;
    runId: string;
    isValid: boolean;
    errors: string[];
    validatedAt: string;
  };
}> {
  const response = await fetch(
    `${API_URL}/configuracion-general/integraciones/entrantes/${integracionId}/validate`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    },
  );

  return parseJsonResponse<{
    success: true;
    validation: {
      integracionId: number;
      status: IntegracionEntranteOperationStatus;
      message: string;
      runId: string;
      isValid: boolean;
      errors: string[];
      validatedAt: string;
    };
  }>(response);
}

export async function syncIntegracionEntranteNow(
  accessToken: string,
  integracionId: number,
  request?: SyncIntegracionEntranteRequest,
): Promise<{ success: true; result: IntegracionEntranteSyncResult }> {
  const response = await fetch(
    `${API_URL}/configuracion-general/integraciones/entrantes/${integracionId}/sync-now`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request ?? {}),
    },
  );

  return parseJsonResponse<{ success: true; result: IntegracionEntranteSyncResult }>(
    response,
  );
}
