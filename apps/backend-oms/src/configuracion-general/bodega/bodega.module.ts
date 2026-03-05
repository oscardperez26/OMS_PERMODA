import { Module } from '@nestjs/common';
import { BodegaController } from './bodega.controller';
import { BodegaRepository } from './bodega.repository';
import { BodegaService } from './bodega.service';

@Module({
  controllers: [BodegaController],
  providers: [BodegaService, BodegaRepository],
  exports: [BodegaService],
})
export class BodegaModule {}
