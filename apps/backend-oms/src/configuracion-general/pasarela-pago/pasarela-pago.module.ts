import { Module } from '@nestjs/common';
import { PasarelaPagoController } from './pasarela-pago.controller';
import { PasarelaPagoRepository } from './pasarela-pago.repository';
import { PasarelaPagoService } from './pasarela-pago.service';

@Module({
  controllers: [PasarelaPagoController],
  providers: [PasarelaPagoService, PasarelaPagoRepository],
  exports: [PasarelaPagoService],
})
export class PasarelaPagoModule {}
