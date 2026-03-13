import type { SyncPendingResult } from '../../../orders/orders.types';
import type { IntegracionEntranteListItem } from '../integraciones-entrantes.types';

export type IntegracionEntranteSyncExecutionContext = {
  inbound: IntegracionEntranteListItem;
  limit?: number;
};

export type IntegracionEntranteAdapterExecutionResult =
  | {
      kind: 'ORDERS_SYNC';
      syncResult: SyncPendingResult;
    }
  | {
      kind: 'BLOCKED';
      message: string;
      errorCode: string;
    };

export interface IntegracionEntranteSyncAdapter {
  supports(inbound: IntegracionEntranteListItem): boolean;
  execute(
    context: IntegracionEntranteSyncExecutionContext,
  ): Promise<IntegracionEntranteAdapterExecutionResult>;
}
