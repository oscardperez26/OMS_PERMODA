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
import { CreateZonaTransporteDto } from './dto/create-zona-transporte.dto';
import { UpdateZonaTransporteDto } from './dto/update-zona-transporte.dto';
import { ZonaTransporteService } from './zona-transporte.service';

@Controller('configuracion-general/zona-transporte')
export class ZonaTransporteController {
  constructor(private readonly zonaTransporteService: ZonaTransporteService) {}

  @Get()
  @Permissions('config.read')
  async list() {
    const zonasTransporte =
      await this.zonaTransporteService.listZonasTransporte();
    return { zonasTransporte };
  }

  @Get('bootstrap')
  @Permissions('config.read')
  async bootstrap() {
    return this.zonaTransporteService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const zonaTransporte =
      await this.zonaTransporteService.getZonaTransporteById(id);
    return { zonaTransporte };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateZonaTransporteDto) {
    const result = await this.zonaTransporteService.createZonaTransporte(body);
    return {
      success: true,
      zonaTransporteId: result.zonaTransporteId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateZonaTransporteDto,
  ): Promise<{ success: true }> {
    await this.zonaTransporteService.updateZonaTransporte(id, body);
    return { success: true };
  }
}
