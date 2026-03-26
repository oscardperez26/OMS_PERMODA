import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type { ShopifyUserError } from './shopify-products.types';
import { ShopifyService } from './shopify.service';

// ============================================================
// Tipos internos del writer
// ============================================================

export type InventorySetQuantitiesInput = {
  /** GID de la location en Shopify: "gid://shopify/Location/XXXX" */
  locationId: string;
  quantities: Array<{
    /** GID del inventory item: "gid://shopify/InventoryItem/XXXX" */
    inventoryItemId: string;
    /** Cantidad disponible a establecer */
    quantity: number;
  }>;
};

export type InventorySetQuantitiesResult = {
  adjustmentGroupId: string | null;
  quantitiesSet: number;
};

// ============================================================
// Tipos de respuesta GraphQL — API 2024-01
// ============================================================

type GqlInventorySetQuantitiesVariables = {
  input: {
    name: string;
    reason: string;
    ignoreCompareQuantity: boolean;
    quantities: Array<{
      inventoryItemId: string;
      locationId: string;
      quantity: number;
    }>;
  };
};

type GqlInventorySetQuantitiesResponse = {
  inventorySetQuantities: {
    inventoryAdjustmentGroup: {
      id: string;
      reason: string;
    } | null;
    userErrors: ShopifyUserError[];
  };
};

// ============================================================
// ShopifyInventoryWriter
// ============================================================

/**
 * Encapsula la mutación inventorySetQuantities de Shopify Admin API 2024-01.
 * Establece cantidades absolutas de inventario disponible para una location.
 *
 * Cuando el proyecto migre a una API más nueva (ej. 2026-01), solo se modifica
 * esta clase — el service permanece intacto.
 */
@Injectable()
export class ShopifyInventoryWriter {
  private readonly logger = new Logger(ShopifyInventoryWriter.name);

  constructor(private readonly shopifyService: ShopifyService) {}

  /**
   * Establece cantidades de inventario disponible en Shopify para una location.
   * Usa `reason: "correction"` e `ignoreCompareQuantity: true` para que
   * Shopify sobrescriba el valor actual sin necesidad de conocer el delta.
   */
  async setQuantities(
    input: InventorySetQuantitiesInput,
  ): Promise<InventorySetQuantitiesResult> {
    this.logger.log(
      `Estableciendo inventario en Shopify. locationId=${input.locationId}, ` +
        `items=${input.quantities.length}`,
    );

    const data = await this.shopifyService.graphql<
      GqlInventorySetQuantitiesResponse,
      GqlInventorySetQuantitiesVariables
    >(MUTATION_INVENTORY_SET_QUANTITIES, {
      input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: input.quantities.map((q) => ({
          inventoryItemId: q.inventoryItemId,
          locationId: input.locationId,
          quantity: q.quantity,
        })),
      },
    });

    const { inventoryAdjustmentGroup, userErrors } =
      data.inventorySetQuantities;

    if (Array.isArray(userErrors) && userErrors.length > 0) {
      const message = userErrors
        .map((e) => {
          const field = Array.isArray(e.field) ? e.field.join('.') : null;
          return field ? `${field}: ${e.message}` : e.message;
        })
        .join(' | ');

      this.logger.warn(`inventorySetQuantities userErrors: ${message}`);
      throw new BadGatewayException(
        `Shopify inventorySetQuantities error: ${message}`,
      );
    }

    this.logger.log(
      `Inventario establecido. adjustmentGroupId=${inventoryAdjustmentGroup?.id ?? 'null'}, ` +
        `quantitiesSet=${input.quantities.length}`,
    );

    return {
      adjustmentGroupId: inventoryAdjustmentGroup?.id ?? null,
      quantitiesSet: input.quantities.length,
    };
  }
}

// ============================================================
// Mutation string — API 2024-01
// ============================================================

const MUTATION_INVENTORY_SET_QUANTITIES = `
  mutation ShopifyInventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        id
        reason
      }
      userErrors {
        field
        message
      }
    }
  }
`;
