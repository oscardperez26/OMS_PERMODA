import { BadRequestException, Injectable } from '@nestjs/common';
import { listProfileCatalog, resolveProfileAccess } from '../auth/profile-map';
import {
  isPermission,
  type Permission,
} from '../auth/auth.types';
import { SecurityPermissionsRepository } from './security-permissions.repository';
import type {
  SecurityPermissionCatalogItem,
  SecurityPermissionsBootstrap,
  SecurityProfileItem,
  SecurityProfilePermissionItem,
} from './security-permissions.types';

const SUPER_ADMIN_PROFILE_ID = 1;
const SECURITY_MANAGE_PERMISSION: Permission = 'security.manage';

@Injectable()
export class SecurityPermissionsService {
  constructor(
    private readonly securityPermissionsRepository: SecurityPermissionsRepository,
  ) {}

  async getBootstrap(): Promise<SecurityPermissionsBootstrap> {
    // Ejecutar en secuencia reduce abortos cuando el pool SQL se reinicia por ECONNRESET.
    const profileRows = await this.securityPermissionsRepository.listProfiles();
    const permissionRows =
      await this.securityPermissionsRepository.listPermissionCatalog();
    const assignmentRows =
      await this.securityPermissionsRepository.listProfilePermissionCodes();

    const profileCatalogMap = new Map(
      listProfileCatalog().map((item) => [item.perfilId, item]),
    );

    const profileItems: SecurityProfileItem[] = profileRows.map((profile) => {
      const mapped = profileCatalogMap.get(profile.PerfilId);
      return {
        perfilId: profile.PerfilId,
        nombre: profile.Nombre,
        descripcion: profile.Descripcion,
        portal: mapped?.portal ?? null,
        role: mapped?.role ?? null,
      };
    });

    const permissionItems: SecurityPermissionCatalogItem[] = [];
    permissionRows.forEach((row) => {
      const codigo = row.Codigo.trim().toLowerCase();
      if (!isPermission(codigo)) {
        return;
      }

      permissionItems.push({
        permisoId: row.PermisoId,
        codigo,
        nombre: row.Nombre,
        modulo: row.Modulo,
        accion: row.Accion,
        activo: row.Activo,
      });
    });

    const dbAssignmentsMap = new Map<number, Permission[]>();
    assignmentRows.forEach((row) => {
      if (!isPermission(row.Codigo)) {
        return;
      }

      const current = dbAssignmentsMap.get(row.PerfilId) ?? [];
      current.push(row.Codigo);
      dbAssignmentsMap.set(row.PerfilId, current);
    });

    const assignmentItems: SecurityProfilePermissionItem[] = profileItems.map(
      (profile) => {
        const fromDb = this.uniquePermissions(
          dbAssignmentsMap.get(profile.perfilId) ?? [],
        );
        const effectivePermissions =
          fromDb.length > 0
            ? fromDb
            : this.uniquePermissions(
                resolveProfileAccess(profile.perfilId)?.permissions ?? [],
              );

        return {
          perfilId: profile.perfilId,
          permissions: effectivePermissions,
        };
      },
    );

    return {
      profiles: profileItems,
      permissions: permissionItems,
      assignments: assignmentItems,
    };
  }

  async updateProfilePermissions(
    perfilId: number,
    rawPermissions: Permission[],
  ): Promise<void> {
    const exists =
      await this.securityPermissionsRepository.existsProfileById(perfilId);
    if (!exists) {
      throw new BadRequestException('PerfilId no existe en la base de datos');
    }

    const normalizedPermissions = this.normalizePermissions(rawPermissions);
    if (
      perfilId === SUPER_ADMIN_PROFILE_ID &&
      !normalizedPermissions.includes(SECURITY_MANAGE_PERMISSION)
    ) {
      throw new BadRequestException(
        'No puedes remover security.manage del perfil Super Admin',
      );
    }

    const resolvedPermissions =
      await this.securityPermissionsRepository.findPermissionIdsByCodes(
        normalizedPermissions,
      );

    const foundCodes = new Set(resolvedPermissions.map((item) => item.codigo));
    const missingCodes = normalizedPermissions.filter(
      (permission) => !foundCodes.has(permission),
    );
    if (missingCodes.length > 0) {
      throw new BadRequestException(
        `Permisos no encontrados en catalogo: ${missingCodes.join(', ')}`,
      );
    }

    await this.securityPermissionsRepository.replaceProfilePermissions(
      perfilId,
      resolvedPermissions.map((item) => item.permisoId),
    );
  }

  async resolvePermissionsForProfile(perfilId: number): Promise<Permission[]> {
    const permissionCodes =
      await this.securityPermissionsRepository.listPermissionCodesByProfileId(
        perfilId,
      );
    const fromDatabase = this.uniquePermissions(
      permissionCodes.filter((code): code is Permission => isPermission(code)),
    );

    if (fromDatabase.length > 0) {
      return fromDatabase;
    }

    const fallback = resolveProfileAccess(perfilId)?.permissions ?? [];
    return this.uniquePermissions(fallback);
  }

  private normalizePermissions(rawPermissions: Permission[]): Permission[] {
    const normalizedRaw = rawPermissions.map((permission) =>
      permission.trim().toLowerCase(),
    );
    const invalidPermissions = normalizedRaw.filter(
      (permission) => !isPermission(permission),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Permisos invalidos: ${[...new Set(invalidPermissions)].join(', ')}`,
      );
    }

    const normalized = normalizedRaw.filter(
      (permission): permission is Permission => isPermission(permission),
    );
    return this.uniquePermissions(normalized);
  }

  private uniquePermissions(values: Permission[]): Permission[] {
    return [...new Set(values)];
  }
}
