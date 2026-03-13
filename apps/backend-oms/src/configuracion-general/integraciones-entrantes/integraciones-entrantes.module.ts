import { Module } from '@nestjs/common';
import { OrdersModule } from '../../orders/orders.module';
import { GenericBlockedInboundAdapter } from './adapters/generic-blocked-inbound.adapter';
import { KoajPilotInboundAdapter } from './adapters/koaj-pilot-inbound.adapter';
import { IntegracionesEntrantesController } from './integraciones-entrantes.controller';
import { IntegracionesEntrantesSyncScheduler } from './integraciones-entrantes-sync.scheduler';
import { IntegracionesEntrantesRepository } from './integraciones-entrantes.repository';
import { IntegracionesEntrantesService } from './integraciones-entrantes.service';

@Module({
  imports: [OrdersModule],
  controllers: [IntegracionesEntrantesController],
  providers: [
    IntegracionesEntrantesService,
    IntegracionesEntrantesRepository,
    IntegracionesEntrantesSyncScheduler,
    KoajPilotInboundAdapter,
    GenericBlockedInboundAdapter,
  ],
  exports: [IntegracionesEntrantesService],
})
export class IntegracionesEntrantesModule {}
