import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiSyncRepository } from './repository/zi-sync.repository';
import { ZiPersistService } from './zi-persist.service';

function buildCatalogoZiMock(): jest.Mocked<CatalogoZiService> {
  return {
    getChange: jest.fn(),
    getProducts: jest.fn(),
    getPrices: jest.fn(),
    getStock: jest.fn(),
    getCategory: jest.fn(),
  } as unknown as jest.Mocked<CatalogoZiService>;
}

function buildRepositoryMock(): jest.Mocked<ZiSyncRepository> {
  return {
    getTiendaMapping: jest.fn(),
    upsertCategoria: jest.fn(),
    resolverCategoriaId: jest.fn(),
    upsertProducto: jest.fn(),
    upsertProductoTexto: jest.fn(),
    upsertVariante: jest.fn(),
    upsertTarifa: jest.fn(),
    upsertTarifaDetalle: jest.fn(),
    upsertOferta: jest.fn(),
    upsertOfertaDetalle: jest.fn(),
    upsertInventario: jest.fn(),
    resolverVarianteIdPorTallaColor: jest.fn(),
    getLastHashes: jest.fn(),
    saveLog: jest.fn(),
  } as unknown as jest.Mocked<ZiSyncRepository>;
}

function buildConfigMock(): ConfigService {
  return {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        ZI_EMPRESA_ID: '1',
        ZI_SYNC_BATCH_SIZE: '100',
      };
      return values[key];
    }),
  } as unknown as ConfigService;
}

