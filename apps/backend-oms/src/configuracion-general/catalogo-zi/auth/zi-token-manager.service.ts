import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RefreshWaiter = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

@Injectable()
export class ZiTokenManagerService {
  constructor(private readonly config: ConfigService) {}

  private cachedToken: string | null = null;
  private expiresAt = 0;
  private refreshing = false;
  private refreshQueue: RefreshWaiter[] = [];

  async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.expiresAt) {
      return this.cachedToken;
    }
    return this.forceRefresh();
  }

  async forceRefresh(): Promise<string> {
    if (this.refreshing) {
      return new Promise<string>((resolve, reject) =>
        this.refreshQueue.push({ resolve, reject }),
      );
    }

    this.refreshing = true;
    try {
      const token = await this.doLogin();
      this.refreshQueue.forEach((waiter) => waiter.resolve(token));
      this.refreshQueue = [];
      return token;
    } catch (error) {
      this.refreshQueue.forEach((waiter) => waiter.reject(error));
      this.refreshQueue = [];
      throw error;
    } finally {
      this.refreshing = false;
    }
  }

  private async doLogin(): Promise<string> {
    const host = this.config.get<string>('ZI_HOST') ?? '';
    const authPath = this.config.get<string>('ZI_AUTH_PATH') ?? '';
    const timeoutMs = this.getNumberConfig('ZI_HTTP_TIMEOUT_MS', 10000);
    const url = `${host}${authPath}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.config.get<string>('ZI_AUTH_EMAIL'),
          password: this.config.get<string>('ZI_AUTH_PASSWORD'),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible autenticar con ZI',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Autenticacion ZI fallo');
    }

    const body = (await response.json().catch(() => null)) as
      | { accessToken?: string; expires_in?: number }
      | null;
    if (!body?.accessToken) {
      throw new ServiceUnavailableException('ZI no devolvio token');
    }

    const issuedAt = Date.now();
    this.expiresAt = this.parseExpiration(body, issuedAt);
    this.cachedToken = body.accessToken;
    return this.cachedToken;
  }

  private parseExpiration(
    body: { expires_in?: number; accessToken?: string },
    issuedAt: number,
  ): number {
    const skew =
      this.getNumberConfig('ZI_TOKEN_REFRESH_SKEW_SEC', 60, true) * 1000;
    const fallback =
      this.getNumberConfig('ZI_TOKEN_TTL_FALLBACK_SEC', 600) * 1000;

    if (typeof body.expires_in === 'number' && body.expires_in > 0) {
      return issuedAt + body.expires_in * 1000 - skew;
    }

    try {
      const parts = (body.accessToken ?? '').split('.');
      if (parts.length === 3) {
        const encodedPayload = parts[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
        const payload = JSON.parse(
          Buffer.from(encodedPayload, 'base64').toString('utf8'),
        ) as { exp?: number };
        if (typeof payload.exp === 'number' && payload.exp > 0) {
          return payload.exp * 1000 - skew;
        }
      }
    } catch {
      // Ignore JWT parse issues and continue with fallback TTL.
    }

    return issuedAt + fallback - skew;
  }

  private getNumberConfig(
    key: string,
    fallback: number,
    allowZero = false,
  ): number {
    const raw = this.config.get<string>(key);
    if (!raw) {
      return fallback;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return fallback;
    }
    if (allowZero) {
      return value >= 0 ? value : fallback;
    }
    return value > 0 ? value : fallback;
  }
}
