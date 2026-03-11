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
import { CreateCiudadDto } from './dto/create-ciudad.dto';
import { UpdateCiudadDto } from './dto/update-ciudad.dto';
import { CiudadService } from './ciudad.service';

@Controller('configuracion-general/ciudad')
export class CiudadController {
  constructor(private readonly ciudadService: CiudadService) {}

  @Get()
  @Permissions('config.read')
  async list() {
    const ciudades = await this.ciudadService.listCiudades();
    return { ciudades };
  }

  @Get('bootstrap')
  @Permissions('config.read')
  async bootstrap() {
    return this.ciudadService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const ciudad = await this.ciudadService.getCiudadById(id);
    return { ciudad };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateCiudadDto) {
    const result = await this.ciudadService.createCiudad(body);
    return {
      success: true,
      ciudadId: result.ciudadId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCiudadDto,
  ): Promise<{ success: true }> {
    await this.ciudadService.updateCiudad(id, body);
    return { success: true };
  }
}
