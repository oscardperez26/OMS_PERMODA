import { BrandingService } from './branding.service';
import type { BrandingRepository } from './branding.repository';

describe('BrandingService', () => {
  const repository = {
    findEmpresaClienteBrandingById: jest.fn(),
  } as unknown as BrandingRepository;

  let service: BrandingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BrandingService(repository);
  });

  it('returns KOAJ fallback when user has no empresaClienteId', async () => {
    const result = await service.getBrandingForUser({
      id: '1',
      username: 'admin@example.com',
      role: 'ADMIN',
      permissions: ['orders.read'],
    });

    expect(result).toEqual({
      displayName: 'KOAJ',
      logoUrl: null,
      faviconUrl: null,
      source: 'default',
      empresaClienteId: null,
    });
    expect(repository.findEmpresaClienteBrandingById).not.toHaveBeenCalled();
  });

  it('returns normalized empresa-cliente branding when available', async () => {
    repository.findEmpresaClienteBrandingById = jest.fn().mockResolvedValue({
      empresaClienteId: 7,
      nombre: ' Franquicia Norte ',
      displayName: '  Tienda Norte  ',
      logoUrl: ' https://cdn.example.com/logo.png ',
      faviconUrl: ' https://cdn.example.com/favicon.ico ',
    });

    const result = await service.getBrandingForUser({
      id: '2',
      username: 'franquicia@example.com',
      role: 'STORE_ADMIN',
      permissions: ['orders.read'],
      empresaClienteId: '7',
    });

    expect(result).toEqual({
      displayName: 'Tienda Norte',
      logoUrl: 'https://cdn.example.com/logo.png',
      faviconUrl: 'https://cdn.example.com/favicon.ico',
      source: 'empresa-cliente',
      empresaClienteId: 7,
    });
  });
});
