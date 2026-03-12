import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegracionesEntrantesService } from './integraciones-entrantes.service';

@Injectable()
export class IntegracionesEntrantesSyncScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(IntegracionesEntrantesSyncScheduler.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private bootstrapHandle: NodeJS.Timeout | null = null;
  private tickInProgress = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly integracionesEntrantesService: IntegracionesEntrantesService,
  ) {}

  onModuleInit(): void {
    const enabled = this.getBooleanConfig('INBOUND_SYNC_JOB_ENABLED', false);
    if (!enabled) {
      this.logger.log(
        'Job Integraciones Entrantes deshabilitado (INBOUND_SYNC_JOB_ENABLED=false)',
      );
      return;
    }

    const cronExpression =
      this.configService.get<string>('INBOUND_SYNC_CRON')?.trim() ||
      '*/5 * * * *';
    const intervalMs = this.resolveIntervalMsFromCron(cronExpression);
    if (!intervalMs) {
      this.logger.warn(
        `INBOUND_SYNC_CRON invalido (${cronExpression}). Se usa cada 5 minutos.`,
      );
    }

    const normalizedIntervalMs = intervalMs ?? 300000;
    const initialDelayMs = this.getNumberConfig(
      'INBOUND_SYNC_JOB_INITIAL_DELAY_MS',
      15000,
    );

    this.logger.log(
      `Job Integraciones Entrantes habilitado. cron=${cronExpression}, intervalMs=${normalizedIntervalMs}, initialDelayMs=${initialDelayMs}`,
    );

    if (initialDelayMs > 0) {
      this.bootstrapHandle = setTimeout(() => {
        void this.runSyncTick();
      }, initialDelayMs);
    } else {
      void this.runSyncTick();
    }

    this.intervalHandle = setInterval(() => {
      void this.runSyncTick();
    }, normalizedIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.bootstrapHandle) {
      clearTimeout(this.bootstrapHandle);
      this.bootstrapHandle = null;
    }

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async runSyncTick(): Promise<void> {
    if (this.tickInProgress) {
      this.logger.warn(
        'AutoSync de Integraciones Entrantes omitido: ya hay una corrida en progreso',
      );
      return;
    }

    this.tickInProgress = true;
    try {
      const limit = this.getNumberConfig('INBOUND_SYNC_JOB_LIMIT', 200);
      const maxConnectors = this.getNumberConfig(
        'INBOUND_SYNC_MAX_CONNECTORS_PER_RUN',
        10,
      );
      const result = await this.integracionesEntrantesService.runAutoSyncBatch({
        limit,
        maxConnectors,
        executedBy: 'system:auto-sync',
      });

      this.logger.log(
        `AutoSync Entrantes: processed=${result.processed}, ok=${result.ok}, blocked=${result.blocked}, failed=${result.failed}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`AutoSync Entrantes fallo: ${message}`);
    } finally {
      this.tickInProgress = false;
    }
  }

  private getBooleanConfig(key: string, fallback: boolean): boolean {
    const raw = this.configService.get<string>(key)?.trim().toLowerCase();
    if (!raw) {
      return fallback;
    }

    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (!raw) {
      return fallback;
    }

    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return fallback;
    }

    return Math.floor(value);
  }

  private resolveIntervalMsFromCron(expression: string): number | null {
    const normalized = expression.trim();
    if (!normalized) {
      return null;
    }

    if (normalized === '* * * * *' || normalized === '0 * * * * *') {
      return 60000;
    }

    const fiveFieldMatch = normalized.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (fiveFieldMatch) {
      const everyMinutes = Number(fiveFieldMatch[1]);
      if (Number.isInteger(everyMinutes) && everyMinutes > 0) {
        return everyMinutes * 60000;
      }
    }

    const sixFieldMatch = normalized.match(
      /^0\s+\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/,
    );
    if (sixFieldMatch) {
      const everyMinutes = Number(sixFieldMatch[1]);
      if (Number.isInteger(everyMinutes) && everyMinutes > 0) {
        return everyMinutes * 60000;
      }
    }

    return null;
  }
}
