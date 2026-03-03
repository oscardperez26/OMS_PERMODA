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
import { CreateTiendaDto } from './dto/create-tienda.dto';
import { UpdateTiendaDto } from './dto/update-tienda.dto';
import { TiendaService } from './tienda.service';

@Controller('configuracion-general/tienda')
export class TiendaController {
  constructor(private readonly tiendaService: TiendaService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const tiendas = await this.tiendaService.listTiendas();
    return { tiendas };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.tiendaService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const tienda = await this.tiendaService.getTiendaById(id);
    return { tienda };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateTiendaDto) {
    const result = await this.tiendaService.createTienda(body);
    return {
      success: true,
      tiendaId: result.tiendaId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTiendaDto,
  ): Promise<{ success: true }> {
    await this.tiendaService.updateTienda(id, body);
    return { success: true };
  }
}
