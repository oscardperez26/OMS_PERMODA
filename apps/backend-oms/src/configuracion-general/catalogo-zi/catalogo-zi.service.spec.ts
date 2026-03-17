import type { ZiApiClientService } from './client/zi-api-client.service';
import { CatalogoZiService } from './catalogo-zi.service';

describe('CatalogoZiService', () => {
  const ziClient = {
    request: jest.fn(),
  } as unknown as ZiApiClientService;

  let service: CatalogoZiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CatalogoZiService(ziClient);
  });

  it('getChange usa GET /Change', async () => {
    ziClient.request = jest.fn().mockResolvedValue([]);
    await service.getChange();
    expect(ziClient.request).toHaveBeenCalledWith('GET', '/Change');
  });

  it('getProducts usa POST /Products', async () => {
    ziClient.request = jest.fn().mockResolvedValue([]);
    await service.getProducts('4');
    expect(ziClient.request).toHaveBeenCalledWith('POST', '/Products', {
      product: '4',
    });
  });

  it('getPrices usa POST /Prices', async () => {
    ziClient.request = jest.fn().mockResolvedValue([]);
    await service.getPrices('23031');
    expect(ziClient.request).toHaveBeenCalledWith('POST', '/Prices', {
      product: '23031',
    });
  });

  it('getStock usa POST /Stock (no /StockB)', async () => {
    ziClient.request = jest.fn().mockResolvedValue([]);
    await service.getStock('3');
    expect(ziClient.request).toHaveBeenCalledWith('POST', '/Stock', {
      product: '3',
    });
  });

  it('getCategory usa GET /Categories/:id', async () => {
    ziClient.request = jest.fn().mockResolvedValue({});
    await service.getCategory('1');
    expect(ziClient.request).toHaveBeenCalledWith('GET', '/Categories/1');
  });

  it('getCategory normaliza array de ZI a objeto', async () => {
    ziClient.request = jest.fn().mockResolvedValue([
      {
        id: 1,
        isActive: true,
        ts: '2025-04-02T20:45:00',
        name: 'NO_APLICA',
        dependOnId: 0,
        level: 'Level1',
        success: true,
        statusCode: 200,
      },
    ]);

    const category = await service.getCategory('1');
    expect(category.id).toBe(1);
    expect(category.name).toBe('NO_APLICA');
  });
});
