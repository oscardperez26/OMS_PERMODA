import { BadRequestException } from '@nestjs/common';
import { SecurityPermissionsService } from './security-permissions.service';
import type { SecurityPermissionsRepository } from './security-permissions.repository';

describe('SecurityPermissionsService', () => {
  const repository = {
    listProfiles: jest.fn(),
    listPermissionCatalog: jest.fn(),
    listProfilePermissionCodes: jest.fn(),
    existsProfileById: jest.fn(),
    findPermissionIdsByCodes: jest.fn(),
    replaceProfilePermissions: jest.fn(),
    listPermissionCodesByProfileId: jest.fn(),
  } as unknown as SecurityPermissionsRepository;

  let service: SecurityPermissionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecurityPermissionsService(repository);
  });

  it('returns bootstrap assignments using DB values and fallback when profile has no rows', async () => {
    repository.listProfiles = jest.fn().mockResolvedValue([
      { PerfilId: 1, Nombre: 'Panel Admin', Descripcion: null },
      { PerfilId: 2, Nombre: 'Panel Lectura', Descripcion: null },
    ]);
    repository.listPermissionCatalog = jest.fn().mockResolvedValue([
      {
        PermisoId: 1,
        Codigo: 'orders.read',
        Nombre: 'Consultar pedidos',
        Modulo: 'orders',
        Accion: 'read',
        Activo: true,
      },
      {
        PermisoId: 2,
        Codigo: 'security.manage',
        Nombre: 'Gestionar seguridad',
        Modulo: 'security',
        Accion: 'manage',
        Activo: true,
      },
    ]);
    repository.listProfilePermissionCodes = jest
      .fn()
      .mockResolvedValue([{ PerfilId: 1, Codigo: 'orders.read' }]);

    const result = await service.getBootstrap();

    expect(result.assignments).toEqual([
      { perfilId: 1, permissions: ['orders.read'] },
      {
        perfilId: 2,
        permissions: ['orders.read', 'catalog.read', 'config.read'],
      },
    ]);
  });

  it('rejects removing security.manage from super admin profile', async () => {
    repository.existsProfileById = jest.fn().mockResolvedValue(true);

    await expect(
      service.updateProfilePermissions(1, ['orders.read']),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects permissions missing in catalog table', async () => {
    repository.existsProfileById = jest.fn().mockResolvedValue(true);
    repository.findPermissionIdsByCodes = jest.fn().mockResolvedValue([]);

    await expect(
      service.updateProfilePermissions(2, ['orders.read']),
    ).rejects.toThrow('Permisos no encontrados en catalogo');
  });

  it('returns DB permissions when profile has explicit assignments', async () => {
    repository.listPermissionCodesByProfileId = jest
      .fn()
      .mockResolvedValue(['config.read', 'orders.read']);

    const result = await service.resolvePermissionsForProfile(2);
    expect(result).toEqual(['config.read', 'orders.read']);
  });

  it('returns fallback permissions when profile has no DB assignments', async () => {
    repository.listPermissionCodesByProfileId = jest.fn().mockResolvedValue([]);

    const result = await service.resolvePermissionsForProfile(3);
    expect(result).toEqual(['orders.read', 'orders.manage']);
  });
});
