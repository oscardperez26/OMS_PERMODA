import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import type { ShopifyUserError } from './shopify-products.types';

// ============================================================
// Tipos internos del writer
// ============================================================

export type ProductWriterVariantInput = {
  /** ID GID de la variante en Shopify - solo para update */
  id?: string;
  sku: string;
  price: string;
};

export type ProductWriterCreateInput = {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  status: 'DRAFT' | 'ACTIVE';
  variants: ProductWriterVariantInput[];
};

export type ProductWriterUpdateInput = {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  variants: Array<ProductWriterVariantInput & { id: string }>;
};

export type ProductWriterVariantResult = {
  variantId: string;
  inventoryItemId: string | null;
};

export type ProductWriterResult = {
  productId: string;
  variants: ProductWriterVariantResult[];
};

// ============================================================
// Tipos de respuesta GraphQL - 2024-01
// ============================================================

type GqlProductCreateVariables = {
  product: {
    title: string;
    descriptionHtml: string;
    vendor: string;
    productType: string;
    status: 'DRAFT' | 'ACTIVE';
    productOptions?: Array<{
      name: string;
      values: Array<{
        name: string;
      }>;
    }>;
  };
};

type GqlProductCreateResponse = {
  productCreate: {
    product: {
      id: string;
      options: Array<{
        id: string;
        name: string;
        optionValues: Array<{
          id: string;
          name: string;
          hasVariants: boolean;
        }>;
      }>;
      variants: {
        nodes: Array<{
          id: string;
          inventoryItem: { id: string; sku: string | null } | null;
        }>;
      };
    } | null;
    userErrors: ShopifyUserError[];
  };
};

type GqlProductVariantsQueryVariables = {
  productId: string;
};

type GqlProductVariantsQueryResponse = {
  product: {
    id: string;
    variants: {
      nodes: Array<{
        id: string;
        inventoryItem: { id: string } | null;
      }>;
    };
  } | null;
};

type GqlProductUpdateVariables = {
  product: {
    id: string;
    title: string;
    descriptionHtml: string;
    vendor: string;
    productType: string;
    status?: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  };
};

type GqlProductUpdateResponse = {
  productUpdate: {
    product: { id: string } | null;
    userErrors: ShopifyUserError[];
  };
};

type GqlVariantsBulkUpdateVariables = {
  productId: string;
  variants: Array<{
    id: string;
    price: string;
    inventoryItem: { sku: string };
  }>;
};

type GqlVariantsBulkUpdateResponse = {
  productVariantsBulkUpdate: {
    product: { id: string } | null;
    productVariants: Array<{
      id: string;
      inventoryItem: { id: string; sku: string | null } | null;
    }>;
    userErrors: ShopifyUserError[];
  };
};

type GqlVariantsBulkCreateVariables = {
  productId: string;
  variants: Array<{
    price: string;
    inventoryItem: { sku: string };
    optionValues: Array<{
      name: string;
      optionName: string;
    }>;
  }>;
};

type GqlVariantsBulkCreateResponse = {
  productVariantsBulkCreate: {
    product: { id: string } | null;
    productVariants: Array<{
      id: string;
      inventoryItem: { id: string; sku: string | null } | null;
    }>;
    userErrors: ShopifyUserError[];
  };
};

// ============================================================
// ShopifyProductWriter
//
// Encapsula las mutaciones GraphQL de Shopify para API 2024-01.
// Cuando el proyecto migre a 2026-01, solo se cambia esta clase.
// ============================================================

@Injectable()
export class ShopifyProductWriter {
  private readonly logger = new Logger(ShopifyProductWriter.name);
  private readonly syntheticOptionName = 'SKU';

  constructor(private readonly shopifyService: ShopifyService) {}

