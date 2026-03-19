import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZiCatalogRepository } from './zi-catalog.repository';
import { ZiCatalogService } from './zi-catalog.service';

describe('ZiCatalogService', () => {
  const repository = {
    listProductos: jest.fn(),
    getProductoDetalle: jest.fn(),
    getMarcas: jest.fn(),
    getCategorias: jest.fn(),
  } as unknown as ZiCatalogRepository;

  const config = {
    get: jest.fn().mockReturnValue('1'),
  } as unknown as ConfigService;

  let service: ZiCatalogService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ZiCatalogService(repository, config);
  });

  it('getProductoDetalle null -> NotFoundException', async () => {
    repository.getProductoDetalle = jest.fn().mockResolvedValue(null);

    await expect(service.getProductoDetalle(99999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listProductos delega con empresaId correcto', async () => {
    repository.listProductos = jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    await service.listProductos({ search: 'test' });

    expect(repository.listProductos).toHaveBeenCalledWith(1, { search: 'test' });
  });
});
