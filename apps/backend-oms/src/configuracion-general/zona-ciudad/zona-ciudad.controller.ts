import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Permissions } from '../../auth/auth.decorators';
import { CreateZonaCiudadDto } from './dto/create-zona-ciudad.dto';
import { UpdateZonaCiudadDto } from './dto/update-zona-ciudad.dto';
import { ZonaCiudadService } from './zona-ciudad.service';

@Controller('configuracion-general/zona-ciudad')
export class ZonaCiudadController {
  constructor(private readonly zonaCiudadService: ZonaCiudadService) {}

  @Get()
  @Permissions('config.read')
  async list() {
    const zonasCiudad = await this.zonaCiudadService.listZonasCiudad();
    return { zonasCiudad };
  }

  @Get('bootstrap')
  @Permissions('config.read')
  async bootstrap() {
    return this.zonaCiudadService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id') id: string) {
    const parsed = this.parseCompositeId(id);
    const zonaCiudad = await this.zonaCiudadService.getZonaCiudadById(
      parsed.zonaTransporteId,
      parsed.ciudadId,
    );
    return { zonaCiudad };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateZonaCiudadDto) {
    await this.zonaCiudadService.createZonaCiudad(body);
    return { success: true };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateZonaCiudadDto,
  ): Promise<{ success: true }> {
    const parsed = this.parseCompositeId(id);
    await this.zonaCiudadService.updateZonaCiudad(
      parsed.zonaTransporteId,
      parsed.ciudadId,
      body,
    );
    return { success: true };
  }

  private parseCompositeId(id: string): { zonaTransporteId: number; ciudadId: number } {
    const parts = id.split(':');
    if (parts.length !== 2) {
      throw new BadRequestException(
        'El id debe tener formato zonaTransporteId:ciudadId',
      );
    }

    const zonaTransporteId = Number(parts[0]);
    const ciudadId = Number(parts[1]);

    if (!Number.isInteger(zonaTransporteId) || zonaTransporteId <= 0) {
      throw new BadRequestException('ZonaTransporteId invalido en id compuesto');
    }
    if (!Number.isInteger(ciudadId) || ciudadId <= 0) {
      throw new BadRequestException('CiudadId invalido en id compuesto');
    }

    return { zonaTransporteId, ciudadId };
  }
}