  /**
   * Crea un producto en Shopify (path CREATED).
   * - 1 variante: productCreate + productVariantsBulkUpdate.
   * - multiples variantes: productCreate con opciones + update de la standalone
   *   + productVariantsBulkCreate para el resto.
   */
  async create(input: ProductWriterCreateInput): Promise<ProductWriterResult> {
    this.logger.log(
      `Creando producto en Shopify. title="${input.title}", variantes=${input.variants.length}`,
    );

    if (input.variants.length === 0) {
      throw new BadRequestException(
        'No es posible crear un producto Shopify sin variantes',
      );
    }

    if (input.variants.length === 1) {
      return this.createSingleVariantProduct(input);
    }

    return this.createMultiVariantProduct(input);
  }

  /**
   * Recupera los IDs de variante de un producto ya existente en Shopify.
   * Se usa en el path de recovery cuando el producto fue creado pero los
   * mappings no se confirmaron (estado PENDIENTE con GID real en OMS).
   */
  async getProductVariants(
    shopifyProductId: string,
  ): Promise<ProductWriterResult> {
    const data = await this.shopifyService.graphql<
      GqlProductVariantsQueryResponse,
      GqlProductVariantsQueryVariables
    >(QUERY_PRODUCT_VARIANTS, { productId: shopifyProductId });

    if (!data.product) {
      throw new BadGatewayException(
        `Shopify: producto ${shopifyProductId} no encontrado al recuperar variantes`,
      );
    }

    return {
      productId: shopifyProductId,
      variants: data.product.variants.nodes.map((v) => ({
        variantId: v.id,
        inventoryItemId: v.inventoryItem?.id ?? null,
      })),
    };
  }

  /**
   * Actualiza un producto existente en Shopify (path UPDATED).
   * 1. productUpdate - actualiza campos del producto base.
   * 2. productVariantsBulkUpdate - actualiza SKU y precio de cada variante.
   * Los IDs de variante deben venir del mapping persistido en BD.
   */
  async update(
    shopifyProductId: string,
    input: ProductWriterUpdateInput,
  ): Promise<ProductWriterResult> {
    this.logger.log(
      `Actualizando producto en Shopify. productId=${shopifyProductId}`,
    );

    if (input.variants.length === 0) {
      throw new BadRequestException(
        'No es posible actualizar un producto Shopify sin variantes mapeadas',
      );
    }

    const updateData =
      await this.shopifyService.graphql<
        GqlProductUpdateResponse,
        GqlProductUpdateVariables
      >(MUTATION_PRODUCT_UPDATE, {
        product: {
          id: shopifyProductId,
          title: input.title,
          descriptionHtml: input.descriptionHtml,
          vendor: input.vendor,
          productType: input.productType,
        },
      });

    this.assertNoUserErrors(
      updateData.productUpdate.userErrors,
      'productUpdate',
    );

    if (!updateData.productUpdate.product?.id) {
      throw new BadGatewayException(
        'Shopify productUpdate no devolvio el ID del producto',
      );
    }

    const variantsBulkData =
      await this.shopifyService.graphql<
        GqlVariantsBulkUpdateResponse,
        GqlVariantsBulkUpdateVariables
      >(MUTATION_VARIANTS_BULK_UPDATE, {
        productId: shopifyProductId,
        variants: input.variants.map((variant) => ({
          id: variant.id,
          price: variant.price,
          inventoryItem: { sku: variant.sku },
        })),
      });

    this.assertNoUserErrors(
      variantsBulkData.productVariantsBulkUpdate.userErrors,
      'productVariantsBulkUpdate (update path)',
    );

    const updatedVariants =
      variantsBulkData.productVariantsBulkUpdate.productVariants;

    this.logger.log(
      `Producto actualizado en Shopify. productId=${shopifyProductId}`,
    );

    return {
      productId: shopifyProductId,
      variants: updatedVariants.map((variant) => ({
        variantId: variant.id,
        inventoryItemId: variant.inventoryItem?.id ?? null,
      })),
    };
  }

