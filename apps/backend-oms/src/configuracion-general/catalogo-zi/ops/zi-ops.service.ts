import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZiSyncRepository } from '../repository/zi-sync.repository';

export type ZiOpsStatus = {
  status: 'OK' | 'WARN' | 'ERROR';
  message: string;
  jobs: {
    zi: {
      enabled: boolean;
      cron: {
        stock: string;
        precios: string;
        productos: string;
        categorias: string;
      };
      config: {
        empresaId: number;
        batchSize: number;
      };
    };
    inbound: {
      enabled: boolean;
      cron: string;
      initialDelayMs: number;
      limit: number;
      maxConnectors: number;
    };
    ordersLegacy: {
      enabled: boolean;
      intervalMs: number;
      initialDelayMs: number;
      limit: number;
    };
  };
  alerts: Array<{
    level: 'INFO' | 'WARN' | 'ERROR';
    code: string;
    message: string;
  }>;
  healthSummary: {
    lastRunAt: string | null;
    lastStatus: 'OK' | 'ERROR' | 'UNKNOWN';
    lastError: string | null;
    runs24h: {
      total: number;
      ok: number;
      error: number;
    };
  };
  ziLastRuns: Array<{
    entity: string;
    productoZiId: number;
    status: 'ok' | 'error';
    error: string | null;
    recordsUpdated: number;
    startedAt: string;
    finishedAt: string;
    createdAt: string;
    durationMs: number;
  }>;
};

@Injectable()
export class ZiOpsService {
  constructor(
    private readonly config: ConfigService,
    private readonly syncRepository: ZiSyncRepository,
  ) {}

  async getStatus(): Promise<ZiOpsStatus> {
    const [summary, recentRuns] = await Promise.all([
      this.syncRepository.getSummaryLastHours(24),
      this.syncRepository.listRecentLogs(20),
    ]);

    const jobs = {
      zi: {
        enabled: this.getBooleanConfig('ZI_SYNC_ENABLED', false),
        cron: {
          stock: '*/20 * * * *',
          precios: '0 */2 * * *',
          productos: '0 */6 * * *',
          categorias: '0 0 * * *',
        },
        config: {
          empresaId: this.getNumberConfig('ZI_EMPRESA_ID', 1),
          batchSize: this.getNumberConfig('ZI_SYNC_BATCH_SIZE', 100),
        },
      },
      inbound: {
        enabled: this.getBooleanConfig('INBOUND_SYNC_JOB_ENABLED', false),
        cron:
          this.config.get<string>('INBOUND_SYNC_CRON')?.trim() ||
          '*/5 * * * *',
        initialDelayMs: this.getNumberConfig(
          'INBOUND_SYNC_JOB_INITIAL_DELAY_MS',
          15000,
        ),
        limit: this.getNumberConfig('INBOUND_SYNC_JOB_LIMIT', 200),
        maxConnectors: this.getNumberConfig(
          'INBOUND_SYNC_MAX_CONNECTORS_PER_RUN',
          10,
        ),
      },
      ordersLegacy: {
        enabled: this.getBooleanConfig('ORDERS_SYNC_FULL_JOB_ENABLED', false),
        intervalMs: this.getNumberConfig(
          'ORDERS_SYNC_FULL_JOB_INTERVAL_MS',
          300000,
        ),
        initialDelayMs: this.getNumberConfig(
          'ORDERS_SYNC_FULL_JOB_INITIAL_DELAY_MS',
          15000,
        ),
        limit: this.getNumberConfig('ORDERS_SYNC_FULL_JOB_LIMIT', 200),
      },
    };

    const alerts: ZiOpsStatus['alerts'] = [];
    if (jobs.inbound.enabled && jobs.ordersLegacy.enabled) {
      alerts.push({
        level: 'WARN',
        code: 'DUPLICATE_ORDERS_SYNC_JOBS',
        message:
          'INBOUND_SYNC y ORDERS_SYNC_FULL_JOB estan activos al mismo tiempo. Esto puede duplicar corridas de sync de pedidos.',
      });
    }
    if (!jobs.zi.enabled) {
      alerts.push({
        level: 'WARN',
        code: 'ZI_SYNC_DISABLED',
        message: 'El autosync de ZI esta deshabilitado (ZI_SYNC_ENABLED=false).',
      });
    }
    if (summary.lastStatus === 'error') {
      alerts.push({
        level: 'WARN',
        code: 'ZI_LAST_RUN_ERROR',
        message:
          summary.lastError?.trim() ||
          'La ultima corrida registrada de ZI finalizo con error.',
      });
    }
    if (recentRuns.length === 0) {
      alerts.push({
        level: 'INFO',
        code: 'ZI_NO_RUNS',
        message: 'No hay corridas de ZI registradas en ZiSyncLog.',
      });
    }

    const hasError = alerts.some((item) => item.level === 'ERROR');
    const hasWarn = alerts.some((item) => item.level === 'WARN');
    const status: ZiOpsStatus['status'] = hasError
      ? 'ERROR'
      : hasWarn
        ? 'WARN'
        : 'OK';

    return {
      status,
      message:
        status === 'OK'
          ? 'Zona de Integracion operando sin alertas.'
          : status === 'WARN'
            ? 'Zona de Integracion operando con alertas.'
            : 'Zona de Integracion con errores operativos.',
      jobs,
      alerts,
      healthSummary: {
        lastRunAt: summary.lastRunAt,
        lastStatus:
          summary.lastStatus === 'ok'
            ? 'OK'
            : summary.lastStatus === 'error'
              ? 'ERROR'
              : 'UNKNOWN',
        lastError: summary.lastError,
        runs24h: {
          total: summary.total,
          ok: summary.ok,
          error: summary.error,
        },
      },
      ziLastRuns: recentRuns,
    };
  }

  private getBooleanConfig(key: string, fallback: boolean): boolean {
    const raw = this.config.get<string>(key)?.trim().toLowerCase();
    if (!raw) {
      return fallback;
    }
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.config.get<string>(key)?.trim();
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }
}
