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
import { CreateBodegaDto } from './dto/create-bodega.dto';
import { UpdateBodegaDto } from './dto/update-bodega.dto';
import { BodegaService } from './bodega.service';

@Controller('configuracion-general/bodega')
export class BodegaController {
  constructor(private readonly bodegaService: BodegaService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const bodegas = await this.bodegaService.listBodegas();
    return { bodegas };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.bodegaService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const bodega = await this.bodegaService.getBodegaById(id);
    return { bodega };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateBodegaDto) {
    const result = await this.bodegaService.createBodega(body);
    return {
      success: true,
      bodegaId: result.bodegaId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBodegaDto,
  ): Promise<{ success: true }> {
    await this.bodegaService.updateBodega(id, body);
    return { success: true };
  }
}
