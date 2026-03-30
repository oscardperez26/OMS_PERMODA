import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { ShopifyProductsService } from '../shopify-products.service';
import type {
  ShopifySyncAllInventoryResult,
  ShopifySyncAllProductsResult,
} from '../shopify-sync.types';

/**
 * Scheduler automático OMS → Shopify.
 *
 * Sincroniza el catálogo OMS a Shopify de forma automática:
 *   - Cada hora en punto     → sync de productos (create/update)
 *   - Cada hora a los :30min → sync de inventario (quantities)
 *
 * Requiere variables de entorno:
 *   SHOPIFY_SYNC_ENABLED=true       — habilita los cron jobs
 *   SHOPIFY_SYNC_EMPRESA_ID=1       — empresa a sincronizar
 *
 * El sync manual se puede disparar en cualquier momento via
 * POST /shopify/sync/full (respeta el lock de concurrencia).
 */
@Injectable()
export class ShopifySchedulerService {
  private readonly logger = new Logger(ShopifySchedulerService.name);
  private running = false;

  constructor(
    private readonly productsService: ShopifyProductsService,
    private readonly config: ConfigService,
  ) {}

  private isEnabled(): boolean {
    return this.config.get<string>('SHOPIFY_SYNC_ENABLED') === 'true';
  }

  private getEmpresaId(): number {
    return Number(this.config.get<string>('SHOPIFY_SYNC_EMPRESA_ID') ?? '1');
  }

  /** Sync de productos — cada hora en punto */
  @Cron('0 * * * *')
  async syncProductos(): Promise<void> {
    if (!this.isEnabled() || this.running) {
      return;
    }

    this.running = true;
    try {
      const result = await this.productsService.syncAllProducts(this.getEmpresaId());
      this.logger.log(
        `Shopify product sync: ${result.sincronizados}/${result.total} ok, ${result.errores} errores`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cron Shopify syncProductos fallo: ${message}`);
    } finally {
      this.running = false;
    }
  }

  /** Sync de inventario — cada hora a los :30 (después del sync de productos) */
  @Cron('30 * * * *')
  async syncInventario(): Promise<void> {
    if (!this.isEnabled() || this.running) {
      return;
    }

    this.running = true;
    try {
      const result = await this.productsService.syncAllInventory(this.getEmpresaId());
      this.logger.log(
        `Shopify inventory sync: ${result.sincronizados}/${result.total} ok, ${result.errores} errores`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cron Shopify syncInventario fallo: ${message}`);
    } finally {
      this.running = false;
    }
  }

  /**
   * Trigger manual de sync completo (productos + inventario).
   * Llamado desde POST /shopify/sync/full.
   * Lanza ConflictException si ya hay un sync en curso.
   */
  async runFullSync(): Promise<{
    productos: ShopifySyncAllProductsResult;
    inventario: ShopifySyncAllInventoryResult;
  }> {
    if (this.running) {
      throw new ConflictException('Shopify sync ya en ejecucion');
    }

    const empresaId = this.getEmpresaId();
    this.running = true;
    try {
      this.logger.log(`Full sync manual iniciado para empresaId=${empresaId}`);
      const productos = await this.productsService.syncAllProducts(empresaId);
      const inventario = await this.productsService.syncAllInventory(empresaId);
      this.logger.log(
        `Full sync completado: productos ${productos.sincronizados}/${productos.total}, ` +
          `inventario ${inventario.sincronizados}/${inventario.total}`,
      );
      return { productos, inventario };
    } finally {
      this.running = false;
    }
  }
}
