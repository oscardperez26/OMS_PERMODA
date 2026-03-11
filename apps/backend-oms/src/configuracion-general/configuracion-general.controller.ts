import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../auth/auth.decorators';
import { ConfiguracionGeneralService } from './configuracion-general.service';

@Controller('configuracion-general')
export class ConfiguracionGeneralController {
  constructor(
    private readonly configuracionGeneralService: ConfiguracionGeneralService,
  ) {}

  @Get('options')
  @Permissions('config.read')
  listOptions() {
    const options = this.configuracionGeneralService.listOptions();
    return { options };
  }
}
