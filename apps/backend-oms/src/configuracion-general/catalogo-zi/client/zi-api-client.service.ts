import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZiTokenManagerService } from '../auth/zi-token-manager.service';

@Injectable()
export class ZiApiClientService {
  constructor(
    private readonly config: ConfigService,
    private readonly tokenManager: ZiTokenManagerService,
  ) {}

  async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.tokenManager.getToken();
    return this.doRequest<T>(method, path, body, token);
  }

  private async doRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    token: string,
    isRetry = false,
  ): Promise<T> {
    const host = this.config.get<string>('ZI_HOST') ?? '';
    const ecommercePath = this.config.get<string>('ZI_ECOMMERCE_PATH') ?? '';
    const timeoutMs = this.getNumberConfig('ZI_HTTP_TIMEOUT_MS', 10000);
    const url = `${host}${ecommercePath}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ServiceUnavailableException('No fue posible conectar con ZI');
    }

    if (response.status === 401 && !isRetry) {
      const newToken = await this.tokenManager.forceRefresh();
      return this.doRequest<T>(method, path, body, newToken, true);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `ZI respondio con estado ${response.status}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as T | null;
    if (!payload) {
      throw new ServiceUnavailableException('ZI devolvio respuesta invalida');
    }
    return payload;
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    if (!raw) {
      return fallback;
    }

    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
