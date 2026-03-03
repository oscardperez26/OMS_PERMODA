import { Module } from '@nestjs/common';
import { ZonaTransporteController } from './zona-transporte.controller';
import { ZonaTransporteRepository } from './zona-transporte.repository';
import { ZonaTransporteService } from './zona-transporte.service';

@Module({
  controllers: [ZonaTransporteController],
  providers: [ZonaTransporteService, ZonaTransporteRepository],
  exports: [ZonaTransporteService],
})
export class ZonaTransporteModule {}
