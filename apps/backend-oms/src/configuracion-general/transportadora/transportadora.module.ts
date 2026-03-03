import { Module } from '@nestjs/common';
import { TransportadoraController } from './transportadora.controller';
import { TransportadoraRepository } from './transportadora.repository';
import { TransportadoraService } from './transportadora.service';

@Module({
  controllers: [TransportadoraController],
  providers: [TransportadoraService, TransportadoraRepository],
  exports: [TransportadoraService],
})
export class TransportadoraModule {}
