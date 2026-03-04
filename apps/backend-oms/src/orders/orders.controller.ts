import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../auth/auth.decorators';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Permissions('orders.read')
  async listOrders() {
    const orders = await this.ordersService.listOrders();
    return { orders };
  }
}
