import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersSyncScheduler } from './orders-sync.scheduler';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrdersSyncScheduler],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
