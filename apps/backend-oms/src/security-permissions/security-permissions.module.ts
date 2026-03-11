import { Module } from '@nestjs/common';
import { SecurityPermissionsController } from './security-permissions.controller';
import { SecurityPermissionsRepository } from './security-permissions.repository';
import { SecurityPermissionsService } from './security-permissions.service';

@Module({
  controllers: [SecurityPermissionsController],
  providers: [SecurityPermissionsService, SecurityPermissionsRepository],
  exports: [SecurityPermissionsService],
})
export class SecurityPermissionsModule {}
