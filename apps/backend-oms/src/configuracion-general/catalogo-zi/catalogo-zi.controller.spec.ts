import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ZiTokenManagerService } from './auth/zi-token-manager.service';
import { CatalogoZiController } from './catalogo-zi.controller';
import { CatalogoZiService } from './catalogo-zi.service';
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
});
