import { Injectable } from '@nestjs/common';
import { OrdersService } from '../../../orders/orders.service';
import type {
  IntegracionEntranteAdapterExecutionResult,
  IntegracionEntranteSyncAdapter,
  IntegracionEntranteSyncExecutionContext,
} from './integracion-entrante-sync.adapter';

@Injectable()
export class KoajPilotInboundAdapter implements IntegracionEntranteSyncAdapter {
  constructor(private readonly ordersService: OrdersService) {}

  supports(context: IntegracionEntranteSyncExecutionContext['inbound']): boolean {
    return (
      context.config.providerCode.toUpperCase() === 'KOAJ' &&
      context.config.mode === 'KOAJ_PILOT'
    );
  }

  async execute(
    context: IntegracionEntranteSyncExecutionContext,
  ): Promise<IntegracionEntranteAdapterExecutionResult> {
    const syncResult = await this.ordersService.syncPendingOrders(context.limit, {
      integracionId: context.inbound.integracionId,
      integracionCodigo: context.inbound.codigo,
      dedupeByConnector: true,
      numeroPedidoPrefix: context.inbound.codigo,
    });

    return {
      kind: 'ORDERS_SYNC',
      syncResult,
    };
  }
}
