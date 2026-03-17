import { ConfigService } from '@nestjs/config';
import { ZiTokenManagerService } from './zi-token-manager.service';

function createConfigService(overrides?: Record<string, string>): ConfigService {
  const values: Record<string, string> = {
    ZI_HOST: 'https://zi.local',
    ZI_AUTH_PATH: '/api/Users/login',
    ZI_AUTH_EMAIL: 'user@example.com',
    ZI_AUTH_PASSWORD: 'secret',
    ZI_TOKEN_REFRESH_SKEW_SEC: '60',
    ZI_TOKEN_TTL_FALLBACK_SEC: '600',
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

describe('ZiTokenManagerService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('login ok cachea token y getToken lo reutiliza sin re-login', async () => {
    const service = new ZiTokenManagerService(createConfigService());
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        mockJsonResponse({ accessToken: 'token-cache', expires_in: 120 }),
      );

    const first = await service.getToken();
    const second = await service.getToken();

    expect(first).toBe('token-cache');
    expect(second).toBe('token-cache');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('usa expires_in del response para controlar expiracion', async () => {
    const service = new ZiTokenManagerService(createConfigService());
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ accessToken: 'token-1', expires_in: 120 }),
    );
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ accessToken: 'token-2', expires_in: 120 }),
    );

    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const first = await service.getToken();
    now += 59_000;
    const second = await service.getToken();
    now += 2_000;
    const third = await service.getToken();

    expect(first).toBe('token-1');
    expect(second).toBe('token-1');
    expect(third).toBe('token-2');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('sin expires_in usa exp del JWT', async () => {
    const service = new ZiTokenManagerService(createConfigService());
    const now = 3_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const exp = Math.floor((now + 300_000) / 1000);
    const jwtPayload = Buffer.from(JSON.stringify({ exp }), 'utf8').toString(
      'base64url',
    );
    const token = `header.${jwtPayload}.signature`;

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse({ accessToken: token }));

    await service.getToken();

    const expiresAt = (service as unknown as { expiresAt: number }).expiresAt;
    expect(expiresAt).toBe(exp * 1000 - 60_000);
  });

  it('sin expires_in ni exp usa fallback ZI_TOKEN_TTL_FALLBACK_SEC', async () => {
    const service = new ZiTokenManagerService(createConfigService());
    const now = 5_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse({ accessToken: 'plain-token' }));

    await service.getToken();

    const expiresAt = (service as unknown as { expiresAt: number }).expiresAt;
    expect(expiresAt).toBe(now + 600_000 - 60_000);
  });

  it('lock de concurrencia: 3 llamadas simultaneas ejecutan 1 solo login', async () => {
    const service = new ZiTokenManagerService(createConfigService());
    const fetchSpy = jest.spyOn(global, 'fetch');
    let resolveFetch: ((value: Response) => void) | null = null;

    fetchSpy.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const firstPromise = service.forceRefresh();
    const secondPromise = service.forceRefresh();
    const thirdPromise = service.forceRefresh();

    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveFetch?.(mockJsonResponse({ accessToken: 'token-lock', expires_in: 120 }));
    const [first, second, third] = await Promise.all([
      firstPromise,
      secondPromise,
      thirdPromise,
    ]);

    expect(first).toBe('token-lock');
    expect(second).toBe('token-lock');
    expect(third).toBe('token-lock');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
