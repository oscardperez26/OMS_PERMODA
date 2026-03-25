import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { SafeUser } from '../auth/auth.types';
import { CreateShopifyTestProductDto } from './dto/create-shopify-test-product.dto';
import { SyncShopifyProductDto } from './dto/sync-shopify-product.dto';
import { ShopifyExternalMappingRepository } from './shopify-external-mapping.repository';
import { ShopifyIntegracionSalienteRepository } from './shopify-integracion-saliente.repository';
import { ShopifyOmsCatalogRepository } from './shopify-oms-catalog.repository';
import { ShopifyProductWriter } from './shopify-product-writer';
import type {
  ShopifyTestProductResult,
  ShopifyUserError,
} from './shopify-products.types';
import type {
  ShopifySyncProductResult,
  ShopifySyncVariantResult,
  UpsertProductMappingInput,
  UpsertVariantMappingInput,
} from './shopify-sync.types';
import { ShopifyService } from './shopify.service';

// ============================================================
// Tipos internos para createTestProduct (Phase 1 — sin cambios)
// ============================================================

type ShopifyProductCreateMutationVariables = {
  product: {
    title: string;
    descriptionHtml: string;
    vendor: string;
    productType: string;
    status: 'DRAFT';
  };
};

type ShopifyProductCreateMutationResponse = {
  productCreate: {
    product: {
      id: string;
      variants: {
        nodes: Array<{
          id: string;
          inventoryItem: {
            id: string;
          } | null;
        }>;
      };
    } | null;
    userErrors: ShopifyUserError[];
  };
};

type ShopifyProductVariantsBulkUpdateMutationVariables = {
  productId: string;
  variants: Array<{
    id: string;
    price: string;
    inventoryItem: {
      sku: string;
    };
  }>;
};

type ShopifyProductVariantsBulkUpdateMutationResponse = {
  productVariantsBulkUpdate: {
    product: {
      id: string;
    } | null;
    productVariants: Array<{
      id: string;
      inventoryItem: {
        id: string;
        sku: string | null;
      } | null;
    }>;
    userErrors: ShopifyUserError[];
  };
};

// ============================================================
// ShopifyProductsService — orquestador de casos de uso Shopify
// ============================================================

@Injectable()
export class ShopifyProductsService {
  private readonly logger = new Logger(ShopifyProductsService.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly productWriter: ShopifyProductWriter,
    private readonly integracionRepo: ShopifyIntegracionSalienteRepository,
    private readonly catalogRepo: ShopifyOmsCatalogRepository,
    private readonly mappingRepo: ShopifyExternalMappingRepository,
  ) {}

  // ----------------------------------------------------------
  // Phase 1: endpoint de prueba de escritura en Shopify
  // ----------------------------------------------------------

  async createTestProduct(
    input: CreateShopifyTestProductDto,
  ): Promise<ShopifyTestProductResult> {
    const normalizedInput = {
      title: this.normalizeRequiredText(input.title, 'title', 255),
      descriptionHtml: this.normalizeRequiredText(
        input.descriptionHtml,
        'descriptionHtml',
        1000000,
      ),
      vendor: this.normalizeRequiredText(input.vendor, 'vendor', 255),
      productType: this.normalizeRequiredText(
        input.productType,
        'productType',
        255,
      ),
      sku: this.normalizeSku(input.sku),
      price: this.normalizePrice(input.price),
    };

    const createdProduct =
      await this.shopifyService.graphql<
        ShopifyProductCreateMutationResponse,
        ShopifyProductCreateMutationVariables
      >(this.productCreateMutation, {
        product: {
          title: normalizedInput.title,
          descriptionHtml: normalizedInput.descriptionHtml,
          vendor: normalizedInput.vendor,
          productType: normalizedInput.productType,
          status: 'DRAFT',
        },
      });

    this.assertNoUserErrors(
      createdProduct.productCreate.userErrors,
      'Shopify productCreate',
    );

    const createdNode = createdProduct.productCreate.product;
    const createdVariant = createdNode?.variants.nodes[0];
    const createdInventoryItemId = createdVariant?.inventoryItem?.id;

    if (!createdNode?.id || !createdVariant?.id || !createdInventoryItemId) {
      throw new BadGatewayException(
        'Shopify productCreate no devolvio productId, variantId o inventoryItemId',
      );
    }

    const updatedProduct =
      await this.shopifyService.graphql<
        ShopifyProductVariantsBulkUpdateMutationResponse,
        ShopifyProductVariantsBulkUpdateMutationVariables
      >(this.productVariantsBulkUpdateMutation, {
        productId: createdNode.id,
        variants: [
          {
            id: createdVariant.id,
            price: normalizedInput.price,
            inventoryItem: {
              sku: normalizedInput.sku,
            },
          },
        ],
      });

    this.assertNoUserErrors(
      updatedProduct.productVariantsBulkUpdate.userErrors,
      'Shopify productVariantsBulkUpdate',
    );

    const updatedVariant =
      updatedProduct.productVariantsBulkUpdate.productVariants[0];
    const updatedInventoryItemId = updatedVariant?.inventoryItem?.id;

    if (
      !updatedProduct.productVariantsBulkUpdate.product?.id ||
      !updatedVariant?.id ||
      !updatedInventoryItemId
    ) {
      throw new BadGatewayException(
        'Shopify productVariantsBulkUpdate no devolvio los identificadores esperados',
      );
    }

    this.logger.log(
      `Producto de prueba creado en Shopify. productId=${createdNode.id}, variantId=${updatedVariant.id}`,
    );

    return {
      ok: true,
      productId: createdNode.id,
      variantId: updatedVariant.id,
      inventoryItemId: updatedInventoryItemId,
    };
  }

