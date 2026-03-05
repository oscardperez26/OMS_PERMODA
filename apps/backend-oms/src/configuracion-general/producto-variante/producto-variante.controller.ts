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
import { CreateProductoVarianteDto } from './dto/create-producto-variante.dto';
import { UpdateProductoVarianteDto } from './dto/update-producto-variante.dto';
import { ProductoVarianteService } from './producto-variante.service';

@Controller('configuracion-general/producto-variante')
export class ProductoVarianteController {
  constructor(
    private readonly productoVarianteService: ProductoVarianteService,
  ) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const variantes = await this.productoVarianteService.listVariantes();
    return { variantes };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.productoVarianteService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const variante = await this.productoVarianteService.getVarianteById(id);
    return { variante };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateProductoVarianteDto) {
    const result = await this.productoVarianteService.createVariante(body);
    return {
      success: true,
      varianteId: result.varianteId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductoVarianteDto,
  ): Promise<{ success: true }> {
    await this.productoVarianteService.updateVariante(id, body);
    return { success: true };
  }
}
