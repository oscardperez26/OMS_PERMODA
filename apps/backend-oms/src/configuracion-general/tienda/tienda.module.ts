import { Module } from '@nestjs/common';
import { TiendaController } from './tienda.controller';
import { TiendaRepository } from './tienda.repository';
import { TiendaService } from './tienda.service';

@Module({
  controllers: [TiendaController],
  providers: [TiendaService, TiendaRepository],
  exports: [TiendaService],
})
export class TiendaModule {}
