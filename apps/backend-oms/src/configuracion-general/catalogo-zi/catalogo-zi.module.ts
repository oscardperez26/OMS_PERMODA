import { Module } from '@nestjs/common';
import { ZiTokenManagerService } from './auth/zi-token-manager.service';
import { CatalogoZiController } from './catalogo-zi.controller';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiApiClientService } from './client/zi-api-client.service';
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
  ],
  exports: [CatalogoZiService, ZiPersistService],
})
export class CatalogoZiModule {}
