import { BadRequestException } from '@nestjs/common';
import {
  ShopifyProductWriter,
  type ProductWriterCreateInput,
} from './shopify-product-writer';
import { ShopifyService } from './shopify.service';

describe('ShopifyProductWriter', () => {
  let graphqlMock: jest.Mock;
  let writer: ShopifyProductWriter;

  beforeEach(() => {
    graphqlMock = jest.fn();
    writer = new ShopifyProductWriter(
      { graphql: graphqlMock } as unknown as ShopifyService,
    );
  });

  it('crea producto multi-variante sin reutilizar el mismo variantId', async () => {
    const input: ProductWriterCreateInput = {
      title: 'Producto OMS',
      descriptionHtml: '<p>Descripcion</p>',
      vendor: 'Marca',
      productType: 'Categoria',
      status: 'DRAFT',
      variants: [
        { sku: 'SKU-001', price: '100.00' },
        { sku: 'SKU-002', price: '110.00' },
        { sku: 'SKU-003', price: '120.00' },
      ],
    };

    graphqlMock
      .mockResolvedValueOnce({
        productCreate: {
          product: {
            id: 'gid://shopify/Product/1',
            options: [
              {
                id: 'gid://shopify/ProductOption/1',
                name: 'SKU',
                optionValues: [
                  {
                    id: 'gid://shopify/ProductOptionValue/1',
                    name: 'SKU-001',
                    hasVariants: true,
                  },
                  {
                    id: 'gid://shopify/ProductOptionValue/2',
                    name: 'SKU-002',
                    hasVariants: false,
                  },
                  {
                    id: 'gid://shopify/ProductOptionValue/3',
                    name: 'SKU-003',
                    hasVariants: false,
                  },
                ],
              },
            ],
            variants: {
              nodes: [
                {
                  id: 'gid://shopify/ProductVariant/standalone',
                  inventoryItem: {
                    id: 'gid://shopify/InventoryItem/standalone',
                    sku: null,
                  },
                },
              ],
            },
          },
          userErrors: [],
        },
      })
      .mockResolvedValueOnce({
        productVariantsBulkUpdate: {
          product: {
            id: 'gid://shopify/Product/1',
          },
          productVariants: [
            {
              id: 'gid://shopify/ProductVariant/101',
              inventoryItem: {
                id: 'gid://shopify/InventoryItem/101',
                sku: 'SKU-001',
              },
            },
          ],
          userErrors: [],
        },
      })
      .mockResolvedValueOnce({
        productVariantsBulkCreate: {
          product: {
            id: 'gid://shopify/Product/1',
          },
          productVariants: [
            {
              id: 'gid://shopify/ProductVariant/102',
              inventoryItem: {
                id: 'gid://shopify/InventoryItem/102',
                sku: 'SKU-002',
              },
            },
            {
              id: 'gid://shopify/ProductVariant/103',
              inventoryItem: {
                id: 'gid://shopify/InventoryItem/103',
                sku: 'SKU-003',
              },
            },
          ],
          userErrors: [],
        },
      });

    await expect(writer.create(input)).resolves.toEqual({
      productId: 'gid://shopify/Product/1',
      variants: [
        {
          variantId: 'gid://shopify/ProductVariant/101',
          inventoryItemId: 'gid://shopify/InventoryItem/101',
        },
        {
          variantId: 'gid://shopify/ProductVariant/102',
          inventoryItemId: 'gid://shopify/InventoryItem/102',
        },
        {
          variantId: 'gid://shopify/ProductVariant/103',
          inventoryItemId: 'gid://shopify/InventoryItem/103',
        },
      ],
    });

    expect(graphqlMock).toHaveBeenCalledTimes(3);
    expect(graphqlMock.mock.calls[0][1]).toEqual({
      product: {
        title: 'Producto OMS',
        descriptionHtml: '<p>Descripcion</p>',
        vendor: 'Marca',
        productType: 'Categoria',
        status: 'DRAFT',
        productOptions: [
          {
            name: 'SKU',
            values: [{ name: 'SKU-001' }, { name: 'SKU-002' }, { name: 'SKU-003' }],
          },
        ],
      },
    });
    expect(graphqlMock.mock.calls[1][1]).toEqual({
      productId: 'gid://shopify/Product/1',
      variants: [
        {
          id: 'gid://shopify/ProductVariant/standalone',
          price: '100.00',
          inventoryItem: { sku: 'SKU-001' },
        },
      ],
    });
    expect(graphqlMock.mock.calls[2][1]).toEqual({
      productId: 'gid://shopify/Product/1',
      variants: [
        {
          price: '110.00',
          inventoryItem: { sku: 'SKU-002' },
          optionValues: [{ name: 'SKU-002', optionName: 'SKU' }],
        },
        {
          price: '120.00',
          inventoryItem: { sku: 'SKU-003' },
          optionValues: [{ name: 'SKU-003', optionName: 'SKU' }],
        },
      ],
    });
  });

  it('rechaza SKUs duplicados en create multi-variante', async () => {
    const input: ProductWriterCreateInput = {
      title: 'Producto OMS',
      descriptionHtml: '<p>Descripcion</p>',
      vendor: 'Marca',
      productType: 'Categoria',
      status: 'DRAFT',
      variants: [
        { sku: 'SKU-001', price: '100.00' },
        { sku: 'SKU-001', price: '110.00' },
      ],
    };

    await expect(writer.create(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(graphqlMock).not.toHaveBeenCalled();
  });
});