  // ----------------------------------------------------------
  // Phase 2: sync real OMS -> Shopify
  // ----------------------------------------------------------

  /**
   * Sincroniza un producto OMS a Shopify (create o update) de forma idempotente.
   *
   * Flujo:
   *   1. Validar productoId y scope de empresa del actor
   *   2. Resolver integración Shopify activa para la empresa
   *   3. Cargar agregado OMS del producto con precios resueltos
   *   4. Decidir path (CREATED vs UPDATED) según mapping existente
   *   5. Ejecutar writer Shopify (2024-01)
   *   6. Persistir mapping externo
   *   7. Loggear y devolver resultado
   */
  async syncProduct(
    productoId: number,
    dto: SyncShopifyProductDto,
    user: SafeUser,
  ): Promise<ShopifySyncProductResult> {
    const startedAt = Date.now();

    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new BadRequestException('productoId debe ser un entero mayor a 0');
    }

    // Scope check: usuarios de tienda solo pueden sincronizar su empresa
    if (user.storeId !== undefined && user.storeId !== String(dto.empresaId)) {
      throw new ForbiddenException(
        'No tiene acceso a sincronizar productos de esta empresa',
      );
    }

    // Resolver integración Shopify outbound activa
    const integracion = await this.integracionRepo.findActiveForEmpresa(
      dto.empresaId,
    );
    if (!integracion) {
      throw new ConflictException(
        `No hay integración Shopify activa para empresaId=${dto.empresaId}`,
      );
    }

    const config = integracion.config;

    // Cargar agregado OMS del producto con precios resueltos
    const aggregate = await this.catalogRepo.findProductForSync(
      productoId,
      dto.empresaId,
      config.catalog.pricePriority,
    );

    if (!aggregate) {
      throw new NotFoundException(
        `Producto ${productoId} no encontrado o inactivo para empresaId=${dto.empresaId}`,
      );
    }

    if (aggregate.variants.length === 0) {
      throw new ConflictException(
        `El producto ${productoId} no tiene variantes activas`,
      );
    }

    // Bloquear si alguna variante no tiene precio según la prioridad configurada
    const variantesSinPrecio = aggregate.variants
      .filter((v) => v.price === null)
      .map((v) => `VarianteId=${v.varianteId} (SKU=${v.sku})`);

    if (variantesSinPrecio.length > 0) {
      throw new ConflictException(
        `Las siguientes variantes no tienen precio según la prioridad configurada: ${variantesSinPrecio.join(', ')}`,
      );
    }

    // Determinar vendor y productType con fallbacks de ConfigJson
    const vendor =
      aggregate.vendor ||
      config.catalog.defaultVendor ||
      '';
    const productType =
      aggregate.productType ||
      config.catalog.defaultProductType ||
      '';

    // Verificar si ya existe un mapping (decide path CREATED vs UPDATED)
    const existingMapping = await this.mappingRepo.findProductMapping(
      integracion.integracionSalienteId,
      productoId,
    );

    const warnings: string[] = [];
    let writerResult: Awaited<
      ReturnType<typeof this.productWriter.create>
    >;
    let mode: 'CREATED' | 'UPDATED';

