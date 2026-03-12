import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersSyncScheduler.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private bootstrapHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  onModuleInit(): void {
    const enabled = this.getBooleanConfig(
      'ORDERS_SYNC_FULL_JOB_ENABLED',
      false,
    );
    if (!enabled) {
      this.logger.log(
        'Job KOAJ full deshabilitado (ORDERS_SYNC_FULL_JOB_ENABLED=false)',
      );
      return;
    }

    const intervalMs = this.getNumberConfig(
      'ORDERS_SYNC_FULL_JOB_INTERVAL_MS',
      300000,
    );
    const initialDelayMs = this.getNumberConfig(
      'ORDERS_SYNC_FULL_JOB_INITIAL_DELAY_MS',
      15000,
    );

    this.logger.log(
      `Job KOAJ full habilitado. intervalMs=${intervalMs}, initialDelayMs=${initialDelayMs}`,
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
    }, intervalMs);
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
    if (this.ordersService.isSyncInProgress()) {
      this.logger.warn(
        'Sync KOAJ full omitido: ya hay una sincronizacion en progreso',
      );
      return;
    }

    const limit = this.getNumberConfig('ORDERS_SYNC_FULL_JOB_LIMIT', 200);

    try {
      const result = await this.ordersService.syncPendingOrders(limit);
      this.logger.log(
        `Sync KOAJ full OK: received=${result.summary.pendingReceived}, inserted=${result.summary.inserted}, skippedExisting=${result.summary.skippedExisting}, skippedValidation=${result.summary.skippedValidation}, failed=${result.summary.failed}`,
      );
      if (result.blockedByDiagnostics) {
        const blocked = result.diagnostics
          .filter((item) => !item.ok)
          .map((item) => item.message)
          .join(' | ');
        this.logger.warn(
          `Sync KOAJ full bloqueado por diagnostico: ${blocked || 'sin detalle'}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Sync KOAJ full fallo: ${message}`);
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
}
