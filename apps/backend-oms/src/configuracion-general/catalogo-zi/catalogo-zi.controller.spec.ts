import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ZiTokenManagerService } from './auth/zi-token-manager.service';
import { ZiCatalogService } from './catalog/zi-catalog.service';
import { CatalogoZiController } from './catalogo-zi.controller';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiOpsService } from './ops/zi-ops.service';
import { ZiSyncSchedulerService } from './scheduler/zi-sync.scheduler';
import { ZiPersistService } from './zi-persist.service';

describe('CatalogoZiController', () => {
  const catalogoZiService = {
    getChange: jest.fn(),
    getProducts: jest.fn(),
    getPrices: jest.fn(),
    getStock: jest.fn(),
    getCategory: jest.fn(),
  } as unknown as CatalogoZiService;

  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const tokenManager = {
    forceRefresh: jest.fn(),
  } as unknown as ZiTokenManagerService;

  const persistService = {
    persistProducto: jest.fn(),
    persistPrecios: jest.fn(),
    persistStock: jest.fn(),
    persistCategorias: jest.fn(),
  } as unknown as ZiPersistService;

  const scheduler = {
    runFullSync: jest.fn(),
  } as unknown as ZiSyncSchedulerService;

  const opsService = {
    getStatus: jest.fn(),
  } as unknown as ZiOpsService;

  const catalogService = {
    listProductos: jest.fn(),
    getProductoDetalle: jest.fn(),
    getMarcas: jest.fn(),
    getCategorias: jest.fn(),
  } as unknown as ZiCatalogService;

  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogoZiController],
      providers: [
        { provide: CatalogoZiService, useValue: catalogoZiService },
        { provide: ConfigService, useValue: configService },
        { provide: ZiTokenManagerService, useValue: tokenManager },
        { provide: ZiPersistService, useValue: persistService },
        { provide: ZiSyncSchedulerService, useValue: scheduler },
        { provide: ZiOpsService, useValue: opsService },
        { provide: ZiCatalogService, useValue: catalogService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /change llama service.getChange() y retorna resultado', async () => {
    catalogoZiService.getChange = jest
      .fn()
      .mockResolvedValue([{ id: 1, hash_Product: 'a', hash_Price: 'b', hash_Stock: 'c' }]);

    const response = await request(app.getHttpServer()).get(
      '/configuracion-general/catalogo-zi/change',
    );

    expect(response.status).toBe(200);
    expect(catalogoZiService.getChange).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual([
      { id: 1, hash_Product: 'a', hash_Price: 'b', hash_Stock: 'c' },
    ]);
  });

  it('POST /products con DTO valido llama service.getProducts()', async () => {
    catalogoZiService.getProducts = jest
      .fn()
      .mockResolvedValue([{ id: 4, referencia: '4' }]);

    const response = await request(app.getHttpServer())
      .post('/configuracion-general/catalogo-zi/products')
      .send({ product: '4' });

    expect(response.status).toBe(201);
    expect(catalogoZiService.getProducts).toHaveBeenCalledWith('4');
  });

  it('POST /products sin product responde 400 BadRequest', async () => {
    const response = await request(app.getHttpServer())
      .post('/configuracion-general/catalogo-zi/products')
      .send({});

    expect(response.status).toBe(400);
    expect(catalogoZiService.getProducts).not.toHaveBeenCalled();
  });

  it('POST /stock usa endpoint interno /stock (no /stockb)', async () => {
    catalogoZiService.getStock = jest.fn().mockResolvedValue([{ id: 3 }]);

    const response = await request(app.getHttpServer())
      .post('/configuracion-general/catalogo-zi/stock')
      .send({ product: '3' });

    expect(response.status).toBe(201);
    expect(catalogoZiService.getStock).toHaveBeenCalledWith('3');
  });

  it('POST /auth/refresh con ZI_ALLOW_MANUAL_REFRESH=false retorna 403', async () => {
    configService.get = jest.fn().mockReturnValue('false');

    const response = await request(app.getHttpServer()).post(
      '/configuracion-general/catalogo-zi/auth/refresh',
    );

    expect(response.status).toBe(403);
    expect(tokenManager.forceRefresh).not.toHaveBeenCalled();
  });

  it('POST /sync/full llama scheduler.runFullSync()', async () => {
    scheduler.runFullSync = jest.fn().mockResolvedValue({ total: 1 });

    const response = await request(app.getHttpServer()).post(
      '/configuracion-general/catalogo-zi/sync/full',
    );

    expect(response.status).toBe(201);
    expect(scheduler.runFullSync).toHaveBeenCalledTimes(1);
  });

  it('POST /sync/categorias llama persistService.persistCategorias(1,809)', async () => {
    persistService.persistCategorias = jest
      .fn()
      .mockResolvedValue({ categoriasUpserted: 10 });

    const response = await request(app.getHttpServer()).post(
      '/configuracion-general/catalogo-zi/sync/categorias',
    );

    expect(response.status).toBe(201);
    expect(persistService.persistCategorias).toHaveBeenCalledWith(1, 809);
  });

  it('GET /catalog responde 200 con ZiCatalogListResult', async () => {
    catalogService.listProductos = jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    const response = await request(app.getHttpServer()).get(
      '/configuracion-general/catalogo-zi/catalog?page=1&pageSize=50',
    );

    expect(response.status).toBe(200);
    expect(catalogService.listProductos).toHaveBeenCalledTimes(1);
  });

  it('GET /catalog/filters/marcas responde 200 con string[]', async () => {
    catalogService.getMarcas = jest.fn().mockResolvedValue(['KOAJ']);

    const response = await request(app.getHttpServer()).get(
      '/configuracion-general/catalogo-zi/catalog/filters/marcas',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(['KOAJ']);
  });

  it('GET /catalog/filters/categorias responde 200 con array', async () => {
    catalogService.getCategorias = jest.fn().mockResolvedValue([
      { categoriaId: 1, nombre: 'Mujer', total: 100 },
    ]);

    const response = await request(app.getHttpServer()).get(
      '/configuracion-general/catalogo-zi/catalog/filters/categorias',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ categoriaId: 1, nombre: 'Mujer', total: 100 }]);
  });

  it('GET /catalog/:id valido responde 200 con detalle', async () => {
    catalogService.getProductoDetalle = jest.fn().mockResolvedValue({
      productoId: 13,
      skuBase: '105243',
      nombre: 'Falda',
      marca: 'KOAJ',
      activo: true,
      descripcion: null,
      descripcionCorta: null,
      metaTitulo: null,
      metaDescripcion: null,
      url: null,
      categoriaNombre: 'Mujer',
      instruccionesCuidado: null,
      ziSyncedAt: null,
      variantes: [],
      tarifas: [],
    });

    const response = await request(app.getHttpServer()).get(
      '/configuracion-general/catalogo-zi/catalog/13',
    );

    expect(response.status).toBe(200);
    expect(response.body.productoId).toBe(13);
  });

  it('GET /catalog/:id inexistente responde 404', async () => {
    catalogService.getProductoDetalle = jest
      .fn()
      .mockRejectedValue(new NotFoundException('Producto 99999 no encontrado'));

    const response = await request(app.getHttpServer()).get(
      '/configuracion-general/catalogo-zi/catalog/99999',
    );

    expect(response.status).toBe(404);
  });

  it('GET /ops/status responde 200 con estado operativo', async () => {
    opsService.getStatus = jest.fn().mockResolvedValue({
      status: 'WARN',
      message: 'Zona de Integracion operando con alertas.',
      jobs: {
        zi: {
          enabled: true,
          cron: {
            stock: '*/20 * * * *',
            precios: '0 */2 * * *',
            productos: '0 */6 * * *',
            categorias: '0 0 * * *',
          },
          config: { empresaId: 1, batchSize: 100 },
        },
        inbound: {
          enabled: true,
          cron: '*/5 * * * *',
          initialDelayMs: 15000,
          limit: 200,
          maxConnectors: 10,
        },
        ordersLegacy: {
          enabled: true,
          intervalMs: 300000,
          initialDelayMs: 15000,
          limit: 200,
        },
      },
      alerts: [
        {
          level: 'WARN',
          code: 'DUPLICATE_ORDERS_SYNC_JOBS',
          message: 'Duplicidad de jobs',
        },
      ],
      healthSummary: {
        lastRunAt: null,
        lastStatus: 'UNKNOWN',
        lastError: null,
        runs24h: { total: 0, ok: 0, error: 0 },
      },
      ziLastRuns: [],
    });

    const response = await request(app.getHttpServer()).get(
      '/configuracion-general/catalogo-zi/ops/status',
    );

    expect(response.status).toBe(200);
    expect(opsService.getStatus).toHaveBeenCalledTimes(1);
    expect(response.body.status).toBe('WARN');
  });
});
