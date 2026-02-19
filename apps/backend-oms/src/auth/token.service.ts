import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthenticatedUser, TokenPayload } from './auth.types';

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

@Injectable()
export class TokenService {
  private readonly secret =
    process.env.AUTH_SECRET ?? 'dev-secret-change-me-in-production';

  private signPayload(payload: TokenPayload): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const content = `${header}.${body}`;
    const signature = createHmac('sha256', this.secret)
      .update(content)
      .digest('base64url');
    return `${content}.${signature}`;
  }

  private verifyToken(token: string): TokenPayload {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) {
      throw new UnauthorizedException('Token malformado');
    }

    const content = `${header}.${body}`;
    const expectedSignature = createHmac('sha256', this.secret)
      .update(content)
      .digest('base64url');

    if (signature.length !== expectedSignature.length) {
      throw new UnauthorizedException('Firma de token inválida');
    }

    const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    if (!isValid) {
      throw new UnauthorizedException('Firma de token inválida');
    }

    const payload = JSON.parse(base64UrlDecode(body)) as TokenPayload;

    if (Date.now() >= payload.exp * 1000) {
      throw new UnauthorizedException('Token expirado');
    }

    return payload;
  }

  createAccessToken(user: AuthenticatedUser): string {
    const payload: TokenPayload = {
      sub: user.id,
      role: user.role,
      permissions: user.permissions,
      sessionId: user.sessionId,
      storeId: user.storeId,
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 60 * 15,
    };
    return this.signPayload(payload);
  }

  createRefreshToken(user: AuthenticatedUser): string {
    const payload: TokenPayload = {
      sub: user.id,
      role: user.role,
      permissions: user.permissions,
      sessionId: user.sessionId,
      storeId: user.storeId,
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    };
    return this.signPayload(payload);
  }

  verifyAccessToken(token: string): TokenPayload {
    const payload = this.verifyToken(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }
    return payload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    const payload = this.verifyToken(token);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Tipo de token inválido');
    }
    return payload;
  }
}
