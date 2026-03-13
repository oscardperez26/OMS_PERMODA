export type IntegracionEntranteAuthType = 'API_KEY';

export type IntegracionEntranteMode = 'KOAJ_PILOT' | 'GENERIC';

export type IntegracionEntranteOperationStatus = 'OK' | 'BLOCKED' | 'FAILED';

export type IntegracionEntranteDiagnosticsSummary = {
  total: number;
  ok: number;
  failed: number;
  failedCodes: string[];
};

export type IntegracionEntranteValidation = {
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

export type IntegracionEntranteLastSync = {
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
};

export type IntegracionEntranteDedupeSummary = {
  total: number;
  ingestado: number;
  duplicado: number;
  failed: number;
  lastUpdatedAt: string | null;
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

export type IntegracionEntranteConfig = {
  flowType: 'INBOUND';
  providerCode: string;
  mode: IntegracionEntranteMode;
  connection: {
    baseUrl: string | null;
    authType: IntegracionEntranteAuthType;
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
  validation: IntegracionEntranteValidation;
  lastSync: IntegracionEntranteLastSync | null;
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

export type IntegracionEntranteEmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type IntegracionEntranteCanalOption = {
  canalVentaId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

export type IntegracionEntranteTemplate = {
  id: string;
  label: string;
  description: string;
  providerCode: string;
  mode: IntegracionEntranteMode;
  connection: {
    baseUrl: string;
    authType: IntegracionEntranteAuthType;
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
};

export type IntegracionesEntrantesBootstrap = {
  integracionesEntrantes: IntegracionEntranteListItem[];
  empresas: IntegracionEntranteEmpresaOption[];
  canalesVenta: IntegracionEntranteCanalOption[];
  templates: IntegracionEntranteTemplate[];
  zonaIntegracion: {
    enabled: false;
    status: 'PENDIENTE';
    message: string;
  };
};

export type IntegracionEntranteValidationResult = {
  integracionId: number;
  status: IntegracionEntranteOperationStatus;
  message: string;
  runId: string;
  isValid: boolean;
  errors: string[];
  validatedAt: string;
};

export type IntegracionEntranteSyncResult = {
  integracionId: number;
  providerCode: string;
  mode: IntegracionEntranteMode;
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

export type IntegracionEntranteAutoSyncBatchResult = {
  processed: number;
  ok: number;
  blocked: number;
  failed: number;
  connectors: Array<{
    integracionId: number;
    codigo: string;
    status: IntegracionEntranteOperationStatus;
    runId: string;
    message: string;
  }>;
};

export type IntegracionEntrantePersistenceRow = {
  IntegracionId: number;
  EmpresaId: number;
  EmpresaCodigo: string;
  EmpresaNombre: string;
  CanalVentaId: number;
  CanalVentaCodigo: string;
  CanalVentaNombre: string;
  Codigo: string;
  Nombre: string;
  Estado: string;
  ConfigJson: string | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

export type CreateIntegracionEntranteInput = {
  empresaId: number;
  canalVentaId: number;
  codigo: string;
  nombre: string;
  estado: string;
  configJson: string;
};

export type UpdateIntegracionEntranteInput = {
  empresaId: number;
  canalVentaId: number;
  codigo: string;
  nombre: string;
  estado: string;
  configJson: string;
};
