import { Module } from '@nestjs/common';
import { ProductoVarianteController } from './producto-variante.controller';
import { ProductoVarianteRepository } from './producto-variante.repository';
import { ProductoVarianteService } from './producto-variante.service';

@Module({
  controllers: [ProductoVarianteController],
  providers: [ProductoVarianteService, ProductoVarianteRepository],
  exports: [ProductoVarianteService],
})
export class ProductoVarianteModule {}
