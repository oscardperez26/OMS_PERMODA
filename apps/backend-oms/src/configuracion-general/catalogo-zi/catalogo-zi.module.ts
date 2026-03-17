import { Module } from '@nestjs/common';
import { ZiTokenManagerService } from './auth/zi-token-manager.service';
import { CatalogoZiController } from './catalogo-zi.controller';
import { CatalogoZiService } from './catalogo-zi.service';
import { ZiApiClientService } from './client/zi-api-client.service';
import { ZiSyncSchedulerService } from './scheduler/zi-sync.scheduler';

@Module({
  controllers: [CatalogoZiController],
  providers: [
    CatalogoZiService,
    ZiTokenManagerService,
    ZiApiClientService,
    ZiSyncSchedulerService,
  ],
  exports: [CatalogoZiService],
})
export class CatalogoZiModule {}
