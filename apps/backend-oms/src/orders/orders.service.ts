import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  KoajPendingOrder,
  KoajPendingResponse,
  OrderListItem,
} from './orders.types';

@Injectable()
export class OrdersService {
  constructor(private readonly configService: ConfigService) {}

  async listOrders(): Promise<OrderListItem[]> {
    const token = await this.loginKoaj();
    const pending = await this.fetchPendingOrders(token);
    const rows = pending.Pedidos ?? [];

    return rows.map((row) => this.mapPendingOrder(row));
  }

  private async loginKoaj(): Promise<string> {
    const baseUrl = this.getKoajBaseUrl();
    const username = this.configService.get<string>('KOAJ_USERNAME') ?? 'Tienda105';
    const password = this.configService.get<string>('KOAJ_PASSWORD') ?? 'Tienda105';

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible conectar con KOAJ para autenticacion',
      );
    }

    const rawBody = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `KOAJ login fallo con estado ${response.status}`,
      );
    }

    const token = this.extractToken(rawBody);
    if (!token) {
      throw new ServiceUnavailableException('KOAJ login no devolvio token');
    }

    return token;
  }

  private async fetchPendingOrders(token: string): Promise<KoajPendingResponse> {
    const baseUrl = this.getKoajBaseUrl();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/orders/pending`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible consultar pedidos pendientes en KOAJ',
      );
    }

    const rawBody = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `KOAJ pending fallo con estado ${response.status}`,
      );
    }

    try {
      return JSON.parse(rawBody) as KoajPendingResponse;
    } catch {
      throw new ServiceUnavailableException(
        'KOAJ pending devolvio una respuesta invalida',
      );
    }
  }

  private mapPendingOrder(order: KoajPendingOrder): OrderListItem {
    const customer = [order.CLIENTE?.NOMBRE?.trim(), order.CLIENTE?.APELLIDO?.trim()]
      .filter((value): value is string => Boolean(value))
      .join(' ');

    const reference = order.REFERENCIA?.trim() || order.REF_ORIGINAL?.trim() || order.ALIAS;

    return {
      id: String(order.ID_PEDIDO),
      reference,
      newCustomer: 'No',
      delivery: order.CLIENTE?.PAIS?.trim() || '-',
      customer: customer || 'Cliente sin nombre',
      total: '0,00 $',
      payment: '-',
      status: 'Asignado',
      date: order.FECHA?.trim() || '-',
      alias: order.ALIAS,
      koajOrderId: order.ID_PEDIDO,
      origen: order.ORIGEN,
    };
  }

  private getKoajBaseUrl(): string {
    return this.configService.get<string>('KOAJ_BASE_URL') ?? 'https://api.dev.koaj.co';
  }

  private extractToken(rawBody: string): string {
    const trimmed = rawBody.trim();
    if (!trimmed) {
      return '';
    }

    // KOAJ suele responder token serializado como string JSON: "abc123"
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === 'string') {
        return parsed.trim();
      }
      if (
        parsed &&
        typeof parsed === 'object' &&
        'token' in parsed &&
        typeof (parsed as { token?: unknown }).token === 'string'
      ) {
        return (parsed as { token: string }).token.trim();
      }
    } catch {
      // Non-JSON response.
    }

    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }
}
