import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Permissions } from '../../auth/auth.decorators';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductoService } from './producto.service';

@Controller('configuracion-general/producto')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Get()
  @Permissions('orders.read')
  async list(@Query('search') search?: string) {
    const productos = await this.productoService.listProductos(search);
    return { productos };
  }

  @Get('bootstrap')
  @Permissions('orders.read')
  async bootstrap() {
    return this.productoService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('orders.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const producto = await this.productoService.getProductoById(id);
    return { producto };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateProductoDto) {
    const result = await this.productoService.createProducto(body);
    return {
      success: true,
      productoId: result.productoId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductoDto,
  ): Promise<{ success: true }> {
    await this.productoService.updateProducto(id, body);
    return { success: true };
  }
}
