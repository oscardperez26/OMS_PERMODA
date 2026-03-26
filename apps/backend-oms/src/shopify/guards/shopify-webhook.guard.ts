import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Valida la firma HMAC-SHA256 que Shopify incluye en cada webhook.
 *
 * Shopify firma el payload con el secreto compartido del webhook
 * y lo envía en el header `X-Shopify-Hmac-Sha256` (base64).
 * Usamos `timingSafeEqual` para evitar timing attacks.
 *
 * Requiere:
 *   - `rawBody: true` en NestFactory.create() (main.ts)
 *   - Variable de entorno `SHOPIFY_WEBHOOK_SECRET`
 */
@Injectable()
export class ShopifyWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string | undefined;
    const rawBody = req.rawBody;
    const secret = this.config.get<string>('SHOPIFY_WEBHOOK_SECRET');

    if (!secret) {
      throw new UnauthorizedException('SHOPIFY_WEBHOOK_SECRET no configurado');
    }

    if (!hmacHeader || !rawBody?.length) {
      throw new UnauthorizedException('Firma de webhook faltante');
    }

    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(hmacHeader);

    if (
      expectedBuf.length !== receivedBuf.length ||
      !timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new UnauthorizedException('Firma de webhook inválida');
    }

    return true;
  }
}
