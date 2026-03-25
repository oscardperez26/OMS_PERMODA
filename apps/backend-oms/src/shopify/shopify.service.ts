import {
  BadGatewayException,
  Injectable,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopifyAuthService } from './shopify-auth.service';

export type ShopifyRestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ShopifyGraphqlError = {
  message: string;
  path?: Array<number | string>;
  extensions?: Record<string, unknown>;
};

type ShopifyGraphqlResponse<TData> = {
  data?: TData;
  errors?: ShopifyGraphqlError[];
  extensions?: Record<string, unknown>;
};

type ShopifyRequestOptions = {
  method: ShopifyRestMethod;
  url: string;
  body?: unknown;
  context: string;
  retry?: boolean;
};

// TODO fase 2: definir contratos tipados con los DTO/entidades de OMS.
export type ShopifyProductSetInput = Record<string, unknown>;
export type ShopifyInventorySetQuantitiesInput = Record<string, unknown>;
export type ShopifyOrdersQueryParams = {
  first?: number;
  after?: string | null;
  query?: string;
};

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: ShopifyAuthService,
  ) {}

  async rest<TResponse = unknown>(
    method: ShopifyRestMethod,
    path: string,
    body?: unknown,
  ): Promise<TResponse> {
    const normalizedPath = this.normalizePath(path);
    const url = this.getRestUrl(normalizedPath);
    const payload = await this.sendRequest({
      method,
      url,
      body,
      context: `REST ${method} ${normalizedPath}`,
    });

    return payload as TResponse;
  }

  async graphql<
    TData = Record<string, unknown>,
    TVariables extends Record<string, unknown> = Record<string, unknown>,
  >(query: string, variables?: TVariables): Promise<TData> {
    const url = this.getGraphqlUrl();
    const payload = await this.sendRequest({
      method: 'POST',
      url,
      body: {
        query,
        variables,
      },
      context: 'GraphQL',
    });

    if (!payload || typeof payload !== 'object') {
      throw new BadGatewayException(
        'Shopify GraphQL devolvio un payload invalido',
      );
    }

    const graphQlPayload = payload as ShopifyGraphqlResponse<TData>;
    if (
      Array.isArray(graphQlPayload.errors) &&
      graphQlPayload.errors.length > 0
    ) {
      const message = graphQlPayload.errors
        .map((error) => error.message)
        .join(' | ');
      this.logger.error(`Shopify GraphQL errors: ${message}`);
      throw new BadGatewayException(`Shopify GraphQL devolvio errores: ${message}`);
    }

    if (graphQlPayload.data === undefined) {
      throw new BadGatewayException('Shopify GraphQL no devolvio data');
    }

    return graphQlPayload.data;
  }

  async productSet(_input: ShopifyProductSetInput): Promise<never> {
    throw new NotImplementedException(
      'TODO: implementar productSet (sync productos OMS -> Shopify)',
    );
  }

  async inventorySetQuantities(
    _input: ShopifyInventorySetQuantitiesInput,
  ): Promise<never> {
    throw new NotImplementedException(
      'TODO: implementar inventorySetQuantities (sync stock OMS -> Shopify)',
    );
  }

  async queryOrders(_params?: ShopifyOrdersQueryParams): Promise<never> {
    throw new NotImplementedException(
      'TODO: implementar orders query (Shopify -> OMS)',
    );
  }

  private async sendRequest(options: ShopifyRequestOptions): Promise<unknown> {
    const token = options.retry
      ? await this.authService.refreshAccessToken()
      : await this.authService.getAccessToken();
    const timeoutMs = this.getNumberConfig('SHOPIFY_HTTP_TIMEOUT_MS', 15000);

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(options.url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`${options.context} fallo por red: ${message}`);
      throw new ServiceUnavailableException(
        'No fue posible conectar con Shopify',
      );
    }

    const durationMs = Date.now() - startedAt;
    const responseBody = await this.parseBody(response);

    this.logger.log(
      `${options.context} -> status=${response.status} (${durationMs}ms)`,
    );

    if (response.status === 401 && !options.retry) {
      this.logger.warn(
        `${options.context} devolvio 401. Refrescando token y reintentando una vez.`,
      );
      return this.sendRequest({
        ...options,
        retry: true,
      });
    }

    if (!response.ok) {
      const message = this.buildErrorMessage(
        options.context,
        response.status,
        responseBody,
      );
      this.logger.error(message);
      throw new BadGatewayException(message);
    }

    return responseBody;
  }

  private getRestUrl(path: string): string {
    const shopDomain = this.getRequiredConfig('SHOPIFY_SHOP_DOMAIN');
    const apiVersion = this.getRequiredConfig('SHOPIFY_API_VERSION');
    return `https://${shopDomain}/admin/api/${apiVersion}/${path}`;
  }

  private getGraphqlUrl(): string {
    const shopDomain = this.getRequiredConfig('SHOPIFY_SHOP_DOMAIN');
    const apiVersion = this.getRequiredConfig('SHOPIFY_API_VERSION');
    return `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
  }

  private normalizePath(path: string): string {
    const normalized = path.trim().replace(/^\/+/, '');
    if (!normalized) {
      throw new BadGatewayException('Shopify REST path no puede estar vacio');
    }

    return normalized;
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
    context: string,
    status: number,
    responseBody: unknown,
  ): string {
    const body =
      typeof responseBody === 'string'
        ? responseBody
        : responseBody
          ? JSON.stringify(responseBody)
          : '';
    const compactBody = body.length > 800 ? `${body.slice(0, 800)}...` : body;

    return compactBody
      ? `${context} fallo. status=${status}. body=${compactBody}`
      : `${context} fallo. status=${status}`;
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

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (!raw) {
      return fallback;
    }

    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido';
  }
}
