import { Module } from '@nestjs/common';
import { ProductoController } from './producto.controller';
import { ProductoRepository } from './producto.repository';
import { ProductoService } from './producto.service';

@Module({
  controllers: [ProductoController],
  providers: [ProductoService, ProductoRepository],
  exports: [ProductoService, ProductoRepository],
})
export class ProductoModule {}
