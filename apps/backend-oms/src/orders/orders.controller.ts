import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Permissions } from '../auth/auth.decorators';
import { AssignmentConfirmDto } from './dto/assignment-confirm.dto';
import { AssignmentPreviewDto } from './dto/assignment-preview.dto';
import { SyncPendingOrdersDto } from './dto/sync-pending-orders.dto';
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

  @Post('sync/pending')
  @Permissions('orders.manage')
  async syncPendingOrders(@Body() body: SyncPendingOrdersDto) {
    return this.ordersService.syncPendingOrders(body.limit);
  }

  @Post('sync/full')
  @Permissions('orders.manage')
  async syncFullOrders(@Body() body: SyncPendingOrdersDto) {
    return this.ordersService.syncPendingOrders(body.limit);
  }

  @Get(':pedidoId')
  @Permissions('orders.read')
  async getOrderDetail(@Param('pedidoId', ParseIntPipe) pedidoId: number) {
    const order = await this.ordersService.getOrderDetail(pedidoId);
    return { order };
  }

  @Post(':pedidoId/assignment/preview')
  @Permissions('orders.read')
  async previewAssignment(
    @Param('pedidoId', ParseIntPipe) pedidoId: number,
    @Body() body: AssignmentPreviewDto,
  ) {
    return this.ordersService.previewAssignment(pedidoId, body);
  }

  @Patch(':pedidoId/assignment/confirm')
  @Permissions('orders.manage')
  async confirmAssignment(
    @Param('pedidoId', ParseIntPipe) pedidoId: number,
    @Body() body: AssignmentConfirmDto,
  ) {
    return this.ordersService.confirmAssignment(pedidoId, body);
  }
}
