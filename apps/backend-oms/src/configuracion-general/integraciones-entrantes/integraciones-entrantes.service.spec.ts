import { IntegracionesEntrantesService } from './integraciones-entrantes.service';
import type { IntegracionesEntrantesRepository } from './integraciones-entrantes.repository';
import type { OrdersService } from '../../orders/orders.service';

function buildInboundConfig(input?: {
  providerCode?: string;
  mode?: 'KOAJ_PILOT' | 'GENERIC';
}) {
  return {
    flowType: 'INBOUND',
    providerCode: input?.providerCode ?? 'KOAJ',
    mode: input?.mode ?? 'KOAJ_PILOT',
    connection: {
      baseUrl: null,
      authType: 'API_KEY',
      timeoutMs: 15000,
    },
    endpoints: {
      listConfirmedOrdersEndpoint: null,
      orderDetailEndpoint: null,
    },
    filters: {
      confirmedStatuses: ['CONFIRMED'],
    },
    mapping: {
      externalOrderIdField: 'id',
      externalReferenceField: 'reference',
      customerNameField: 'customer_name',
      totalField: 'total_paid_tax_incl',
      statusField: 'status',
    },
    validation: {
      isValid: false,
      status: 'FAILED',
      message: 'Configuracion pendiente de validacion',
      errors: ['Configuracion pendiente de validacion'],
      validatedAt: null,
      runId: null,
      durationMs: null,
      executedBy: null,
      errorCode: null,
      errorMessage: null,
      diagnosticsSummary: null,
    },
    lastSync: null,
  };
}

function buildRow(input?: {
  integracionId?: number;
  providerCode?: string;
  mode?: 'KOAJ_PILOT' | 'GENERIC';
}) {
  return {
    IntegracionId: input?.integracionId ?? 1,
    EmpresaId: 1,
    EmpresaCodigo: 'KOAJ_CO',
    EmpresaNombre: 'KOAJ Colombia',
    CanalVentaId: 1,
    CanalVentaCodigo: 'ECOM',
    CanalVentaNombre: 'E-commerce',
    Codigo: 'KOAJ_INBOUND',
    Nombre: 'KOAJ Entrante',
    Estado: 'ACTIVO',
    ConfigJson: JSON.stringify(
      buildInboundConfig({
        providerCode: input?.providerCode,
        mode: input?.mode,
      }),
    ),
    CreatedAt: new Date('2026-03-12T10:00:00.000Z'),
    UpdatedAt: null,
  };
}

