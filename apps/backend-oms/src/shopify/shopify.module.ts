import { Module } from '@nestjs/common';
import { ShopifyExternalMappingRepository } from './shopify-external-mapping.repository';
import { ShopifyIntegracionSalienteRepository } from './shopify-integracion-saliente.repository';
import { ShopifyOmsCatalogRepository } from './shopify-oms-catalog.repository';
import { ShopifyProductWriter } from './shopify-product-writer';
import { ShopifyAuthService } from './shopify-auth.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyProductsService } from './shopify-products.service';
import { ShopifyService } from './shopify.service';

// DatabaseService es @Global() — no es necesario importar DatabaseModule aquí.

@Module({
  controllers: [ShopifyController],
  providers: [
    // Capa de transporte Shopify
    ShopifyAuthService,
    ShopifyService,
    // Writer Shopify API 2024-01 (seam para migración futura a productSet en 2026-01)
    ShopifyProductWriter,
    // Repositorios de lectura y persistencia OMS
    ShopifyIntegracionSalienteRepository,
    ShopifyOmsCatalogRepository,
    ShopifyExternalMappingRepository,
    // Orquestador de casos de uso
    ShopifyProductsService,
  ],
  exports: [
    ShopifyAuthService,
    ShopifyService,
    ShopifyProductsService,
  ],
})
export class ShopifyModule {}
