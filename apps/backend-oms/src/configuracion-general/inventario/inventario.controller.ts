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
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';
import { InventarioService } from './inventario.service';

@Controller('configuracion-general/inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const inventarios = await this.inventarioService.listInventarios();
    return { inventarios };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.inventarioService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const inventario = await this.inventarioService.getInventarioById(id);
    return { inventario };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateInventarioDto) {
    const result = await this.inventarioService.createInventario(body);
    return {
      success: true,
      inventarioId: result.inventarioId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInventarioDto,
  ): Promise<{ success: true }> {
    await this.inventarioService.updateInventario(id, body);
    return { success: true };
  }
}
