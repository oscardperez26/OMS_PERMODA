import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../auth.decorators';
import type { Permission, SafeUser } from '../auth.types';

type RequestWithUser = Request & {
  user?: SafeUser;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
    if (!hasAllPermissions) {
      throw new ForbiddenException('Permisos insuficientes');
    }

    return true;
  }
}
