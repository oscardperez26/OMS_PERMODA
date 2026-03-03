import { Module } from '@nestjs/common';
import { ZonaCiudadController } from './zona-ciudad.controller';
import { ZonaCiudadRepository } from './zona-ciudad.repository';
import { ZonaCiudadService } from './zona-ciudad.service';

@Module({
  controllers: [ZonaCiudadController],
  providers: [ZonaCiudadService, ZonaCiudadRepository],
  exports: [ZonaCiudadService],
})
export class ZonaCiudadModule {}
