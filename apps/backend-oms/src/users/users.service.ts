import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { listProfileCatalog } from '../auth/profile-map';
import { SecurityPermissionsService } from '../security-permissions/security-permissions.service';
import { UsersRepository } from './users.repository';
import type { UserListItem, UsersActorContext } from './users.types';

type CreateUserParams = {
  empresaId: number;
  empresaClienteId?: number;
  perfilId: number;
  nombre: string;
  email: string;
  telefono?: string;
  temporaryPassword: string;
};

const SUPER_ADMIN_PROFILE_ID = 1;
const FRANCHISE_ASSIGNABLE_PROFILE_IDS = new Set<number>([3, 4]);

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly securityPermissionsService: SecurityPermissionsService,
  ) {}

  async listUsers(actor: UsersActorContext): Promise<UserListItem[]> {
    if (actor.isGlobalSuperAdmin) {
      return this.usersRepository.list();
    }

    if (actor.actorEmpresaClienteId === null) {
      throw new ForbiddenException('Contexto de franquicia invalido');
    }

    return this.usersRepository.listByEmpresaClienteId(
      actor.actorEmpresaClienteId,
    );
  }

  listProfiles(actor: UsersActorContext) {
    const catalog = listProfileCatalog();

    if (actor.isGlobalSuperAdmin) {
      return catalog;
    }

    return catalog.filter((profile) =>
      FRANCHISE_ASSIGNABLE_PROFILE_IDS.has(profile.perfilId),
    );
  }

  async createUser(
    params: CreateUserParams,
    actor: UsersActorContext,
  ): Promise<{ userId: string }> {
    const normalizedParams = await this.applyScopeForCreate(params, actor);

    const [empresaExists, perfilExists] = await Promise.all([
      this.usersRepository.existsEmpresaById(normalizedParams.empresaId),
      this.usersRepository.existsPerfilById(normalizedParams.perfilId),
    ]);

    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (!perfilExists) {
      throw new BadRequestException('PerfilId no existe en la base de datos');
    }

    if (normalizedParams.empresaClienteId !== undefined) {
      const empresaClienteValida =
        await this.usersRepository.existsEmpresaClienteByIdAndEmpresaId(
          normalizedParams.empresaClienteId,
          normalizedParams.empresaId,
        );
      if (!empresaClienteValida) {
        throw new BadRequestException(
          'EmpresaClienteId no existe o no pertenece a la empresa seleccionada',
        );
      }
    }

    const normalizedEmail = normalizedParams.email.trim().toLowerCase();
    const exists = await this.usersRepository.existsByEmail(normalizedEmail);

    if (exists) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(
      normalizedParams.temporaryPassword,
      this.saltRounds,
    );

    return this.usersRepository.create({
      empresaId: normalizedParams.empresaId,
      empresaClienteId: normalizedParams.empresaClienteId,
      perfilId: normalizedParams.perfilId,
      nombre: normalizedParams.nombre.trim(),
      email: normalizedEmail,
      telefono: normalizedParams.telefono?.trim() || undefined,
      passwordHash,
      estado: 1,
    });
  }

  async updateUserStatus(
    userId: string,
    estado: 0 | 1,
    actor: UsersActorContext,
  ): Promise<void> {
    await this.assertCanManageTargetUser(actor, userId);
    // Evita responder success cuando el target no existe (especialmente en flujo super admin).
    const updated = await this.usersRepository.updateStatus(userId, estado);
    if (!updated) {
      throw new NotFoundException('Usuario no existe');
    }
  }

  async resetPassword(
    userId: string,
    newTemporaryPassword: string,
    actor: UsersActorContext,
  ): Promise<void> {
    await this.assertCanManageTargetUser(actor, userId);
    const passwordHash = await bcrypt.hash(
      newTemporaryPassword,
      this.saltRounds,
    );
    // Evita responder success cuando el target no existe (especialmente en flujo super admin).
    const updated = await this.usersRepository.updatePasswordHash(
      userId,
      passwordHash,
    );
    if (!updated) {
      throw new NotFoundException('Usuario no existe');
    }
  }

  private async applyScopeForCreate(
    params: CreateUserParams,
    actor: UsersActorContext,
  ): Promise<CreateUserParams> {
    if (actor.isGlobalSuperAdmin) {
      if (params.perfilId === SUPER_ADMIN_PROFILE_ID) {
        if (params.empresaClienteId !== undefined) {
          throw new BadRequestException(
            'Un usuario super admin no puede tener EmpresaClienteId asignado',
          );
        }

        return params;
      }

      if (params.empresaClienteId === undefined) {
        throw new BadRequestException(
          'EmpresaClienteId es obligatorio para usuarios no-super-admin',
        );
      }

      return params;
    }

    if (actor.actorEmpresaClienteId === null || actor.actorEmpresaId === null) {
      throw new ForbiddenException('Contexto de franquicia invalido');
    }

    if (params.empresaId !== actor.actorEmpresaId) {
      throw new ForbiddenException(
        'No puedes crear usuarios en una empresa diferente a tu contexto',
      );
    }

    if (
      params.empresaClienteId !== undefined &&
      params.empresaClienteId !== actor.actorEmpresaClienteId
    ) {
      throw new ForbiddenException(
        'No puedes crear usuarios para otra franquicia',
      );
    }

    if (!FRANCHISE_ASSIGNABLE_PROFILE_IDS.has(params.perfilId)) {
      throw new ForbiddenException(
        'Solo puedes asignar perfiles delegables de tienda (3 y 4)',
      );
    }

    const profilePermissions =
      await this.securityPermissionsService.resolvePermissionsForProfile(
        params.perfilId,
      );
    if (profilePermissions.includes('security.manage')) {
      throw new ForbiddenException(
        'No puedes asignar perfiles con permisos de seguridad global',
      );
    }

    return {
      ...params,
      empresaClienteId: actor.actorEmpresaClienteId,
    };
  }

  private async assertCanManageTargetUser(
    actor: UsersActorContext,
    targetUserId: string,
  ): Promise<void> {
    if (actor.isGlobalSuperAdmin) {
      return;
    }

    if (actor.actorEmpresaClienteId === null) {
      throw new ForbiddenException('Contexto de franquicia invalido');
    }

    const target = await this.usersRepository.findScopeById(targetUserId);
    if (!target) {
      throw new NotFoundException('Usuario no existe');
    }

    if (target.empresaClienteId !== actor.actorEmpresaClienteId) {
      throw new ForbiddenException(
        'No puedes gestionar usuarios de otra franquicia',
      );
    }
  }
}
