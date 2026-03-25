import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { SafeUser } from '../auth/auth.types';
import { CreateShopifyTestProductDto } from './dto/create-shopify-test-product.dto';
import { SyncShopifyProductDto } from './dto/sync-shopify-product.dto';
import { ShopifyExternalMappingRepository } from './shopify-external-mapping.repository';
import { ShopifyIntegracionSalienteRepository } from './shopify-integracion-saliente.repository';
import { ShopifyOmsCatalogRepository } from './shopify-oms-catalog.repository';
import { ShopifyProductWriter } from './shopify-product-writer';
import { ShopifyProductsService } from './shopify-products.service';
import type { ShopifyIntegracionSalienteRow } from './shopify-sync.types';
import { ShopifyService } from './shopify.service';

// ============================================================
// Fixtures comunes
// ============================================================

const ADMIN_USER: SafeUser = {
  id: '1',
  username: 'admin@test.com',
  role: 'ADMIN',
  permissions: ['config.manage'],
  storeId: undefined,
};

const STORE_USER: SafeUser = {
  id: '2',
  username: 'store@test.com',
  role: 'STORE_ADMIN',
  permissions: ['config.manage'],
  storeId: '10',
};

const BASE_DTO: SyncShopifyProductDto = { empresaId: 10 };

const ACTIVE_INTEGRACION: ShopifyIntegracionSalienteRow = {
  integracionSalienteId: 1,
  empresaId: 10,
  providerCode: 'SHOPIFY',
  nombre: 'Shopify Test',
  estado: 'ACTIVO',
  config: {
    flowType: 'OUTBOUND',
    providerCode: 'SHOPIFY',
    catalog: {
      publishStatus: 'DRAFT',
      pricePriority: [{ comercialChannel: 'ONLINE', monedaCodigo: 'COP' }],
    },
  },
};

const OMS_AGGREGATE = {
  productoId: 42,
  empresaId: 10,
  title: 'Camiseta Test',
  descriptionHtml: '<p>Descripcion</p>',
  vendor: 'Marca A',
  productType: 'Ropa',
  variants: [
    {
      varianteId: 101,
      sku: 'SKU-001',
      ean: null,
      nombre: 'Talla M',
      price: '99900.00',
      stockDisponible: 5,
    },
  ],
};

const WRITER_CREATE_RESULT = {
  productId: 'gid://shopify/Product/1',
  variants: [
    { variantId: 'gid://shopify/ProductVariant/2', inventoryItemId: 'gid://shopify/InventoryItem/3' },
  ],
};

// ============================================================
// Phase 1: createTestProduct
// ============================================================

