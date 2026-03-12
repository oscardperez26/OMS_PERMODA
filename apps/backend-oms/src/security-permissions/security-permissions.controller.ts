import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { Permissions } from '../auth/auth.decorators';
import { UpdateProfilePermissionsDto } from './dto/update-profile-permissions.dto';
import { SecurityPermissionsService } from './security-permissions.service';

@Controller('security/permissions')
export class SecurityPermissionsController {
  constructor(
    private readonly securityPermissionsService: SecurityPermissionsService,
  ) {}

  @Get('bootstrap')
  @Permissions('security.manage')
  async bootstrap() {
    return this.securityPermissionsService.getBootstrap();
  }

  @Put('perfiles/:perfilId')
  @Permissions('security.manage')
  async updateProfilePermissions(
    @Param('perfilId', ParseIntPipe) perfilId: number,
    @Body() body: UpdateProfilePermissionsDto,
  ): Promise<{ success: true }> {
    await this.securityPermissionsService.updateProfilePermissions(
      perfilId,
      body.permissions,
    );
    return { success: true };
  }
}