  /**
   * Añade variantes nuevas a un producto ya existente en Shopify (B1).
   *
   * Usa productVariantsBulkCreate con optionValues referenciando la opción
   * sintética 'SKU' creada durante el create multi-variante.
   *
   * Si Shopify devuelve userErrors (ej. el producto no tiene la opción 'SKU'
   * porque fue creado como single-variant), NO lanza excepción: devuelve los
   * errores como warnings para no bloquear el sync de variantes ya mapeadas.
   */
  async addVariants(
    shopifyProductId: string,
    variants: ProductWriterVariantInput[],
  ): Promise<{ variants: ProductWriterVariantResult[]; warnings: string[] }> {
    this.logger.log(
      `Añadiendo ${variants.length} variante(s) nueva(s) a productId=${shopifyProductId}`,
    );

    const bulkCreateData =
      await this.shopifyService.graphql<
        GqlVariantsBulkCreateResponse,
        GqlVariantsBulkCreateVariables
      >(MUTATION_VARIANTS_BULK_CREATE, {
        productId: shopifyProductId,
        variants: variants.map((v) => ({
          price: v.price,
          inventoryItem: { sku: v.sku },
          optionValues: [{ name: v.sku, optionName: this.syntheticOptionName }],
        })),
      });

    if (
      Array.isArray(bulkCreateData.productVariantsBulkCreate.userErrors) &&
      bulkCreateData.productVariantsBulkCreate.userErrors.length > 0
    ) {
      const warnings =
        bulkCreateData.productVariantsBulkCreate.userErrors.map((e) => {
          const field = Array.isArray(e.field) ? e.field.join('.') : null;
          return field ? `${field}: ${e.message}` : e.message;
        });
      this.logger.warn(
        `addVariants userErrors para productId=${shopifyProductId}: ${warnings.join(' | ')}`,
      );
      return { variants: [], warnings };
    }

    const createdBySku = new Map(
      bulkCreateData.productVariantsBulkCreate.productVariants
        .filter((v) => v.inventoryItem?.sku)
        .map((v) => [v.inventoryItem!.sku!, v]),
    );

    const results: ProductWriterVariantResult[] = [];
    const warnings: string[] = [];

    for (const input of variants) {
      const created = createdBySku.get(input.sku);
      if (!created?.id) {
        warnings.push(
          `Shopify no devolvio variante para SKU=${input.sku} en addVariants`,
        );
        continue;
      }
      results.push({
        variantId: created.id,
        inventoryItemId: created.inventoryItem?.id ?? null,
      });
    }

    this.logger.log(
      `addVariants completado. productId=${shopifyProductId}, creadas=${results.length}`,
    );

    return { variants: results, warnings };
  }

  /**
   * Archiva un producto en Shopify (estado ARCHIVED).
   * No elimina el producto ni sus variantes — preserva historial de pedidos.
   */
  async archiveProduct(shopifyProductId: string): Promise<void> {
    this.logger.log(`Archivando producto en Shopify. productId=${shopifyProductId}`);

    const data = await this.shopifyService.graphql<
      GqlProductUpdateResponse,
      GqlProductUpdateVariables
    >(MUTATION_PRODUCT_UPDATE, {
      product: {
        id: shopifyProductId,
        title: '',
        descriptionHtml: '',
        vendor: '',
        productType: '',
        status: 'ARCHIVED',
      },
    });

    this.assertNoUserErrors(data.productUpdate.userErrors, 'productUpdate (archive)');

    if (!data.productUpdate.product?.id) {
      throw new BadGatewayException(
        `Shopify productUpdate (archive) no devolvio el ID del producto ${shopifyProductId}`,
      );
    }
  }

