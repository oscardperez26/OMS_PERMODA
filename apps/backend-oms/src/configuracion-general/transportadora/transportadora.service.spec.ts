import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TransportadoraRepository } from './transportadora.repository';
import { TransportadoraService } from './transportadora.service';
import type { TransportadoraApiCryptoService } from './transportadora-api-crypto.service';

describe('TransportadoraService api-config', () => {
  const repository = {
    findById: jest.fn(),
    findApiConfigByTransportadoraId: jest.fn(),
    upsertApiConfig: jest.fn(),
  } as unknown as TransportadoraRepository;

  const cryptoService = {
    encryptApiKey: jest.fn(),
  } as unknown as TransportadoraApiCryptoService;

  let service: TransportadoraService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransportadoraService(repository, cryptoService);
  });

  it('returns defaults when api config does not exist', async () => {
    repository.findById = jest.fn().mockResolvedValue({
      transportadoraId: 1,
      empresaId: 1,
      codigo: 'SERVIENTREGA',
      nombre: 'Servientrega',
      activo: true,
      permiteExpress: false,
      createdAt: '2026-03-12T00:00:00.000Z',
    });
    repository.findApiConfigByTransportadoraId = jest
      .fn()
      .mockResolvedValue(null);

    const result = await service.getTransportadoraApiConfigById(1);

    expect(result.apiConfig.authType).toBe('API_KEY');
    expect(result.apiConfig.timeoutMs).toBe(15000);
    expect(result.apiConfig.hasApiKey).toBe(false);
  });

  it('throws not found when transportadora does not exist', async () => {
    repository.findById = jest.fn().mockResolvedValue(null);

    await expect(service.getTransportadoraApiConfigById(999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('upserts api config and rotates token when plaintext is sent', async () => {
    repository.findById = jest.fn().mockResolvedValue({
      transportadoraId: 1,
      empresaId: 1,
      codigo: 'SERVIENTREGA',
      nombre: 'Servientrega',
      activo: true,
      permiteExpress: false,
      createdAt: '2026-03-12T00:00:00.000Z',
    });
    repository.findApiConfigByTransportadoraId = jest.fn().mockResolvedValue({
      authType: 'API_KEY',
      timeoutMs: 15000,
      hasApiKey: true,
      baseUrl: 'https://api.old.com',
      createShipmentEndpoint: '/shipments',
      trackingEndpointTemplate: '/track/{trackingNumber}',
      trackingNumberField: 'tracking',
      statusField: 'status',
      apiKeyLastRotatedAt: null,
      updatedAt: null,
    });
    cryptoService.encryptApiKey = jest.fn().mockReturnValue({
      ciphertext: 'ciphertext',
      iv: 'iv',
      tag: 'tag',
    });
    repository.upsertApiConfig = jest.fn().mockResolvedValue(undefined);

    await service.updateTransportadoraApiConfig(1, {
      baseUrl: 'https://api.new.com',
      authType: 'API_KEY',
      timeoutMs: 3000,
      createShipmentEndpoint: '/ship',
      trackingEndpointTemplate: '/track/{trackingNumber}',
      trackingNumberField: 'tracking_number',
      statusField: 'status',
      apiKeyPlaintext: 'my-secret',
    });

    expect(cryptoService.encryptApiKey).toHaveBeenCalledTimes(1);
    expect(repository.upsertApiConfig).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        baseUrl: 'https://api.new.com',
        authType: 'API_KEY',
        timeoutMs: 3000,
        createShipmentEndpoint: '/ship',
        rotateApiKey: true,
        apiKeyCiphertext: 'ciphertext',
        apiKeyIv: 'iv',
        apiKeyTag: 'tag',
      }),
    );
  });

  it('rejects endpoint without initial slash', async () => {
    repository.findById = jest.fn().mockResolvedValue({
      transportadoraId: 1,
      empresaId: 1,
      codigo: 'SERVIENTREGA',
      nombre: 'Servientrega',
      activo: true,
      permiteExpress: false,
      createdAt: '2026-03-12T00:00:00.000Z',
    });
    repository.findApiConfigByTransportadoraId = jest
      .fn()
      .mockResolvedValue(null);

    await expect(
      service.updateTransportadoraApiConfig(1, {
        createShipmentEndpoint: 'shipments',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
