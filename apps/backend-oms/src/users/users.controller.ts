import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../auth/auth.decorators';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.manage')
  async list() {
    const users = await this.usersService.listUsers();
    return { users };
  }

  @Get('profiles')
  @Permissions('users.manage')
  listProfiles() {
    const profiles = this.usersService.listProfiles();
    return { profiles };
  }

  @Post()
  @Permissions('users.manage')
  async create(@Body() body: CreateUserDto) {
    const result = await this.usersService.createUser(body);
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
  ): Promise<{ success: true }> {
    await this.usersService.updateUserStatus(id, body.estado);
    return { success: true };
  }

  @Post(':id/reset-password')
  @Permissions('users.manage')
  async resetPassword(
    @Param('id') id: string,
    @Body() body: ResetPasswordDto,
  ): Promise<{ success: true }> {
    await this.usersService.resetPassword(id, body.newTemporaryPassword);
    return { success: true };
  }
}
