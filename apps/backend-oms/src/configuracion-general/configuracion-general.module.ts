import { Module } from '@nestjs/common';
import { ConfiguracionGeneralController } from './configuracion-general.controller';
import { ConfiguracionGeneralService } from './configuracion-general.service';
import { CiudadModule } from './ciudad/ciudad.module';
import { EmpresaModule } from './empresa/empresa.module';
import { MonedaModule } from './moneda/moneda.module';
import { PaisModule } from './pais/pais.module';

@Module({
  imports: [CiudadModule, PaisModule, MonedaModule, EmpresaModule],
  controllers: [ConfiguracionGeneralController],
  providers: [ConfiguracionGeneralService],
  exports: [ConfiguracionGeneralService],
})
export class ConfiguracionGeneralModule {}
