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
import { CreateMonedaDto } from './dto/create-moneda.dto';
import { UpdateMonedaDto } from './dto/update-moneda.dto';
import { MonedaService } from './moneda.service';

@Controller('configuracion-general/moneda')
export class MonedaController {
  constructor(private readonly monedaService: MonedaService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const monedas = await this.monedaService.listMonedas();
    return { monedas };
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const moneda = await this.monedaService.getMonedaById(id);
    return { moneda };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateMonedaDto) {
    const result = await this.monedaService.createMoneda(body);
    return {
      success: true,
      monedaId: result.monedaId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMonedaDto,
  ): Promise<{ success: true }> {
    await this.monedaService.updateMoneda(id, body);
    return { success: true };
  }
}
