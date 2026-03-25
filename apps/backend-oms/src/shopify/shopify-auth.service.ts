import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ShopifyAccessTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  token_type?: string;
  scope?: string;
};

export type ShopifyTokenState = {
  access_token: string | null;
  expires_in: number | null;
  expires_at: number | null;
  expires_at_iso: string | null;
  is_expiring_soon: boolean;
};

@Injectable()
export class ShopifyAuthService {
  private readonly logger = new Logger(ShopifyAuthService.name);

  private accessToken: string | null = null;
  private expiresIn: number | null = null;
  private expiresAt: number | null = null;
  private refreshInFlight: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.accessToken as string;
    }

    return this.refreshAccessToken();
  }

  async refreshAccessToken(): Promise<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.fetchAccessToken();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async getTokenState(forceRefresh = false): Promise<ShopifyTokenState> {
    if (forceRefresh || !this.isTokenValid()) {
      await this.getAccessToken();
    }

    return {
      access_token: this.accessToken,
      expires_in: this.expiresIn,
      expires_at: this.expiresAt,
      expires_at_iso: this.expiresAt
        ? new Date(this.expiresAt).toISOString()
        : null,
      is_expiring_soon: this.isTokenExpiringSoon(),
    };
  }

  private async fetchAccessToken(): Promise<string> {
    const shopDomain = this.getRequiredConfig('SHOPIFY_SHOP_DOMAIN');
    const clientId = this.getRequiredConfig('SHOPIFY_CLIENT_ID');
    const clientSecret = this.getRequiredConfig('SHOPIFY_CLIENT_SECRET');
    const timeoutMs = this.getNumberConfig('SHOPIFY_HTTP_TIMEOUT_MS', 15000);
    const url = `https://${shopDomain}/admin/oauth/access_token`;

    this.logger.log(`Solicitando access token para ${shopDomain}`);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Error de red al autenticar con Shopify: ${message}`);
      throw new ServiceUnavailableException(
        'No fue posible autenticar con Shopify',
      );
    }

    const responseBody = await this.parseBody(response);

    if (!response.ok) {
      const message = this.buildErrorMessage(
        'Shopify auth fallo',
        response.status,
        responseBody,
      );
      this.logger.error(message);
      throw new ServiceUnavailableException(message);
    }

    if (!responseBody || typeof responseBody !== 'object') {
      throw new ServiceUnavailableException(
        'Shopify auth devolvio una respuesta invalida',
      );
    }

    const tokenPayload = responseBody as ShopifyAccessTokenResponse;
    if (!tokenPayload.access_token) {
      throw new ServiceUnavailableException('Shopify no devolvio access_token');
    }

    const issuedAt = Date.now();
    const expiresIn = this.resolveExpiresIn(tokenPayload.expires_in);
    const expiresAt = issuedAt + expiresIn * 1000;

    this.accessToken = tokenPayload.access_token;
    this.expiresIn = expiresIn;
    this.expiresAt = expiresAt;

    this.logger.log(
      `Token Shopify actualizado. Expira en ${new Date(expiresAt).toISOString()}`,
    );

    return this.accessToken;
  }

  private isTokenValid(): boolean {
    if (!this.accessToken || !this.expiresAt) {
      return false;
    }

    const refreshSkewMs =
      this.getNumberConfig('SHOPIFY_TOKEN_REFRESH_SKEW_SEC', 60, true) * 1000;

    return Date.now() < this.expiresAt - refreshSkewMs;
  }

  private isTokenExpiringSoon(): boolean {
    if (!this.expiresAt) {
      return true;
    }

    const refreshSkewMs =
      this.getNumberConfig('SHOPIFY_TOKEN_REFRESH_SKEW_SEC', 60, true) * 1000;

    return Date.now() >= this.expiresAt - refreshSkewMs;
  }

  private resolveExpiresIn(raw?: number | string): number {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      return Math.floor(raw);
    }

    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.floor(parsed);
      }
    }

    return this.getNumberConfig('SHOPIFY_TOKEN_TTL_FALLBACK_SEC', 3600);
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text().catch(() => '');
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private buildErrorMessage(
    prefix: string,
    status: number,
    responseBody: unknown,
  ): string {
    const body =
      typeof responseBody === 'string'
        ? responseBody
        : responseBody
          ? JSON.stringify(responseBody)
          : '';
    const compactBody = body.length > 600 ? `${body.slice(0, 600)}...` : body;

    return compactBody
      ? `${prefix}. status=${status}. body=${compactBody}`
      : `${prefix}. status=${status}`;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new ServiceUnavailableException(
        `Falta configuracion requerida: ${key}`,
      );
    }

    return value;
  }

  private getNumberConfig(
    key: string,
    fallback: number,
    allowZero = false,
  ): number {
    const raw = this.configService.get<string>(key);
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    if (allowZero) {
      return parsed >= 0 ? parsed : fallback;
    }

    return parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido';
  }
}
