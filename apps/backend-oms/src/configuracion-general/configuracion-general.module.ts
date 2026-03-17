import { Module } from '@nestjs/common';
import { BodegaModule } from './bodega/bodega.module';
import { CatalogoZiModule } from './catalogo-zi/catalogo-zi.module';
import { CiudadModule } from './ciudad/ciudad.module';
import { ConfiguracionGeneralController } from './configuracion-general.controller';
import { ConfiguracionGeneralRepository } from './configuracion-general.repository';
import { ConfiguracionGeneralService } from './configuracion-general.service';
import { CostoTransporteModule } from './costo-transporte/costo-transporte.module';
import { EmpresaClienteModule } from './empresa-cliente/empresa-cliente.module';
import { EmpresaModule } from './empresa/empresa.module';
import { IntegracionesEntrantesModule } from './integraciones-entrantes/integraciones-entrantes.module';
import { InventarioModule } from './inventario/inventario.module';
import { MonedaModule } from './moneda/moneda.module';
import { PaisModule } from './pais/pais.module';
import { PasarelaPagoModule } from './pasarela-pago/pasarela-pago.module';
import { ProductoModule } from './producto/producto.module';
import { ProductoVarianteModule } from './producto-variante/producto-variante.module';
import { TiendaModule } from './tienda/tienda.module';
import { TransportadoraModule } from './transportadora/transportadora.module';
import { ZonaCiudadModule } from './zona-ciudad/zona-ciudad.module';
import { ZonaTransporteModule } from './zona-transporte/zona-transporte.module';

@Module({
  imports: [
    BodegaModule,
    CatalogoZiModule,
    CiudadModule,
    CostoTransporteModule,
    EmpresaModule,
    EmpresaClienteModule,
    IntegracionesEntrantesModule,
    InventarioModule,
    MonedaModule,
    PaisModule,
    PasarelaPagoModule,
    ProductoModule,
    ProductoVarianteModule,
    TiendaModule,
    TransportadoraModule,
    ZonaCiudadModule,
    ZonaTransporteModule,
  ],
  controllers: [ConfiguracionGeneralController],
  providers: [ConfiguracionGeneralService, ConfiguracionGeneralRepository],
  exports: [ConfiguracionGeneralService],
})
export class ConfiguracionGeneralModule {}