describe('ShopifyProductsService — createTestProduct', () => {
  let graphqlMock: jest.Mock;
  let service: ShopifyProductsService;

  const input: CreateShopifyTestProductDto = {
    title: 'Camiseta Test',
    descriptionHtml: '<p>Producto de prueba</p>',
    vendor: 'OMS',
    productType: 'Apparel',
    sku: 'sku-test-1',
    price: 99900,
  };

  beforeEach(() => {
    graphqlMock = jest.fn();
    service = new ShopifyProductsService(
      { graphql: graphqlMock } as unknown as ShopifyService,
      {} as ShopifyProductWriter,
      {} as ShopifyIntegracionSalienteRepository,
      {} as ShopifyOmsCatalogRepository,
      {} as ShopifyExternalMappingRepository,
    );
  });

  it('crea un producto de prueba y actualiza sku/precio de la variante base', async () => {
    graphqlMock
      .mockResolvedValueOnce({
        productCreate: {
          product: {
            id: 'gid://shopify/Product/1',
            variants: {
              nodes: [
                {
                  id: 'gid://shopify/ProductVariant/2',
                  inventoryItem: {
                    id: 'gid://shopify/InventoryItem/3',
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
              id: 'gid://shopify/ProductVariant/2',
              inventoryItem: {
                id: 'gid://shopify/InventoryItem/3',
                sku: 'SKU-TEST-1',
              },
            },
          ],
          userErrors: [],
        },
      });

    await expect(service.createTestProduct(input)).resolves.toEqual({
      ok: true,
      productId: 'gid://shopify/Product/1',
      variantId: 'gid://shopify/ProductVariant/2',
      inventoryItemId: 'gid://shopify/InventoryItem/3',
    });

    expect(graphqlMock).toHaveBeenCalledTimes(2);
    expect(graphqlMock.mock.calls[1][1]).toEqual({
      productId: 'gid://shopify/Product/1',
      variants: [
        {
          id: 'gid://shopify/ProductVariant/2',
          price: '99900.00',
          inventoryItem: {
            sku: 'SKU-TEST-1',
          },
        },
      ],
    });
  });

  it('traduce userErrors de Shopify a BadRequestException', async () => {
    graphqlMock.mockResolvedValueOnce({
      productCreate: {
        product: null,
        userErrors: [
          {
            field: ['product', 'title'],
            message: 'Title is invalid',
          },
        ],
      },
    });

    await expect(service.createTestProduct(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

// ============================================================
// Phase 2: syncProduct
// ============================================================

describe('ShopifyProductsService — syncProduct', () => {
  let integracionRepoMock: jest.Mocked<ShopifyIntegracionSalienteRepository>;
  let catalogRepoMock: jest.Mocked<ShopifyOmsCatalogRepository>;
  let mappingRepoMock: jest.Mocked<ShopifyExternalMappingRepository>;
  let writerMock: jest.Mocked<ShopifyProductWriter>;
  let service: ShopifyProductsService;

  beforeEach(() => {
    integracionRepoMock = {
      findActiveForEmpresa: jest.fn(),
    } as unknown as jest.Mocked<ShopifyIntegracionSalienteRepository>;

    catalogRepoMock = {
      findProductForSync: jest.fn(),
    } as unknown as jest.Mocked<ShopifyOmsCatalogRepository>;

    mappingRepoMock = {
      findProductMapping: jest.fn(),
      findVariantMappings: jest.fn(),
      upsertProductMapping: jest.fn().mockResolvedValue(undefined),
      upsertVariantMappings: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ShopifyExternalMappingRepository>;

    writerMock = {
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ShopifyProductWriter>;

    service = new ShopifyProductsService(
      {} as ShopifyService,
      writerMock,
      integracionRepoMock,
      catalogRepoMock,
      mappingRepoMock,
    );
  });

  it('devuelve 403 si el usuario de tienda intenta sincronizar otra empresa', async () => {
    const dto: SyncShopifyProductDto = { empresaId: 99 }; // distinta al storeId=10
    await expect(
      service.syncProduct(42, dto, STORE_USER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('devuelve 409 si no hay integración activa para la empresa', async () => {
    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(null);
    await expect(
      service.syncProduct(42, BASE_DTO, ADMIN_USER),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve 404 si el producto no existe en OMS', async () => {
    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(ACTIVE_INTEGRACION);
    catalogRepoMock.findProductForSync.mockResolvedValue(null);
    await expect(
      service.syncProduct(42, BASE_DTO, ADMIN_USER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devuelve 409 si el producto no tiene variantes activas', async () => {
    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(ACTIVE_INTEGRACION);
    catalogRepoMock.findProductForSync.mockResolvedValue({
      ...OMS_AGGREGATE,
      variants: [],
    });
    await expect(
      service.syncProduct(42, BASE_DTO, ADMIN_USER),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve 409 si alguna variante no tiene precio según la prioridad', async () => {
    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(ACTIVE_INTEGRACION);
    catalogRepoMock.findProductForSync.mockResolvedValue({
      ...OMS_AGGREGATE,
      variants: [{ ...OMS_AGGREGATE.variants[0], price: null }],
    });
    await expect(
      service.syncProduct(42, BASE_DTO, ADMIN_USER),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ejecuta path CREATED y persiste mapping cuando no existe mapping previo', async () => {
    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(ACTIVE_INTEGRACION);
    catalogRepoMock.findProductForSync.mockResolvedValue(OMS_AGGREGATE);
    mappingRepoMock.findProductMapping.mockResolvedValue(null);
    writerMock.create.mockResolvedValue(WRITER_CREATE_RESULT);

    const result = await service.syncProduct(42, BASE_DTO, ADMIN_USER);

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('CREATED');
    expect(result.shopifyProductId).toBe('gid://shopify/Product/1');
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].varianteId).toBe(101);
    expect(result.variants[0].shopifyVariantId).toBe('gid://shopify/ProductVariant/2');

    expect(writerMock.create).toHaveBeenCalledTimes(1);
    expect(mappingRepoMock.upsertProductMapping).toHaveBeenCalledTimes(1);
    expect(mappingRepoMock.upsertVariantMappings).toHaveBeenCalledTimes(1);
  });

  it('ejecuta path UPDATED y persiste mapping cuando ya existe mapping previo', async () => {
    const existingMapping = {
      integracionProductoExternoId: 1,
      integracionSalienteId: 1,
      productoId: 42,
      externalProductId: 'gid://shopify/Product/1',
      estado: 'SINCRONIZADO',
      createdAt: new Date(),
      updatedAt: null,
    };
    const existingVariantMapping = {
      integracionVarianteExternaId: 1,
      integracionSalienteId: 1,
      productoId: 42,
      varianteId: 101,
      externalVariantId: 'gid://shopify/ProductVariant/2',
      inventoryItemId: 'gid://shopify/InventoryItem/3',
      estado: 'SINCRONIZADO',
      createdAt: new Date(),
      updatedAt: null,
    };

    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(ACTIVE_INTEGRACION);
    catalogRepoMock.findProductForSync.mockResolvedValue(OMS_AGGREGATE);
    mappingRepoMock.findProductMapping.mockResolvedValue(existingMapping);
    mappingRepoMock.findVariantMappings.mockResolvedValue([existingVariantMapping]);
    writerMock.update.mockResolvedValue(WRITER_CREATE_RESULT);

    const result = await service.syncProduct(42, BASE_DTO, ADMIN_USER);

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('UPDATED');
    expect(writerMock.update).toHaveBeenCalledTimes(1);
    expect(writerMock.create).not.toHaveBeenCalled();
  });

  it('devuelve 409 si existe mapping de producto pero no hay variantes mapeadas para update', async () => {
    const existingMapping = {
      integracionProductoExternoId: 1,
      integracionSalienteId: 1,
      productoId: 42,
      externalProductId: 'gid://shopify/Product/1',
      estado: 'SINCRONIZADO',
      createdAt: new Date(),
      updatedAt: null,
    };

    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(ACTIVE_INTEGRACION);
    catalogRepoMock.findProductForSync.mockResolvedValue(OMS_AGGREGATE);
    mappingRepoMock.findProductMapping.mockResolvedValue(existingMapping);
    mappingRepoMock.findVariantMappings.mockResolvedValue([]);

    await expect(
      service.syncProduct(42, BASE_DTO, ADMIN_USER),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(writerMock.update).not.toHaveBeenCalled();
  });

  it('usuario de tienda puede sincronizar su propia empresa', async () => {
    integracionRepoMock.findActiveForEmpresa.mockResolvedValue(ACTIVE_INTEGRACION);
    catalogRepoMock.findProductForSync.mockResolvedValue(OMS_AGGREGATE);
    mappingRepoMock.findProductMapping.mockResolvedValue(null);
    writerMock.create.mockResolvedValue(WRITER_CREATE_RESULT);

    // STORE_USER tiene storeId='10', BASE_DTO tiene empresaId=10 → debe funcionar
    const result = await service.syncProduct(42, BASE_DTO, STORE_USER);
    expect(result.ok).toBe(true);
  });
});

// ============================================================
// ShopifyOmsCatalogRepository.resolvePrices (lógica pura)
// ============================================================

describe('ShopifyOmsCatalogRepository.resolvePrices', () => {
  const baseAggregate = {
    productoId: 1,
    empresaId: 10,
    title: 'Test',
    descriptionHtml: '',
    vendor: '',
    productType: '',
    variants: [
      { varianteId: 101, sku: 'A', ean: null, nombre: null, price: null, stockDisponible: 0 },
      { varianteId: 102, sku: 'B', ean: null, nombre: null, price: null, stockDisponible: 0 },
    ],
  };

  it('asigna precio según la primera prioridad que coincide', () => {
    const tarifas = [
      { VarianteId: 101, ComercialChannel: 'ONLINE', MonedaCodigo: 'COP', Precio: 50000 },
      { VarianteId: 101, ComercialChannel: 'GENERAL', MonedaCodigo: 'COP', Precio: 45000 },
      { VarianteId: 102, ComercialChannel: 'ONLINE', MonedaCodigo: 'COP', Precio: 60000 },
    ];
    const priority = [{ comercialChannel: 'ONLINE', monedaCodigo: 'COP' }];

    const result = ShopifyOmsCatalogRepository.resolvePrices(
      baseAggregate,
      tarifas,
      priority,
    );

    expect(result.variants[0].price).toBe('50000.00');
    expect(result.variants[1].price).toBe('60000.00');
  });

  it('deja precio null si ninguna tarifa coincide con la prioridad', () => {
    const tarifas = [
      { VarianteId: 101, ComercialChannel: 'MAYORISTA', MonedaCodigo: 'COP', Precio: 30000 },
    ];
    const priority = [{ comercialChannel: 'ONLINE', monedaCodigo: 'COP' }];

    const result = ShopifyOmsCatalogRepository.resolvePrices(
      baseAggregate,
      tarifas,
      priority,
    );

    expect(result.variants[0].price).toBeNull();
  });

  it('usa el segundo fallback cuando el primero no coincide', () => {
    const tarifas = [
      { VarianteId: 101, ComercialChannel: 'GENERAL', MonedaCodigo: 'COP', Precio: 45000 },
    ];
    const priority = [
      { comercialChannel: 'ONLINE', monedaCodigo: 'COP' },
      { comercialChannel: 'GENERAL', monedaCodigo: 'COP' },
    ];

    const result = ShopifyOmsCatalogRepository.resolvePrices(
      baseAggregate,
      tarifas,
      priority,
    );

    expect(result.variants[0].price).toBe('45000.00');
  });

  it('tolera VarianteId serializado como string en las tarifas devueltas por SQL', () => {
    const tarifas = [
      {
        VarianteId: '101',
        ComercialChannel: 'ONLINE',
        MonedaCodigo: 'COP',
        Precio: 50000,
      },
    ] as unknown as Array<{
      VarianteId: number;
      ComercialChannel: string;
      MonedaCodigo: string;
      Precio: number;
    }>;
    const priority = [{ comercialChannel: 'ONLINE', monedaCodigo: 'COP' }];

    const result = ShopifyOmsCatalogRepository.resolvePrices(
      baseAggregate,
      tarifas,
      priority,
    );

    expect(result.variants[0].price).toBe('50000.00');
  });
});
