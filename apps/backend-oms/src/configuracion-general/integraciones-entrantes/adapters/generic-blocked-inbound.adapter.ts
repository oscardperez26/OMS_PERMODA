import { Injectable } from '@nestjs/common';
import type {
  IntegracionEntranteAdapterExecutionResult,
  IntegracionEntranteSyncAdapter,
  IntegracionEntranteSyncExecutionContext,
} from './integracion-entrante-sync.adapter';

@Injectable()
export class GenericBlockedInboundAdapter
  implements IntegracionEntranteSyncAdapter
{
  supports(): boolean {
    return true;
  }

  async execute(
    _context: IntegracionEntranteSyncExecutionContext,
  ): Promise<IntegracionEntranteAdapterExecutionResult> {
    return {
      kind: 'BLOCKED',
      message:
        'Sincronizacion pendiente de implementacion para el proveedor/modo configurado',
      errorCode: 'SYNC_NOT_IMPLEMENTED',
    };
  }
}
