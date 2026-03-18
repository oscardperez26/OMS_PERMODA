import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogoZiService } from '../catalogo-zi.service';
import { ZiPersistService } from '../zi-persist.service';
import { ZiSyncSchedulerService } from './zi-sync.scheduler';

function createScheduler(
  enabled = true,
): {
  scheduler: ZiSyncSchedulerService;
  persistService: jest.Mocked<ZiPersistService>;
  catalogoZiService: jest.Mocked<CatalogoZiService>;
} {
  const persistService = {
    persistStock: jest.fn(),
    persistPrecios: jest.fn(),
    persistDeltaSync: jest.fn(),
    persistCategorias: jest.fn(),
    repository: {
      getLastHashes: jest.fn(),
    },
  } as unknown as jest.Mocked<ZiPersistService>;

  const catalogoZiService = {
    getChange: jest.fn(),
  } as unknown as jest.Mocked<CatalogoZiService>;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'ZI_SYNC_ENABLED') {
        return enabled ? 'true' : 'false';
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  const scheduler = new ZiSyncSchedulerService(
    persistService,
    catalogoZiService,
    configService,
  );

  return { scheduler, persistService, catalogoZiService };
}

describe('ZiSyncSchedulerService', () => {
  it('ZI_SYNC_ENABLED=false -> syncProductos no ejecuta nada', async () => {
    const { scheduler, persistService } = createScheduler(false);

    await scheduler.syncProductos();

    expect(persistService.persistDeltaSync).not.toHaveBeenCalled();
  });

  it('running=true -> syncProductos retorna sin ejecutar', async () => {
    const { scheduler, persistService } = createScheduler(true);
    (scheduler as unknown as { running: boolean }).running = true;

    await scheduler.syncProductos();

    expect(persistService.persistDeltaSync).not.toHaveBeenCalled();
  });

  it('runFullSync con running=true -> ConflictException', async () => {
    const { scheduler } = createScheduler(true);
    (scheduler as unknown as { running: boolean }).running = true;

    await expect(scheduler.runFullSync()).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('runFullSync exitoso -> running=false al terminar', async () => {
    const { scheduler, persistService } = createScheduler(true);
    persistService.persistDeltaSync.mockResolvedValue({
      total: 1,
      productosActualizados: 1,
      preciosActualizados: 0,
      stockActualizados: 0,
      errores: 0,
    });

    const result = await scheduler.runFullSync();

    expect(result).toEqual({
      total: 1,
      productosActualizados: 1,
      preciosActualizados: 0,
      stockActualizados: 0,
      errores: 0,
    });
    expect((scheduler as unknown as { running: boolean }).running).toBe(false);
  });
});
