import { Module } from '@nestjs/common';
import { MonedaController } from './moneda.controller';
import { MonedaRepository } from './moneda.repository';
import { MonedaService } from './moneda.service';

@Module({
  controllers: [MonedaController],
  providers: [MonedaService, MonedaRepository],
  exports: [MonedaService],
})
export class MonedaModule {}