describe('IntegracionesEntrantesService', () => {
  const repository = {
    findById: jest.fn(),
    listActive: jest.fn(),
    update: jest.fn(),
    insertOperationalLog: jest.fn(),
  } as unknown as IntegracionesEntrantesRepository;

  const ordersService = {
    syncPendingOrders: jest.fn(),
  } as unknown as OrdersService;

  let service: IntegracionesEntrantesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.listActive = jest.fn().mockResolvedValue([]);
    service = new IntegracionesEntrantesService(repository, ordersService);
  });

  it('validate returns status OK for KOAJ pilot config and persists metadata', async () => {
    repository.findById = jest.fn().mockResolvedValue(buildRow());
    repository.update = jest.fn().mockResolvedValue(undefined);
    repository.insertOperationalLog = jest.fn().mockResolvedValue(undefined);

    const result = await service.validate(1, {
      userId: 1,
      username: 'panel.admin@demo.com',
    });

    expect(result.status).toBe('OK');
    expect(result.runId).toContain('VAL-');
    expect(result.message).toBe('Configuracion valida');
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.insertOperationalLog).toHaveBeenCalledTimes(1);
  });

  it('syncNow returns BLOCKED for non-KOAJ connectors without throwing', async () => {
    repository.findById = jest
      .fn()
      .mockResolvedValue(
        buildRow({ integracionId: 2, providerCode: 'MARKETPLACE', mode: 'GENERIC' }),
      );
    repository.update = jest.fn().mockResolvedValue(undefined);
    repository.insertOperationalLog = jest.fn().mockResolvedValue(undefined);

    const result = await service.syncNow(
      2,
      { limit: 50 },
      { userId: 1, username: 'panel.admin@demo.com' },
    );

    expect(result.status).toBe('BLOCKED');
    expect(result.errorCode).toBe('SYNC_NOT_IMPLEMENTED');
    expect(ordersService.syncPendingOrders).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('syncNow returns FAILED with normalized error when runtime fails', async () => {
    repository.findById = jest
      .fn()
      .mockResolvedValue(buildRow({ integracionId: 3 }));
    repository.update = jest.fn().mockResolvedValue(undefined);
    repository.insertOperationalLog = jest.fn().mockResolvedValue(undefined);
    ordersService.syncPendingOrders = jest.fn().mockRejectedValue({
      code: 'ECONNRESET',
      message: 'Connection lost',
    });

    const result = await service.syncNow(
      3,
      { limit: 100 },
      { userId: 1, username: 'panel.admin@demo.com' },
    );

    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('UPSTREAM_CONNECTION_ERROR');
    expect(result.message).toContain('conexion temporal');
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.insertOperationalLog).toHaveBeenCalledTimes(1);
  });

  it('blocks concurrent sync for the same connector using lock per integracionId', async () => {
    const row = buildRow({ integracionId: 9 });
    repository.findById = jest.fn().mockResolvedValue(row);
    repository.update = jest.fn().mockResolvedValue(undefined);
    repository.insertOperationalLog = jest.fn().mockResolvedValue(undefined);

    let releaseSync: ((value: unknown) => void) | null = null;
    ordersService.syncPendingOrders = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseSync = resolve;
        }),
    );

    const firstPromise = service.syncNow(
      9,
      { limit: 100 },
      { userId: 1, username: 'panel.admin@demo.com' },
    );

    await new Promise((resolve) => setImmediate(resolve));

    const second = await service.syncNow(
      9,
      { limit: 100 },
      { userId: 1, username: 'panel.admin@demo.com' },
    );

    expect(second.status).toBe('BLOCKED');
    expect(second.errorCode).toBe('SYNC_IN_PROGRESS');

    releaseSync?.({
      success: true,
      blockedByDiagnostics: false,
      summary: {
        pendingReceived: 1,
        inserted: 1,
        skippedExisting: 0,
        skippedValidation: 0,
        failed: 0,
      },
      diagnostics: [],
      items: [],
    });

    const first = await firstPromise;
    expect(first.status).toBe('OK');
  });

  it('runAutoSyncBatch processes active inbound connectors sequentially', async () => {
    const koaj = buildRow({ integracionId: 21, providerCode: 'KOAJ', mode: 'KOAJ_PILOT' });
    const generic = buildRow({
      integracionId: 22,
      providerCode: 'MARKETPLACE',
      mode: 'GENERIC',
    });
    repository.listActive = jest.fn().mockResolvedValue([koaj, generic]);
    repository.findById = jest.fn().mockImplementation(async (integracionId: number) => {
      if (integracionId === 21) return koaj;
      if (integracionId === 22) return generic;
      return null;
    });
    repository.update = jest.fn().mockResolvedValue(undefined);
    repository.insertOperationalLog = jest.fn().mockResolvedValue(undefined);
    ordersService.syncPendingOrders = jest.fn().mockResolvedValue({
      success: true,
      blockedByDiagnostics: false,
      summary: {
        pendingReceived: 2,
        inserted: 2,
        skippedExisting: 0,
        skippedValidation: 0,
        failed: 0,
      },
      diagnostics: [],
      items: [],
    });

    const result = await service.runAutoSyncBatch({
      limit: 200,
      maxConnectors: 10,
      executedBy: 'system:auto-sync',
    });

    expect(result.processed).toBe(2);
    expect(result.ok).toBe(1);
    expect(result.blocked).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.connectors).toHaveLength(2);
  });
});
