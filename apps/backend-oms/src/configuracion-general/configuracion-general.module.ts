import { Module } from '@nestjs/common';
import { ConfiguracionGeneralController } from './configuracion-general.controller';
import { ConfiguracionGeneralRepository } from './configuracion-general.repository';
import { ConfiguracionGeneralService } from './configuracion-general.service';
import { CiudadModule } from './ciudad/ciudad.module';
import { CostoTransporteModule } from './costo-transporte/costo-transporte.module';
import { BodegaModule } from './bodega/bodega.module';
import { EmpresaModule } from './empresa/empresa.module';
import { EmpresaClienteModule } from './empresa-cliente/empresa-cliente.module';
import { InventarioModule } from './inventario/inventario.module';
import { MonedaModule } from './moneda/moneda.module';
import { PasarelaPagoModule } from './pasarela-pago/pasarela-pago.module';
import { PaisModule } from './pais/pais.module';
import { ProductoModule } from './producto/producto.module';
import { ProductoVarianteModule } from './producto-variante/producto-variante.module';
import { TiendaModule } from './tienda/tienda.module';
import { TransportadoraModule } from './transportadora/transportadora.module';
import { ZonaCiudadModule } from './zona-ciudad/zona-ciudad.module';
import { ZonaTransporteModule } from './zona-transporte/zona-transporte.module';

@Module({
  imports: [
    CiudadModule,
    PaisModule,
    MonedaModule,
    EmpresaModule,
    EmpresaClienteModule,
    PasarelaPagoModule,
    TiendaModule,
    BodegaModule,
    ProductoModule,
    ProductoVarianteModule,
    InventarioModule,
    TransportadoraModule,
    ZonaTransporteModule,
    ZonaCiudadModule,
    CostoTransporteModule,
  ],
  controllers: [ConfiguracionGeneralController],
  providers: [ConfiguracionGeneralService, ConfiguracionGeneralRepository],
  exports: [ConfiguracionGeneralService],
})
export class ConfiguracionGeneralModule {}
