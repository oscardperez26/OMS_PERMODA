import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SafeUser } from '../auth/auth.types';
import { CreateShopifyTestProductDto } from './dto/create-shopify-test-product.dto';
import { SyncShopifyProductDto } from './dto/sync-shopify-product.dto';
import { ShopifyExternalMappingRepository } from './shopify-external-mapping.repository';
import { ShopifyIntegracionSalienteRepository } from './shopify-integracion-saliente.repository';
import { ShopifyInventoryWriter } from './shopify-inventory-writer';
import { ShopifyOmsCatalogRepository } from './shopify-oms-catalog.repository';
import { ShopifyProductWriter } from './shopify-product-writer';
import type {
  ShopifyTestProductResult,
  ShopifyUserError,
} from './shopify-products.types';
import type {
  ShopifyArchiveProductResult,
  ShopifySyncAllInventoryEntry,
  ShopifySyncAllInventoryResult,
  ShopifySyncAllProductEntry,
  ShopifySyncAllProductsResult,
  ShopifySyncInventoryResult,
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
    private readonly inventoryWriter: ShopifyInventoryWriter,
    private readonly configService: ConfigService,
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
    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new BadRequestException('productoId debe ser un entero mayor a 0');
    }

    // Scope check: usuarios de tienda solo pueden sincronizar su empresa
    if (user.storeId !== undefined && user.storeId !== String(dto.empresaId)) {
      throw new ForbiddenException(
        'No tiene acceso a sincronizar productos de esta empresa',
      );
    }

    return this.syncProductCore(productoId, dto.empresaId);
  }

  /**
   * Lógica core de sync de producto sin validación de usuario.
   * Usado directamente por syncAllProducts y el scheduler automático.
   */
  private async syncProductCore(
    productoId: number,
    empresaId: number,
  ): Promise<ShopifySyncProductResult> {
    const startedAt = Date.now();

    // Resolver integración Shopify outbound activa
    const integracion = await this.integracionRepo.findActiveForEmpresa(empresaId);
    if (!integracion) {
      throw new ConflictException(
        `No hay integración Shopify activa para empresaId=${empresaId}`,
      );
    }

    const config = integracion.config;

    // Cargar agregado OMS del producto con precios resueltos
    const aggregate = await this.catalogRepo.findProductForSync(
      productoId,
      empresaId,
      config.catalog.pricePriority,
    );

    if (!aggregate) {
      throw new NotFoundException(
        `Producto ${productoId} no encontrado o inactivo para empresaId=${empresaId}`,
      );
    }

    if (aggregate.variants.length === 0) {
      throw new ConflictException(
        `El producto ${productoId} no tiene variantes activas`,
      );
    }

    // Separar variantes con y sin precio.
    // Las sin precio se omiten con warning — no bloquean el sync del resto.
    const warnings: string[] = [];
    const variantesSinPrecio = aggregate.variants.filter((v) => v.price === null);
    const variantesConPrecio = aggregate.variants.filter((v) => v.price !== null);

    if (variantesSinPrecio.length > 0) {
      const skuList = variantesSinPrecio.map((v) => `SKU=${v.sku}`).join(', ');
      warnings.push(`Variantes omitidas (sin precio configurado): ${skuList}`);
      this.logger.warn(
        `[syncProduct] productoId=${productoId}: ${variantesSinPrecio.length} variante(s) sin precio omitidas: ${skuList}`,
      );
    }

    if (variantesConPrecio.length === 0) {
      throw new ConflictException(
        `Producto ${productoId}: ninguna variante tiene precio según la prioridad configurada`,
      );
    }

    // Continuar el sync solo con las variantes que tienen precio
    const syncableAggregate = { ...aggregate, variants: variantesConPrecio };

    // Determinar vendor y productType con fallbacks de ConfigJson
    const vendor = syncableAggregate.vendor || config.catalog.defaultVendor || '';
    const productType =
      syncableAggregate.productType || config.catalog.defaultProductType || '';

    // Reservar un slot PENDIENTE antes de escribir en Shopify.
    const reservedMapping = await this.mappingRepo.reserveProductMapping(
      integracion.integracionSalienteId,
      productoId,
    );
    let writerResult: Awaited<ReturnType<typeof this.productWriter.create>>;
    let mode: 'CREATED' | 'UPDATED';
    let varianteIdByWriterIndex: number[];

    const isPendingWithGid =
      reservedMapping?.estado === 'PENDIENTE' && !!reservedMapping.externalProductId;
    const isSincronizado = reservedMapping?.estado === 'SINCRONIZADO';

    if (isPendingWithGid) {
      // ------ PATH RECOVERY ------
      this.logger.warn(
        `[syncProduct] Recuperando sync parcial para productoId=${productoId}, ` +
          `shopifyProductId=${reservedMapping!.externalProductId}`,
      );
      varianteIdByWriterIndex = syncableAggregate.variants.map((v) => v.varianteId);
      writerResult = await this.productWriter.getProductVariants(
        reservedMapping!.externalProductId,
      );
      mode = 'CREATED';
    } else if (!isSincronizado) {
      // ------ PATH CREATED ------
      varianteIdByWriterIndex = syncableAggregate.variants.map((v) => v.varianteId);

      writerResult = await this.productWriter.create({
        title: syncableAggregate.title,
        descriptionHtml: syncableAggregate.descriptionHtml,
        vendor,
        productType,
        status: config.catalog.publishStatus,
        variants: syncableAggregate.variants.map((v) => ({
          sku: v.sku,
          price: v.price!,
        })),
      });
      mode = 'CREATED';

      await this.mappingRepo.upsertProductMapping({
        integracionSalienteId: integracion.integracionSalienteId,
        productoId,
        externalProductId: writerResult.productId,
        estado: 'PENDIENTE',
      });
    } else {
      // ------ PATH UPDATED ------
      const existingVariantMappings = await this.mappingRepo.findVariantMappings(
        integracion.integracionSalienteId,
        productoId,
      );

      const variantMappingById = new Map(
        existingVariantMappings.map((m) => [m.varianteId, m]),
      );

      const variantsWithIds = syncableAggregate.variants.map((v) => ({
        varianteId: v.varianteId,
        id: variantMappingById.get(v.varianteId)?.externalVariantId ?? '',
        sku: v.sku,
        price: v.price!,
      }));

      const variantsToUpdate = variantsWithIds.filter((v) => v.id !== '');
      const variantsToCreate = variantsWithIds.filter((v) => v.id === '');

      if (variantsToUpdate.length === 0) {
        throw new ConflictException(
          `El producto ${productoId} tiene mapping de producto en Shopify, pero no tiene variantes mapeadas para actualizar`,
        );
      }

      varianteIdByWriterIndex = variantsToUpdate.map((v) => v.varianteId);

      writerResult = await this.productWriter.update(
        reservedMapping!.externalProductId,
        {
          title: syncableAggregate.title,
          descriptionHtml: syncableAggregate.descriptionHtml,
          vendor,
          productType,
          variants: variantsToUpdate,
        },
      );
      mode = 'UPDATED';

      if (variantsToCreate.length > 0) {
        const addResult = await this.productWriter.addVariants(
          reservedMapping!.externalProductId,
          variantsToCreate.map((v) => ({ sku: v.sku, price: v.price })),
        );
        writerResult.variants.push(...addResult.variants);
        varianteIdByWriterIndex.push(...variantsToCreate.map((v) => v.varianteId));
        warnings.push(...addResult.warnings);
      }
    }

    const variantMappingInputs: UpsertVariantMappingInput[] =
      writerResult.variants
        .map((writerVariant, index) => {
          const varianteId = varianteIdByWriterIndex[index];
          if (!varianteId) return null;
          return {
            integracionSalienteId: integracion.integracionSalienteId,
            productoId,
            varianteId,
            externalVariantId: writerVariant.variantId,
            inventoryItemId: writerVariant.inventoryItemId,
            estado: 'SINCRONIZADO',
          } satisfies UpsertVariantMappingInput;
        })
        .filter((v): v is UpsertVariantMappingInput => v !== null);

    await this.mappingRepo.upsertVariantMappings(variantMappingInputs);

    // Confirmar SINCRONIZADO — two-phase commit: PENDIENTE → SINCRONIZADO.
    await this.mappingRepo.upsertProductMapping({
      integracionSalienteId: integracion.integracionSalienteId,
      productoId,
      externalProductId: writerResult.productId,
      estado: 'SINCRONIZADO',
    });

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Sync completado. empresaId=${empresaId}, integracionId=${integracion.integracionSalienteId}, ` +
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
   * Sincroniza todos los productos activos de una empresa a Shopify.
   * Aplica un delay de 500ms entre productos para respetar el rate-limit de Shopify.
   * Los errores por producto se capturan individualmente — el batch no se detiene.
   */
  async syncAllProducts(empresaId: number): Promise<ShopifySyncAllProductsResult> {
    const ids = await this.catalogRepo.findAllProductIds(empresaId);
    let sincronizados = 0;
    let errores = 0;
    const resultados: ShopifySyncAllProductEntry[] = [];

    for (let i = 0; i < ids.length; i++) {
      const productoId = ids[i];
      if (i > 0) await this.sleep(500);

      try {
        const result = await this.syncProductCore(productoId, empresaId);
        sincronizados++;
        resultados.push({
          productoId,
          ok: true,
          mode: result.mode,
          warnings: result.warnings.length > 0 ? result.warnings : undefined,
        });
      } catch (error) {
        errores++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`syncAllProducts: error en productoId=${productoId}: ${message}`);
        resultados.push({ productoId, ok: false, error: message });
      }
    }

    return { total: ids.length, sincronizados, errores, resultados };
  }

  /**
   * Archiva un producto en Shopify (estado ARCHIVED) y marca su mapping en OMS.
   *
   * Precondición: el producto debe tener un mapping en estado SINCRONIZADO.
   * No elimina variantes en Shopify — preserva el historial de pedidos.
   */
  async archiveProduct(
    productoId: number,
    dto: SyncShopifyProductDto,
    user: SafeUser,
  ): Promise<ShopifyArchiveProductResult> {
    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new BadRequestException('productoId debe ser un entero mayor a 0');
    }

    if (user.storeId !== undefined && user.storeId !== String(dto.empresaId)) {
      throw new ForbiddenException(
        'No tiene acceso a archivar productos de esta empresa',
      );
    }

    const integracion = await this.integracionRepo.findActiveForEmpresa(dto.empresaId);
    if (!integracion) {
      throw new ConflictException(
        `No hay integración Shopify activa para empresaId=${dto.empresaId}`,
      );
    }

    const mapping = await this.mappingRepo.findProductMapping(
      integracion.integracionSalienteId,
      productoId,
    );

    if (!mapping || mapping.estado !== 'SINCRONIZADO') {
      throw new ConflictException(
        `El producto ${productoId} no tiene mapping SINCRONIZADO en Shopify — no se puede archivar`,
      );
    }

    await this.productWriter.archiveProduct(mapping.externalProductId);
    await this.mappingRepo.markProductAndVariantsArchived(
      integracion.integracionSalienteId,
      productoId,
    );

    this.logger.log(
      `Producto archivado. empresaId=${dto.empresaId}, productoId=${productoId}, shopifyProductId=${mapping.externalProductId}`,
    );

    return {
      ok: true,
      productoId,
      shopifyProductId: mapping.externalProductId,
    };
  }

  /**
   * Sincroniza el inventario de un producto OMS a Shopify via inventorySetQuantities.
   * Requiere que el producto ya tenga variantes mapeadas con InventoryItemId.
   * El locationId se toma de config.inventory.locationId o de la variable de entorno SHOPIFY_LOCATION_ID.
   */
  async syncInventory(
    productoId: number,
    dto: SyncShopifyProductDto,
    user: SafeUser,
  ): Promise<ShopifySyncInventoryResult> {
    if (!Number.isInteger(productoId) || productoId <= 0) {
      throw new BadRequestException('productoId debe ser un entero mayor a 0');
    }

    if (user.storeId !== undefined && user.storeId !== String(dto.empresaId)) {
      throw new ForbiddenException(
        'No tiene acceso a sincronizar inventario de esta empresa',
      );
    }

    return this.syncInventoryCore(productoId, dto.empresaId);
  }

  /**
   * Lógica core de sync de inventario sin validación de usuario.
   * Usado directamente por syncAllInventory y el scheduler automático.
   */
  private async syncInventoryCore(
    productoId: number,
    empresaId: number,
  ): Promise<ShopifySyncInventoryResult> {
    const integracion = await this.integracionRepo.findActiveForEmpresa(empresaId);
    if (!integracion) {
      throw new ConflictException(
        `No hay integración Shopify activa para empresaId=${empresaId}`,
      );
    }

    const rawLocationId =
      integracion.config.inventory?.locationId ??
      this.configService.get<string>('SHOPIFY_LOCATION_ID');

    if (!rawLocationId) {
      throw new ConflictException(
        'No se encontró locationId — configura inventory.locationId en ConfigJson o la variable SHOPIFY_LOCATION_ID',
      );
    }

    // Shopify GraphQL requiere GID completo. Si el config almacena solo el número
    // (ej: "89877512421") lo normalizamos aquí para no depender del formato del config.
    const locationId = rawLocationId.startsWith('gid://')
      ? rawLocationId
      : `gid://shopify/Location/${rawLocationId}`;

    const variantMappings = await this.mappingRepo.findVariantMappings(
      integracion.integracionSalienteId,
      productoId,
    );

    const mappingsWithInventory = variantMappings.filter(
      (m) => m.inventoryItemId && m.estado === 'SINCRONIZADO',
    );

    if (mappingsWithInventory.length === 0) {
      throw new ConflictException(
        `El producto ${productoId} no tiene variantes con InventoryItemId mapeado en Shopify`,
      );
    }

    const varianteIds = mappingsWithInventory.map((m) => m.varianteId);
    const stockMap = await this.catalogRepo.findVariantStockMap(varianteIds);

    const quantities = mappingsWithInventory.map((m) => ({
      inventoryItemId: m.inventoryItemId!,
      quantity: stockMap.get(m.varianteId) ?? 0,
    }));

    const setResult = await this.inventoryWriter.setQuantities({
      locationId,
      quantities,
    });

    this.logger.log(
      `Inventario sincronizado. empresaId=${empresaId}, productoId=${productoId}, ` +
        `locationId=${locationId}, quantitiesSet=${setResult.quantitiesSet}`,
    );

    const variantResults = mappingsWithInventory.map((m, i) => ({
      varianteId: m.varianteId,
      inventoryItemId: m.inventoryItemId!,
      quantity: quantities[i].quantity,
    }));

    return {
      ok: true,
      productoId,
      locationId,
      quantitiesSet: setResult.quantitiesSet,
      variants: variantResults,
      warnings: [],
    };
  }

  /**
   * Sincroniza el inventario de todos los productos activos de una empresa a Shopify.
   * Aplica delay de 500ms entre productos. Los errores se capturan individualmente.
   */
  async syncAllInventory(empresaId: number): Promise<ShopifySyncAllInventoryResult> {
    const ids = await this.catalogRepo.findAllProductIds(empresaId);
    let sincronizados = 0;
    let errores = 0;
    const resultados: ShopifySyncAllInventoryEntry[] = [];

    for (let i = 0; i < ids.length; i++) {
      const productoId = ids[i];
      if (i > 0) await this.sleep(500);

      try {
        const result = await this.syncInventoryCore(productoId, empresaId);
        sincronizados++;
        resultados.push({ productoId, ok: true, quantitiesSet: result.quantitiesSet });
      } catch (error) {
        errores++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`syncAllInventory: error en productoId=${productoId}: ${message}`);
        resultados.push({ productoId, ok: false, error: message });
      }
    }

    return { total: ids.length, sincronizados, errores, resultados };
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

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
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
