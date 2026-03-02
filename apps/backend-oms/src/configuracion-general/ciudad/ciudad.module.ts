import { Module } from '@nestjs/common';
import { CiudadController } from './ciudad.controller';
import { CiudadRepository } from './ciudad.repository';
import { CiudadService } from './ciudad.service';

@Module({
  controllers: [CiudadController],
  providers: [CiudadService, CiudadRepository],
  exports: [CiudadService],
})
export class CiudadModule {}