    if (!existingMapping) {
      // ------ PATH CREATED ------
      writerResult = await this.productWriter.create({
        title: aggregate.title,
        descriptionHtml: aggregate.descriptionHtml,
        vendor,
        productType,
        status: config.catalog.publishStatus,
        variants: aggregate.variants.map((v) => ({
          sku: v.sku,
          price: v.price!, // garantizado no-null por la validación anterior
        })),
      });
      mode = 'CREATED';
    } else {
      // ------ PATH UPDATED ------
      // Cargar mappings de variantes existentes para pasar sus IDs a Shopify
      const existingVariantMappings = await this.mappingRepo.findVariantMappings(
        integracion.integracionSalienteId,
        productoId,
      );

      const variantMappingById = new Map(
        existingVariantMappings.map((m) => [m.varianteId, m]),
      );

      // Variantes sin mapping previo se tratarán con su shopifyVariantId del writer
      const variantsWithIds = aggregate.variants.map((v) => {
        const existing = variantMappingById.get(v.varianteId);
        if (!existing) {
          warnings.push(
            `VarianteId=${v.varianteId} no tiene mapping previo en Shopify — se intentará crear`,
          );
        }
        return {
          id: existing?.externalVariantId ?? '',
          sku: v.sku,
          price: v.price!,
        };
      });

      const variantsToUpdate = variantsWithIds.filter((v) => v.id !== '');

      if (variantsToUpdate.length === 0) {
        throw new ConflictException(
          `El producto ${productoId} tiene mapping de producto en Shopify, pero no tiene variantes mapeadas para actualizar`,
        );
      }

      writerResult = await this.productWriter.update(
        existingMapping.externalProductId,
        {
          title: aggregate.title,
          descriptionHtml: aggregate.descriptionHtml,
          vendor,
          productType,
          variants: variantsToUpdate,
        },
      );
      mode = 'UPDATED';
    }

    // Persistir mapping del producto
    const productMappingInput: UpsertProductMappingInput = {
      integracionSalienteId: integracion.integracionSalienteId,
      productoId,
      externalProductId: writerResult.productId,
      estado: 'SINCRONIZADO',
    };
    await this.mappingRepo.upsertProductMapping(productMappingInput);

    // Persistir mapping de variantes
    // Cruzar resultado del writer con el aggregate por posición
    const variantMappingInputs: UpsertVariantMappingInput[] =
      writerResult.variants
        .map((writerVariant, index) => {
          const omsVariant = aggregate.variants[index];
          if (!omsVariant) return null;
          return {
            integracionSalienteId: integracion.integracionSalienteId,
            productoId,
            varianteId: omsVariant.varianteId,
            externalVariantId: writerVariant.variantId,
            inventoryItemId: writerVariant.inventoryItemId,
            estado: 'SINCRONIZADO',
          } satisfies UpsertVariantMappingInput;
        })
        .filter((v): v is UpsertVariantMappingInput => v !== null);

    await this.mappingRepo.upsertVariantMappings(variantMappingInputs);

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Sync completado. empresaId=${dto.empresaId}, integracionId=${integracion.integracionSalienteId}, ` +
        `productoId=${productoId}, mode=${mode}, shopifyProductId=${writerResult.productId}, ` +
        `durationMs=${durationMs}`,
    );

    const variantResults: ShopifySyncVariantResult[] = variantMappingInputs.map(
      (m) => ({
        varianteId: m.varianteId,
        shopifyVariantId: m.externalVariantId,
        inventoryItemId: m.inventoryItemId,
      }),
    );

    return {
      ok: true,
      mode,
      integracionId: integracion.integracionSalienteId,
      productoId,
      shopifyProductId: writerResult.productId,
      variants: variantResults,
      warnings,
    };
  }

  /**
   * Placeholder para sync de inventario OMS -> Shopify.
   * Se implementará en un endpoint separado sobre inventorySetQuantities.
   */
  async syncInventory(_productoId: number): Promise<never> {
    throw new HttpException('Not implemented', HttpStatus.NOT_IMPLEMENTED);
  }

  // ----------------------------------------------------------
  // Helpers compartidos
  // ----------------------------------------------------------

  private assertNoUserErrors(
    userErrors: ShopifyUserError[] | null | undefined,
    context: string,
  ): void {
    if (!Array.isArray(userErrors) || userErrors.length === 0) {
      return;
    }

    const message = userErrors
      .map((error) => {
        const field = Array.isArray(error.field) ? error.field.join('.') : null;
        return field ? `${field}: ${error.message}` : error.message;
      })
      .join(' | ');

    this.logger.warn(`${context} userErrors: ${message}`);
    throw new BadRequestException(message);
  }

  private normalizeRequiredText(
    value: string,
    fieldName: string,
    maxLength: number,
  ): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`El campo ${fieldName} no puede estar vacio`);
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede exceder ${maxLength} caracteres`,
      );
    }
    return normalized;
  }

  private normalizeSku(value: string): string {
    const normalized = this.normalizeRequiredText(value, 'sku', 120);
    return normalized.toUpperCase();
  }

  private normalizePrice(value: number): string {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('El campo price debe ser un numero >= 0');
    }

    return value.toFixed(2);
  }

  private readonly productCreateMutation = `
    mutation CreateShopifyTestProduct($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product {
          id
          variants(first: 1) {
            nodes {
              id
              inventoryItem {
                id
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  private readonly productVariantsBulkUpdateMutation = `
    mutation UpdateShopifyTestProductVariant(
      $productId: ID!
      $variants: [ProductVariantsBulkInput!]!
    ) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        product {
          id
        }
        productVariants {
          id
          inventoryItem {
            id
            sku
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
}
