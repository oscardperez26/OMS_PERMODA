import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ZiTokenManagerService } from '../auth/zi-token-manager.service';
import { ZiApiClientService } from './zi-api-client.service';

function createConfigService(overrides?: Record<string, string>): ConfigService {
  const values: Record<string, string> = {
    ZI_HOST: 'https://zi.local',
    ZI_ECOMMERCE_PATH: '/api/Ecommerce',
    ZI_HTTP_TIMEOUT_MS: '10000',
    ...(overrides ?? {}),
  };

  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function mockJsonResponse(
  payload: unknown,
  options?: { ok?: boolean; status?: number },
): Response {
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe('ZiApiClientService', () => {
  const tokenManager = {
    getToken: jest.fn(),
    forceRefresh: jest.fn(),
  } as unknown as ZiTokenManagerService;

  let service: ZiApiClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ZiApiClientService(createConfigService(), tokenManager);
    tokenManager.getToken = jest.fn().mockResolvedValue('token-inicial');
    tokenManager.forceRefresh = jest.fn().mockResolvedValue('token-renovado');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('inyecta Authorization Bearer en headers', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse({ data: 'ok' }));

    await service.request<{ data: string }>('GET', '/Change');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-inicial',
    );
  });

  it('401 -> forceRefresh -> reintento 1 vez -> exito', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ message: 'unauthorized' }, { ok: false, status: 401 }),
    );
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ data: 'ok' }));

    const result = await service.request<{ data: string }>('GET', '/Change');

    expect(result.data).toBe('ok');
    expect(tokenManager.forceRefresh).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('401 -> forceRefresh -> segundo 401 lanza ServiceUnavailableException', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ message: 'unauthorized' }, { ok: false, status: 401 }),
    );
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ message: 'unauthorized' }, { ok: false, status: 401 }),
    );

    await expect(service.request('GET', '/Change')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(tokenManager.forceRefresh).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fetch lanza error de red y retorna ServiceUnavailableException', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));

    await expect(service.request('GET', '/Change')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('response.ok=false retorna ServiceUnavailableException', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        mockJsonResponse({ message: 'bad' }, { ok: false, status: 500 }),
      );

    await expect(service.request('GET', '/Change')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('payload null retorna ServiceUnavailableException', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('invalid json');
      },
    } as Response);

    await expect(service.request('GET', '/Change')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('timeout AbortSignal se traduce a ServiceUnavailableException', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('The operation was aborted'));

    await expect(service.request('GET', '/Change')).rejects.toThrow(
      ServiceUnavailableException,
    );

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeDefined();
  });
});
