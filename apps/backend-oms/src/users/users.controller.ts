import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../auth/auth.decorators';
import type { SafeUser } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';
import type { UsersActorContext } from './users.types';

type RequestWithUser = Request & {
  user?: SafeUser;
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.manage')
  async list(@Req() req: RequestWithUser) {
    const users = await this.usersService.listUsers(
      this.buildActorContext(req.user),
    );
    return { users };
  }

  @Get('profiles')
  @Permissions('users.manage')
  listProfiles(@Req() req: RequestWithUser) {
    const profiles = this.usersService.listProfiles(
      this.buildActorContext(req.user),
    );
    return { profiles };
  }

  @Post()
  @Permissions('users.manage')
  async create(@Body() body: CreateUserDto, @Req() req: RequestWithUser) {
    const result = await this.usersService.createUser(
      body,
      this.buildActorContext(req.user),
    );
    return {
      success: true,
      userId: result.userId,
    };
  }

  @Patch(':id/status')
  @Permissions('users.manage')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: true }> {
    await this.usersService.updateUserStatus(
      id,
      body.estado,
      this.buildActorContext(req.user),
    );
    return { success: true };
  }

  @Post(':id/reset-password')
  @Permissions('users.manage')
  async resetPassword(
    @Param('id') id: string,
    @Body() body: ResetPasswordDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: true }> {
    await this.usersService.resetPassword(
      id,
      body.newTemporaryPassword,
      this.buildActorContext(req.user),
    );
    return { success: true };
  }

  private buildActorContext(user?: SafeUser): UsersActorContext {
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const actorEmpresaId = this.parseOptionalPositiveInt(
      user.storeId,
      'empresa',
    );
    const actorEmpresaClienteId = this.parseOptionalPositiveInt(
      user.empresaClienteId,
      'franquicia',
    );
    const isGlobalSuperAdmin =
      actorEmpresaClienteId === null &&
      user.permissions.includes('security.manage');

    return {
      actorUserId: user.id,
      actorEmpresaId,
      actorEmpresaClienteId,
      actorPermissions: user.permissions,
      isGlobalSuperAdmin,
    };
  }

  private parseOptionalPositiveInt(
    rawValue: string | undefined,
    fieldName: string,
  ): number | null {
    if (rawValue === undefined) {
      return null;
    }

    const normalized = rawValue.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new ForbiddenException(`Contexto de ${fieldName} invalido`);
    }

    return parsed;
  }
}