  private async createSingleVariantProduct(
    input: ProductWriterCreateInput,
  ): Promise<ProductWriterResult> {
    const createData =
      await this.shopifyService.graphql<
        GqlProductCreateResponse,
        GqlProductCreateVariables
      >(MUTATION_PRODUCT_CREATE, {
        product: {
          title: input.title,
          descriptionHtml: input.descriptionHtml,
          vendor: input.vendor,
          productType: input.productType,
          status: input.status,
        },
      });

    this.assertNoUserErrors(
      createData.productCreate.userErrors,
      'productCreate',
    );

    const createdProduct = createData.productCreate.product;
    if (!createdProduct?.id) {
      throw new BadGatewayException(
        'Shopify productCreate no devolvio el ID del producto',
      );
    }

    const standaloneVariant = createdProduct.variants.nodes[0];
    const firstVariant = input.variants[0];

    if (!standaloneVariant?.id || !firstVariant) {
      throw new BadGatewayException(
        'Shopify productCreate no devolvio ninguna variante',
      );
    }

    const updateData =
      await this.shopifyService.graphql<
        GqlVariantsBulkUpdateResponse,
        GqlVariantsBulkUpdateVariables
      >(MUTATION_VARIANTS_BULK_UPDATE, {
        productId: createdProduct.id,
        variants: [
          {
            id: standaloneVariant.id,
            price: firstVariant.price,
            inventoryItem: { sku: firstVariant.sku },
          },
        ],
      });

    this.assertNoUserErrors(
      updateData.productVariantsBulkUpdate.userErrors,
      'productVariantsBulkUpdate (create path)',
    );

    const updatedVariant = updateData.productVariantsBulkUpdate.productVariants[0];
    if (!updatedVariant?.id) {
      throw new BadGatewayException(
        'Shopify productVariantsBulkUpdate no devolvio variantes',
      );
    }

    this.logger.log(
      `Producto creado en Shopify. productId=${createdProduct.id}`,
    );

    return {
      productId: createdProduct.id,
      variants: [
        {
          variantId: updatedVariant.id,
          inventoryItemId: updatedVariant.inventoryItem?.id ?? null,
        },
      ],
    };
  }

