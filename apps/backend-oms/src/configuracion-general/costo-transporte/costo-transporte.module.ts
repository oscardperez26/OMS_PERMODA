import { Module } from '@nestjs/common';
import { CostoTransporteController } from './costo-transporte.controller';
import { CostoTransporteRepository } from './costo-transporte.repository';
import { CostoTransporteService } from './costo-transporte.service';

@Module({
  controllers: [CostoTransporteController],
  providers: [CostoTransporteService, CostoTransporteRepository],
  exports: [CostoTransporteService],
})
export class CostoTransporteModule {}
