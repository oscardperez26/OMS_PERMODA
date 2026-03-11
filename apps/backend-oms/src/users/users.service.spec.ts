import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';
import type { SecurityPermissionsService } from '../security-permissions/security-permissions.service';
import type { UsersActorContext } from './users.types';

describe('UsersService (scope security)', () => {
  const repository = {
    list: jest.fn(),
    listByEmpresaClienteId: jest.fn(),
    existsEmpresaById: jest.fn(),
    existsPerfilById: jest.fn(),
    existsEmpresaClienteByIdAndEmpresaId: jest.fn(),
    existsByEmail: jest.fn(),
    create: jest.fn(),
    findScopeById: jest.fn(),
    updateStatus: jest.fn(),
    updatePasswordHash: jest.fn(),
  } as unknown as UsersRepository;

  const securityPermissionsService = {
    resolvePermissionsForProfile: jest.fn(),
  } as unknown as SecurityPermissionsService;

  const superAdminActor: UsersActorContext = {
    actorUserId: '1',
    actorEmpresaId: 1,
    actorEmpresaClienteId: null,
    actorPermissions: ['users.manage', 'security.manage'],
    isGlobalSuperAdmin: true,
  };

  const franchiseActor: UsersActorContext = {
    actorUserId: '10',
    actorEmpresaId: 1,
    actorEmpresaClienteId: 7,
    actorPermissions: ['users.manage'],
    isGlobalSuperAdmin: false,
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(repository, securityPermissionsService);
  });

  it('lists all users for global super admin', async () => {
    repository.list = jest.fn().mockResolvedValue([{ id: '1' }]);
    const result = await service.listUsers(superAdminActor);
    expect(repository.list).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('lists scoped users for franquicia admin', async () => {
    repository.listByEmpresaClienteId = jest.fn().mockResolvedValue([{ id: '2' }]);
    const result = await service.listUsers(franchiseActor);
    expect(repository.listByEmpresaClienteId).toHaveBeenCalledWith(7);
    expect(result).toHaveLength(1);
  });

  it('only returns perfiles 3 y 4 for franquicia admin', () => {
    const profiles = service.listProfiles(franchiseActor);
    expect(profiles.map((item) => item.perfilId)).toEqual([3, 4]);
  });

  it('rejects create user in another franquicia for franquicia admin', async () => {
    await expect(
      service.createUser(
        {
          empresaId: 1,
          empresaClienteId: 8,
          perfilId: 3,
          nombre: 'Operador',
          email: 'operador@demo.com',
          temporaryPassword: 'password123',
        },
        franchiseActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects assigning non-delegable profile for franquicia admin', async () => {
    await expect(
      service.createUser(
        {
          empresaId: 1,
          empresaClienteId: 7,
          perfilId: 2,
          nombre: 'Operador',
          email: 'operador2@demo.com',
          temporaryPassword: 'password123',
        },
        franchiseActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires empresaClienteId for non-super-admin profile when actor is global', async () => {
    await expect(
      service.createUser(
        {
          empresaId: 1,
          perfilId: 3,
          nombre: 'Operador',
          email: 'operador3@demo.com',
          temporaryPassword: 'password123',
        },
        superAdminActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects status change for user from another franquicia', async () => {
    repository.findScopeById = jest.fn().mockResolvedValue({
      id: '55',
      empresaId: 1,
      empresaClienteId: 999,
      perfilId: 3,
    });

    await expect(
      service.updateUserStatus('55', 0, franchiseActor),
    ).rejects.toThrow(ForbiddenException);
  });
});