describe('ZiPersistService', () => {
  let catalogoZiService: jest.Mocked<CatalogoZiService>;
  let repository: jest.Mocked<ZiSyncRepository>;
  let service: ZiPersistService;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    catalogoZiService = buildCatalogoZiMock();
    repository = buildRepositoryMock();
    service = new ZiPersistService(catalogoZiService, repository, buildConfigMock());
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('persistProducto -> llama upsertProducto + upsertVariante', async () => {
    catalogoZiService.getProducts.mockResolvedValue([
      {
        id: 4,
        nombre: { es: 'Camiseta' },
        referencia: '105243691003',
        activo: true,
        descripcion: { es: 'Descripcion' },
        descripcion_corta: { es: 'Corta' },
        meta_titulo: { es: 'Meta' },
        'meta_descripciÃ³n': { es: 'Meta desc' },
        'meta_descripción': { es: 'Meta desc' },
        url: { es: '/camiseta' },
        marca: 'KOAJ',
        catgoria_defecto: '31',
        categorias: ['31'],
        instruccionesCuidado: null,
        instruccionesLavado: null,
        composicion: null,
        ruc: 'RUC',
        combinaciones: [
          { id: '4-2-134', ean13: '7701', atributos: [] },
          { id: '4-3-134', ean13: '7702', atributos: [] },
        ],
        propiedades: [],
      },
    ]);
    repository.resolverCategoriaId.mockResolvedValue(9);
    repository.upsertProducto.mockResolvedValue({
      productoId: 300,
      created: true,
    });
    repository.upsertVariante.mockResolvedValue({
      varianteId: 900,
      created: true,
    });

    await service.persistProducto(4);

    expect(repository.upsertProducto).toHaveBeenCalledTimes(1);
    expect(repository.upsertVariante).toHaveBeenCalledTimes(2);
  });

  it("persistProducto -> upsertProductoTexto con 'es'", async () => {
    catalogoZiService.getProducts.mockResolvedValue([
      {
        id: 4,
        nombre: { es: 'Camiseta' },
        referencia: '105243691003',
        activo: true,
        descripcion: { es: 'Descripcion' },
        descripcion_corta: { es: 'Corta' },
        meta_titulo: { es: 'Meta' },
        'meta_descripciÃ³n': { es: 'Meta desc' },
        'meta_descripción': { es: 'Meta desc' },
        url: { es: '/camiseta' },
        marca: 'KOAJ',
        catgoria_defecto: '31',
        categorias: ['31'],
        instruccionesCuidado: null,
        instruccionesLavado: null,
        composicion: null,
        ruc: 'RUC',
        combinaciones: [{ id: '4-2-134', ean13: '7701', atributos: [] }],
        propiedades: [],
      },
    ]);
    repository.resolverCategoriaId.mockResolvedValue(9);
    repository.upsertProducto.mockResolvedValue({
      productoId: 300,
      created: true,
    });
    repository.upsertVariante.mockResolvedValue({
      varianteId: 900,
      created: true,
    });

    await service.persistProducto(4);

    expect(repository.upsertProductoTexto).toHaveBeenCalledWith(
      expect.objectContaining({ idioma: 'es' }),
    );
  });

  it('persistStock -> id_tienda sin mapeo -> salta con warning', async () => {
    catalogoZiService.getStock.mockResolvedValue([
      {
        id: 4,
        hash_stock: 'HS',
        stock: [
          {
            id_tienda: '999',
            tallas: [[{ id_talla: '2', id_Color: '134', unidades: '5' }]],
          },
        ],
      },
    ]);
    repository.getTiendaMapping.mockResolvedValue({});

    const result = await service.persistStock(4);

    expect(result.stocksUpserted).toBe(0);
    expect(repository.upsertInventario).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('id_tienda 999 sin mapeo'));
  });

  it('persistStock -> id_tienda con mapeo -> upsertInventario', async () => {
    catalogoZiService.getStock.mockResolvedValue([
      {
        id: 4,
        hash_stock: 'HS',
        stock: [
          {
            id_tienda: '828',
            tallas: [[{ id_talla: '2', id_Color: '134', unidades: '5' }]],
          },
        ],
      },
    ]);
    repository.getTiendaMapping.mockResolvedValue({ '828': 1 });
    repository.resolverVarianteIdPorTallaColor.mockResolvedValue(1001);

    await service.persistStock(4);

    expect(repository.upsertInventario).toHaveBeenCalledTimes(1);
    expect(repository.upsertInventario).toHaveBeenCalledWith(
      expect.objectContaining({ bodegaId: 1, stockTotal: 5 }),
    );
  });

  it('persistStock -> tallas.flat() aplana array de arrays', async () => {
    catalogoZiService.getStock.mockResolvedValue([
      {
        id: 4,
        hash_stock: 'HS',
        stock: [
          {
            id_tienda: '828',
            tallas: [
              [{ id_talla: '2', id_Color: '134', unidades: '5' }],
              [{ id_talla: '3', id_Color: '134', unidades: '7' }],
            ],
          },
        ],
      },
    ]);
    repository.getTiendaMapping.mockResolvedValue({ '828': 1 });
    repository.resolverVarianteIdPorTallaColor
      .mockResolvedValueOnce(1001)
      .mockResolvedValueOnce(1002);

    await service.persistStock(4);

    expect(repository.upsertInventario).toHaveBeenCalledTimes(2);
  });

  it('persistStock -> id_Color (C mayuscula) normalizado', async () => {
    catalogoZiService.getStock.mockResolvedValue([
      {
        id: 4,
        hash_stock: 'HS',
        stock: [
          {
            id_tienda: '828',
            tallas: [[{ id_talla: '2', id_Color: '134', unidades: '5' }]],
          },
        ],
      },
    ]);
    repository.getTiendaMapping.mockResolvedValue({ '828': 1 });
    repository.resolverVarianteIdPorTallaColor.mockResolvedValue(1001);

    await service.persistStock(4);

    expect(repository.resolverVarianteIdPorTallaColor).toHaveBeenCalledWith(
      1,
      4,
      '2',
      '134',
    );
  });

  it('persistPrecios -> precio "229900.00" -> parseFloat', async () => {
    catalogoZiService.getPrices.mockResolvedValue([
      {
        id: 4,
        hash_price: 'HP',
        tarifas: [
          {
            comercialChannel: 'WEB',
            id_tarifa: 'T1',
            moneda: 'COP',
            impuesto: '19.00',
            precio_base: '229900.00',
            precio_tallas: [
              { id_talla: '2', id_color: '134', precio: '229900.00' },
            ],
            ofertas: [],
          },
        ],
      },
    ]);
    repository.upsertTarifa.mockResolvedValue({ tarifaId: 500 });
    repository.resolverVarianteIdPorTallaColor.mockResolvedValue(1001);

    await service.persistPrecios(4);

    expect(repository.upsertTarifaDetalle).toHaveBeenCalledWith(
      expect.objectContaining({ precio: 229900 }),
    );
  });

  it('persistPrecios -> fecha "2026/03/13" -> Date valido', async () => {
    catalogoZiService.getPrices.mockResolvedValue([
      {
        id: 4,
        hash_price: 'HP',
        tarifas: [
          {
            comercialChannel: 'WEB',
            id_tarifa: 'T1',
            moneda: 'COP',
            impuesto: '19.00',
            precio_base: '229900.00',
            precio_tallas: [],
            ofertas: [
              {
                id_oferta: 'OF1',
                fecha_inicio: '2026/03/13',
                fecha_fin: '2026/03/15',
                precio_base: '199900.00',
                precio_tallas: [],
              },
            ],
          },
        ],
      },
    ]);
    repository.upsertTarifa.mockResolvedValue({ tarifaId: 500 });
    repository.upsertOferta.mockResolvedValue({ ofertaId: 600 });

    await service.persistPrecios(4);

    const ofertaInput = repository.upsertOferta.mock.calls[0][0];
    expect(Number.isNaN(ofertaInput.fechaInicio.getTime())).toBe(false);
    expect(Number.isNaN(ofertaInput.fechaFin.getTime())).toBe(false);
  });

  it('persistDeltaSync -> hash igual -> NO llama get endpoint', async () => {
    catalogoZiService.getChange.mockResolvedValue([
      {
        id: 4,
        hash_Product: 'HP1',
        hash_Price: 'PR1',
        hash_Stock: 'ST1',
      },
    ]);
    repository.getLastHashes.mockResolvedValue({
      hashProduct: 'HP1',
      hashPrice: 'PR1',
      hashStock: 'ST1',
    });
    const productoSpy = jest.spyOn(service, 'persistProducto');
    const preciosSpy = jest.spyOn(service, 'persistPrecios');
    const stockSpy = jest.spyOn(service, 'persistStock');

    await service.persistDeltaSync();

    expect(productoSpy).not.toHaveBeenCalled();
    expect(preciosSpy).not.toHaveBeenCalled();
    expect(stockSpy).not.toHaveBeenCalled();
  });

  it('persistDeltaSync -> hash distinto -> SI llama get endpoint', async () => {
    catalogoZiService.getChange.mockResolvedValue([
      {
        id: 4,
        hash_Product: 'HP2',
        hash_Price: 'PR2',
        hash_Stock: 'ST2',
      },
    ]);
    repository.getLastHashes.mockResolvedValue({
      hashProduct: 'HP1',
      hashPrice: 'PR1',
      hashStock: 'ST1',
    });
    jest.spyOn(service, 'persistProducto').mockResolvedValue({
      productoId: 300,
      variantesUpserted: 1,
    });
    jest.spyOn(service, 'persistPrecios').mockResolvedValue({
      tarifasUpserted: 1,
    });
    jest.spyOn(service, 'persistStock').mockResolvedValue({
      stocksUpserted: 1,
    });

    await service.persistDeltaSync();

    expect(service.persistProducto).toHaveBeenCalledWith(4);
    expect(service.persistPrecios).toHaveBeenCalledWith(4);
    expect(service.persistStock).toHaveBeenCalledWith(4);
  });

  it('persistDeltaSync -> error en producto -> continua resto', async () => {
    catalogoZiService.getChange.mockResolvedValue([
      {
        id: 4,
        hash_Product: 'HP2',
        hash_Price: 'PR1',
        hash_Stock: 'ST1',
      },
      {
        id: 5,
        hash_Product: 'HP3',
        hash_Price: 'PR1',
        hash_Stock: 'ST1',
      },
    ]);
    repository.getLastHashes.mockResolvedValue({
      hashProduct: 'HP1',
      hashPrice: 'PR1',
      hashStock: 'ST1',
    });
    jest
      .spyOn(service, 'persistProducto')
      .mockRejectedValueOnce(new Error('fallo producto 4'))
      .mockResolvedValueOnce({ productoId: 301, variantesUpserted: 1 });
    jest.spyOn(service, 'persistPrecios').mockResolvedValue({ tarifasUpserted: 0 });
    jest.spyOn(service, 'persistStock').mockResolvedValue({ stocksUpserted: 0 });

    const result = await service.persistDeltaSync();

    expect(service.persistProducto).toHaveBeenCalledTimes(2);
    expect(result.errores).toBe(1);
    expect(result.total).toBe(2);
  });

  it('persistDeltaSync -> guarda log en ZiSyncLog', async () => {
    catalogoZiService.getChange.mockResolvedValue([
      {
        id: 4,
        hash_Product: 'HP2',
        hash_Price: 'PR1',
        hash_Stock: 'ST1',
      },
    ]);
    repository.getLastHashes.mockResolvedValue({
      hashProduct: 'HP1',
      hashPrice: 'PR1',
      hashStock: 'ST1',
    });
    jest.spyOn(service, 'persistProducto').mockResolvedValue({
      productoId: 300,
      variantesUpserted: 1,
    });
    jest.spyOn(service, 'persistPrecios').mockResolvedValue({ tarifasUpserted: 0 });
    jest.spyOn(service, 'persistStock').mockResolvedValue({ stocksUpserted: 0 });

    await service.persistDeltaSync();

    expect(repository.saveLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'producto',
        productoZiId: 4,
        status: 'ok',
      }),
    );
  });
});
