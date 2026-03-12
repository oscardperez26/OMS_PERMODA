import { Module } from '@nestjs/common';
import { OrdersModule } from '../../orders/orders.module';
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
  ],
  exports: [IntegracionesEntrantesService],
})
export class IntegracionesEntrantesModule {}