  private async createMultiVariantProduct(
    input: ProductWriterCreateInput,
  ): Promise<ProductWriterResult> {
    this.assertUniqueSkus(input.variants);

    const createData =
      await this.shopifyService.graphql<
        GqlProductCreateResponse,
        GqlProductCreateVariables
      >(MUTATION_PRODUCT_CREATE, {
        product: {
          title: input.title,
          descriptionHtml: input.descriptionHtml,
          vendor: input.vendor,
          productType: input.productType,
          status: input.status,
          productOptions: [
            {
              name: this.syntheticOptionName,
              values: input.variants.map((variant) => ({
                name: variant.sku,
              })),
            },
          ],
        },
      });

    this.assertNoUserErrors(
      createData.productCreate.userErrors,
      'productCreate (multi-variant path)',
    );

    const createdProduct = createData.productCreate.product;
    const standaloneVariant = createdProduct?.variants.nodes[0];
    const firstVariant = input.variants[0];

    if (!createdProduct?.id || !standaloneVariant?.id || !firstVariant) {
      throw new BadGatewayException(
        'Shopify productCreate no devolvio el producto o la variante standalone esperada',
      );
    }

    const standaloneUpdate =
      await this.shopifyService.graphql<
        GqlVariantsBulkUpdateResponse,
        GqlVariantsBulkUpdateVariables
      >(MUTATION_VARIANTS_BULK_UPDATE, {
        productId: createdProduct.id,
        variants: [
          {
            id: standaloneVariant.id,
            price: firstVariant.price,
            inventoryItem: { sku: firstVariant.sku },
          },
        ],
      });

    this.assertNoUserErrors(
      standaloneUpdate.productVariantsBulkUpdate.userErrors,
      'productVariantsBulkUpdate (multi-variant standalone path)',
    );

    const updatedStandalone =
      standaloneUpdate.productVariantsBulkUpdate.productVariants[0];

    if (!updatedStandalone?.id) {
      throw new BadGatewayException(
        'Shopify no devolvio la variante standalone actualizada',
      );
    }

    const remainingVariants = input.variants.slice(1);
    if (remainingVariants.length === 0) {
      return {
        productId: createdProduct.id,
        variants: [
          {
            variantId: updatedStandalone.id,
            inventoryItemId: updatedStandalone.inventoryItem?.id ?? null,
          },
        ],
      };
    }

    const bulkCreateData =
      await this.shopifyService.graphql<
        GqlVariantsBulkCreateResponse,
        GqlVariantsBulkCreateVariables
      >(MUTATION_VARIANTS_BULK_CREATE, {
        productId: createdProduct.id,
        variants: remainingVariants.map((variant) => ({
          price: variant.price,
          inventoryItem: { sku: variant.sku },
          optionValues: [
            {
              name: variant.sku,
              optionName: this.syntheticOptionName,
            },
          ],
        })),
      });

    this.assertNoUserErrors(
      bulkCreateData.productVariantsBulkCreate.userErrors,
      'productVariantsBulkCreate (multi-variant path)',
    );

    const createdVariantsBySku = new Map(
      bulkCreateData.productVariantsBulkCreate.productVariants
        .filter((variant) => variant.inventoryItem?.sku)
        .map((variant) => [variant.inventoryItem!.sku!, variant]),
    );

    const createdRemainingVariants = remainingVariants.map((variant) => {
      const createdVariant = createdVariantsBySku.get(variant.sku);
      if (!createdVariant?.id) {
        throw new BadGatewayException(
          `Shopify no devolvio la variante creada para SKU=${variant.sku}`,
        );
      }

      return {
        variantId: createdVariant.id,
        inventoryItemId: createdVariant.inventoryItem?.id ?? null,
      };
    });

    this.logger.log(
      `Producto multi-variante creado en Shopify. productId=${createdProduct.id}, variantes=${input.variants.length}`,
    );

    return {
      productId: createdProduct.id,
      variants: [
        {
          variantId: updatedStandalone.id,
          inventoryItemId: updatedStandalone.inventoryItem?.id ?? null,
        },
        ...createdRemainingVariants,
      ],
    };
  }

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

    this.logger.warn(`Shopify ${context} userErrors: ${message}`);
    throw new BadRequestException(message);
  }

  private assertUniqueSkus(variants: ProductWriterVariantInput[]): void {
    const seen = new Set<string>();

    for (const variant of variants) {
      const normalizedSku = variant.sku.trim();
      if (!normalizedSku) {
        throw new BadRequestException(
          'Todas las variantes deben tener SKU para sincronizarse con Shopify',
        );
      }

      if (seen.has(normalizedSku)) {
        throw new BadRequestException(
          `SKU duplicado en el payload de sync: ${normalizedSku}`,
        );
      }

      seen.add(normalizedSku);
    }
  }
}

// ============================================================
// Mutation strings - API 2024-01
// ============================================================

const MUTATION_PRODUCT_CREATE = `
  mutation ShopifyProductCreate($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        options {
          id
          name
          optionValues {
            id
            name
            hasVariants
          }
        }
        variants(first: 100) {
          nodes {
            id
            inventoryItem {
              id
              sku
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

const MUTATION_PRODUCT_UPDATE = `
  mutation ShopifyProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const MUTATION_VARIANTS_BULK_UPDATE = `
  mutation ShopifyVariantsBulkUpdate(
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

const MUTATION_VARIANTS_BULK_CREATE = `
  mutation ShopifyVariantsBulkCreate(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
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

const QUERY_PRODUCT_VARIANTS = `
  query ShopifyGetProductVariants($productId: ID!) {
    product(id: $productId) {
      id
      variants(first: 100) {
        nodes {
          id
          inventoryItem {
            id
          }
        }
      }
    }
  }
`;
