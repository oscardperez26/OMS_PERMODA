import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CatalogoZiService } from '../catalogo-zi.service';
import { ZiPersistService } from '../zi-persist.service';

@Injectable()
export class ZiSyncSchedulerService {
  private readonly logger = new Logger(ZiSyncSchedulerService.name);
  private running = false;

  constructor(
    private readonly persistService: ZiPersistService,
    private readonly catalogoZiService: CatalogoZiService,
    private readonly config: ConfigService,
  ) {}

  private isEnabled(): boolean {
    return this.config.get<string>('ZI_SYNC_ENABLED') === 'true';
  }

  @Cron('*/20 * * * *')
  async syncStock(): Promise<void> {
    if (!this.isEnabled() || this.running) {
      return;
    }

    try {
      const change = await this.catalogoZiService.getChange();
      for (const item of change) {
        const last = await this.persistService.repository.getLastHashes(item.id);
        if (item.hash_Stock !== last.hashStock) {
          await this.persistService.persistStock(item.id);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cron syncStock fallo: ${message}`);
    }
  }

  @Cron('0 */2 * * *')
  async syncPrecios(): Promise<void> {
    if (!this.isEnabled() || this.running) {
      return;
    }

    try {
      const change = await this.catalogoZiService.getChange();
      for (const item of change) {
        const last = await this.persistService.repository.getLastHashes(item.id);
        if (item.hash_Price !== last.hashPrice) {
          await this.persistService.persistPrecios(item.id);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cron syncPrecios fallo: ${message}`);
    }
  }

  @Cron('0 */6 * * *')
  async syncProductos(): Promise<void> {
    if (!this.isEnabled() || this.running) {
      return;
    }

    this.running = true;
    try {
      await this.persistService.persistDeltaSync();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cron syncProductos fallo: ${message}`);
    } finally {
      this.running = false;
    }
  }

  @Cron('0 0 * * *')
  async syncCategorias(): Promise<void> {
    if (!this.isEnabled() || this.running) {
      return;
    }

    try {
      await this.persistService.persistCategorias(1, 809);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cron syncCategorias fallo: ${message}`);
    }
  }

  async runFullSync(): Promise<object> {
    if (this.running) {
      throw new ConflictException('Sync ya en ejecucion');
    }

    this.running = true;
    try {
      return await this.persistService.persistDeltaSync();
    } finally {
      this.running = false;
    }
  }
}
