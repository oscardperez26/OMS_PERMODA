import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions, Public } from '../auth/auth.decorators';
import type { SafeUser } from '../auth/auth.types';
import { CreateShopifyTestProductDto } from './dto/create-shopify-test-product.dto';
import { SyncShopifyProductDto } from './dto/sync-shopify-product.dto';
import type { ShopifyWebhookOrderPayload } from './dto/shopify-webhook-order.dto';
import { ShopifyWebhookGuard } from './guards/shopify-webhook.guard';
import { ShopifyAuthService } from './shopify-auth.service';
import { ShopifyOrdersService } from './shopify-orders.service';
import type { ShopifyOrderWebhookResult } from './shopify-orders.service';
import { ShopifyProductsService } from './shopify-products.service';
import type {
  ShopifyArchiveProductResult,
  ShopifySyncAllInventoryResult,
  ShopifySyncAllProductsResult,
  ShopifySyncInventoryResult,
  ShopifySyncProductResult,
} from './shopify-sync.types';
import { ShopifyService } from './shopify.service';
import { ShopifySchedulerService } from './scheduler/shopify-sync.scheduler';

type RequestWithUser = Request & { user: SafeUser };

type ShopifyShopQueryResponse = {
  shop: {
    name: string;
  };
};

@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly shopifyAuthService: ShopifyAuthService,
    private readonly shopifyProductsService: ShopifyProductsService,
    private readonly shopifyService: ShopifyService,
    private readonly shopifyScheduler: ShopifySchedulerService,
    private readonly shopifyOrdersService: ShopifyOrdersService,
  ) {}

  @Get('test/token')
  @Permissions('config.manage')
  async testToken() {
    return this.shopifyAuthService.getTokenState();
  }

  @Get('test/locations')
  @Permissions('config.manage')
  async testLocations() {
    return this.shopifyService.rest<Record<string, unknown>>(
      'GET',
      'locations.json',
    );
  }

  @Get('test/shop')
  @Permissions('config.manage')
  async testShop() {
    const query = `
      query {
        shop {
          name
        }
      }
    `;

    return this.shopifyService.graphql<ShopifyShopQueryResponse>(query);
  }

  @Post('test/create-product')
  @Permissions('config.manage')
  async createTestProduct(@Body() body: CreateShopifyTestProductDto) {
    return this.shopifyProductsService.createTestProduct(body);
  }

  // ----------------------------------------------------------
  // Sync real OMS -> Shopify (Phase 2)
  // ----------------------------------------------------------

  /**
   * Sincroniza un producto OMS a Shopify.
   * Idempotente: crea el producto si no existe mapping previo, lo actualiza si ya existe.
   *
   * @param productoId  ID del producto en oms.Producto
   * @param body        { empresaId } — empresa propietaria del producto
   */
  @Post('products/sync/:productoId')
  @Permissions('config.manage')
  async syncProduct(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() body: SyncShopifyProductDto,
    @Req() req: RequestWithUser,
  ): Promise<ShopifySyncProductResult> {
    return this.shopifyProductsService.syncProduct(productoId, body, req.user);
  }

  /**
   * Archiva un producto en Shopify (estado ARCHIVED).
   * El producto debe tener un mapping SINCRONIZADO previo.
   * Las variantes se conservan en Shopify para preservar historial de pedidos.
   *
   * @param productoId  ID del producto en oms.Producto
   * @param body        { empresaId }
   */
  @Post('products/archive/:productoId')
  @Permissions('config.manage')
  async archiveProduct(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() body: SyncShopifyProductDto,
    @Req() req: RequestWithUser,
  ): Promise<ShopifyArchiveProductResult> {
    return this.shopifyProductsService.archiveProduct(productoId, body, req.user);
  }

  /**
   * Sincroniza el inventario disponible de un producto OMS a Shopify.
   * Requiere que el producto tenga variantes ya mapeadas con InventoryItemId.
   * El locationId se toma de config.inventory.locationId (ConfigJson) o de SHOPIFY_LOCATION_ID (env).
   *
   * @param productoId  ID del producto en oms.Producto
   * @param body        { empresaId }
   */
  @Post('inventory/sync/:productoId')
  @Permissions('config.manage')
  async syncInventory(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() body: SyncShopifyProductDto,
    @Req() req: RequestWithUser,
  ): Promise<ShopifySyncInventoryResult> {
    return this.shopifyProductsService.syncInventory(productoId, body, req.user);
  }

  // ----------------------------------------------------------
  // Bulk sync OMS -> Shopify (Opción 3)
  // ----------------------------------------------------------

  /**
   * Sincroniza todos los productos activos de una empresa a Shopify.
   * Idempotente por producto: crea los nuevos, actualiza los existentes.
   * Aplica rate-limiting de 500ms entre productos.
   *
   * @param body  { empresaId }
   */
  @Post('products/sync-all')
  @Permissions('config.manage')
  async syncAllProducts(
    @Body() body: SyncShopifyProductDto,
    @Req() req: RequestWithUser,
  ): Promise<ShopifySyncAllProductsResult> {
    if (req.user.storeId !== undefined && req.user.storeId !== String(body.empresaId)) {
      throw new ForbiddenException('No tiene acceso a sincronizar productos de esta empresa');
    }
    return this.shopifyProductsService.syncAllProducts(body.empresaId);
  }

  /**
   * Sincroniza el inventario de todos los productos activos de una empresa a Shopify.
   * Requiere que los productos ya tengan variantes mapeadas con InventoryItemId.
   *
   * @param body  { empresaId }
   */
  @Post('inventory/sync-all')
  @Permissions('config.manage')
  async syncAllInventory(
    @Body() body: SyncShopifyProductDto,
    @Req() req: RequestWithUser,
  ): Promise<ShopifySyncAllInventoryResult> {
    if (req.user.storeId !== undefined && req.user.storeId !== String(body.empresaId)) {
      throw new ForbiddenException('No tiene acceso a sincronizar inventario de esta empresa');
    }
    return this.shopifyProductsService.syncAllInventory(body.empresaId);
  }

  // ----------------------------------------------------------
  // Sync completo manual (equivalente al /catalogo-zi/sync/full de ZI)
  // ----------------------------------------------------------

  /**
   * Dispara un sync completo (productos + inventario) de forma manual.
   * Usa la empresa configurada en SHOPIFY_SYNC_EMPRESA_ID.
   * Respeta el lock de concurrencia del scheduler.
   */
  @Post('sync/full')
  @Permissions('config.manage')
  async runFullSync() {
    return this.shopifyScheduler.runFullSync();
  }

  // ----------------------------------------------------------
  // Webhooks Shopify → OMS (Opción 1)
  // ----------------------------------------------------------

  /**
   * Recibe el webhook `orders/paid` de Shopify.
   * Crea el Pedido + PedidoLineas en OMS y reserva stock.
   *
   * - @Public()         → bypass del AuthGuard (no hay sesión de usuario)
   * - @UseGuards(...)   → HMAC-SHA256 con SHOPIFY_WEBHOOK_SECRET
   * - @HttpCode(200)    → Shopify espera 200, no 201
   */
  @Post('webhooks/orders/paid')
  @Public()
  @UseGuards(ShopifyWebhookGuard)
  @HttpCode(200)
  async handleOrderPaid(
    @Body() payload: ShopifyWebhookOrderPayload,
  ): Promise<ShopifyOrderWebhookResult> {
    const empresaId = parseInt(process.env.SHOPIFY_SYNC_EMPRESA_ID ?? '1', 10);
    return this.shopifyOrdersService.handleOrderPaid(payload, empresaId);
  }
}
