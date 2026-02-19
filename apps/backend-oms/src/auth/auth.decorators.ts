import { SetMetadata } from '@nestjs/common';
import type { Permission, Role } from './auth.types';

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const IS_PUBLIC_KEY = 'isPublic';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
