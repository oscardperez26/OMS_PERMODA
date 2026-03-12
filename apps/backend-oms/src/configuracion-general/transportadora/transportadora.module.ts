import { Module } from '@nestjs/common';
import { TransportadoraController } from './transportadora.controller';
import { TransportadoraApiCryptoService } from './transportadora-api-crypto.service';
import { TransportadoraRepository } from './transportadora.repository';
import { TransportadoraService } from './transportadora.service';

@Module({
  controllers: [TransportadoraController],
  providers: [
    TransportadoraService,
    TransportadoraRepository,
    TransportadoraApiCryptoService,
  ],
  exports: [TransportadoraService],
})
export class TransportadoraModule {}
