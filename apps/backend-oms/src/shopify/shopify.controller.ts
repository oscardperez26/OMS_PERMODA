import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../auth/auth.decorators';
import type { SafeUser } from '../auth/auth.types';
import { CreateShopifyTestProductDto } from './dto/create-shopify-test-product.dto';
import { SyncShopifyProductDto } from './dto/sync-shopify-product.dto';
import { ShopifyAuthService } from './shopify-auth.service';
import { ShopifyProductsService } from './shopify-products.service';
import type { ShopifySyncProductResult } from './shopify-sync.types';
import { ShopifyService } from './shopify.service';

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
}
