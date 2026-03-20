import type { ConfigService } from '@nestjs/config';
import type { ZiSyncRepository } from '../repository/zi-sync.repository';
import { ZiOpsService } from './zi-ops.service';

describe('ZiOpsService', () => {
  const config = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const syncRepository = {
    getSummaryLastHours: jest.fn(),
    listRecentLogs: jest.fn(),
  } as unknown as ZiSyncRepository;

  let service: ZiOpsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ZiOpsService(config, syncRepository);
    config.get = jest.fn((key: string) => {
      const values: Record<string, string> = {
        ZI_SYNC_ENABLED: 'true',
        ZI_EMPRESA_ID: '1',
        ZI_SYNC_BATCH_SIZE: '100',
        INBOUND_SYNC_JOB_ENABLED: 'true',
        INBOUND_SYNC_CRON: '*/5 * * * *',
        INBOUND_SYNC_JOB_INITIAL_DELAY_MS: '15000',
        INBOUND_SYNC_JOB_LIMIT: '200',
        INBOUND_SYNC_MAX_CONNECTORS_PER_RUN: '10',
        ORDERS_SYNC_FULL_JOB_ENABLED: 'false',
        ORDERS_SYNC_FULL_JOB_INTERVAL_MS: '300000',
        ORDERS_SYNC_FULL_JOB_INITIAL_DELAY_MS: '15000',
        ORDERS_SYNC_FULL_JOB_LIMIT: '200',
      };
      return values[key];
    });
  });

  it('devuelve estado OK sin alertas cuando todo esta consistente', async () => {
    syncRepository.getSummaryLastHours = jest.fn().mockResolvedValue({
      total: 12,
      ok: 12,
      error: 0,
      lastRunAt: '2026-03-20T10:00:00.000Z',
      lastStatus: 'ok',
      lastError: null,
    });
    syncRepository.listRecentLogs = jest.fn().mockResolvedValue([
      {
        entity: 'sync.delta',
        productoZiId: 1,
        status: 'ok',
        error: null,
        recordsUpdated: 10,
        startedAt: '2026-03-20T09:59:00.000Z',
        finishedAt: '2026-03-20T10:00:00.000Z',
        createdAt: '2026-03-20T10:00:00.000Z',
        durationMs: 60000,
      },
    ]);

    const result = await service.getStatus();

    expect(result.status).toBe('OK');
    expect(result.alerts).toEqual([]);
    expect(result.healthSummary.lastStatus).toBe('OK');
    expect(result.ziLastRuns).toHaveLength(1);
  });

  it('emite WARN si INBOUND y ORDERS legacy estan activos al mismo tiempo', async () => {
    config.get = jest.fn((key: string) => {
      if (key === 'INBOUND_SYNC_JOB_ENABLED') return 'true';
      if (key === 'ORDERS_SYNC_FULL_JOB_ENABLED') return 'true';
      if (key === 'ZI_SYNC_ENABLED') return 'true';
      return undefined;
    });
    syncRepository.getSummaryLastHours = jest.fn().mockResolvedValue({
      total: 0,
      ok: 0,
      error: 0,
      lastRunAt: null,
      lastStatus: null,
      lastError: null,
    });
    syncRepository.listRecentLogs = jest.fn().mockResolvedValue([]);

    const result = await service.getStatus();

    expect(result.status).toBe('WARN');
    expect(result.alerts.some((item) => item.code === 'DUPLICATE_ORDERS_SYNC_JOBS')).toBe(
      true,
    );
  });

  it('no expone secretos en el payload de estado', async () => {
    syncRepository.getSummaryLastHours = jest.fn().mockResolvedValue({
      total: 0,
      ok: 0,
      error: 0,
      lastRunAt: null,
      lastStatus: null,
      lastError: null,
    });
    syncRepository.listRecentLogs = jest.fn().mockResolvedValue([]);

    const result = await service.getStatus();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('ZI_AUTH_PASSWORD');
    expect(serialized).not.toContain('KOAJ_PASSWORD');
    expect(serialized).not.toContain('WS_KEY');
    expect(serialized).not.toContain('Authorization');
  });
});
