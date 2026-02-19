import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../auth.decorators';
import type { Role, SafeUser } from '../auth.types';

type RequestWithUser = Request & {
  user?: SafeUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (expectedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const hasRole = expectedRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Rol sin permisos para este endpoint');
    }

    return true;
  }
}
