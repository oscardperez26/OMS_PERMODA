import { Module } from '@nestjs/common';
import { ZiTokenManagerService } from './auth/zi-token-manager.service';
import { ZiCatalogRepository } from './catalog/zi-catalog.repository';
import { ZiCatalogService } from './catalog/zi-catalog.service';
import { CatalogoZiController } from './catalogo-zi.controller';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiApiClientService } from './client/zi-api-client.service';
import { ZiOpsService } from './ops/zi-ops.service';
import { ZiSyncSchedulerService } from './scheduler/zi-sync.scheduler';
import { ZiSyncRepository } from './repository/zi-sync.repository';
import { ZiPersistService } from './zi-persist.service';

@Module({
  controllers: [CatalogoZiController],
  providers: [
    CatalogoZiService,
    ZiTokenManagerService,
    ZiApiClientService,
    ZiSyncSchedulerService,
    ZiPersistService,
    ZiSyncRepository,
    ZiOpsService,
    ZiCatalogService,
    ZiCatalogRepository,
  ],
  exports: [CatalogoZiService, ZiPersistService, ZiCatalogService],
})
export class CatalogoZiModule {}
