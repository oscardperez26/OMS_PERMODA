import { Module } from '@nestjs/common';
import { ShopifyExternalMappingRepository } from './shopify-external-mapping.repository';
import { ShopifyIntegracionSalienteRepository } from './shopify-integracion-saliente.repository';
import { ShopifyInventoryWriter } from './shopify-inventory-writer';
import { ShopifyOmsCatalogRepository } from './shopify-oms-catalog.repository';
import { ShopifyProductWriter } from './shopify-product-writer';
import { ShopifyAuthService } from './shopify-auth.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyProductsService } from './shopify-products.service';
import { ShopifyService } from './shopify.service';

// DatabaseService y ConfigService son @Global() — no es necesario importar sus módulos aquí.

@Module({
  controllers: [ShopifyController],
  providers: [
    // Capa de transporte Shopify
    ShopifyAuthService,
    ShopifyService,
    // Writers Shopify API 2024-01 (seam para migración futura a nuevas APIs)
    ShopifyProductWriter,
    ShopifyInventoryWriter,
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
