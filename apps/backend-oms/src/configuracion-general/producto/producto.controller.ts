import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Permissions } from '../../auth/auth.decorators';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductoService } from './producto.service';

@Controller('configuracion-general/producto')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const productos = await this.productoService.listProductos();
    return { productos };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.productoService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const producto = await this.productoService.getProductoById(id);
    return { producto };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateProductoDto) {
    const result = await this.productoService.createProducto(body);
    return {
      success: true,
      productoId: result.productoId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductoDto,
  ): Promise<{ success: true }> {
    await this.productoService.updateProducto(id, body);
    return { success: true };
  }
}
