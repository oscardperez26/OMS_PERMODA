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
import { TransportadoraApiConfigResponseDto } from './dto/transportadora-api-config-response.dto';
import { CreateTransportadoraDto } from './dto/create-transportadora.dto';
import { TransportadoraConfiguracionResponseDto } from './dto/transportadora-configuracion-response.dto';
import { UpdateTransportadoraApiConfigDto } from './dto/update-transportadora-api-config.dto';
import { UpdateTransportadoraConfiguracionDto } from './dto/update-transportadora-configuracion.dto';
import { UpdateTransportadoraDto } from './dto/update-transportadora.dto';
import { TransportadoraService } from './transportadora.service';

@Controller('configuracion-general/transportadora')
export class TransportadoraController {
  constructor(private readonly transportadoraService: TransportadoraService) {}

  @Get()
  @Permissions('config.read')
  async list() {
    const transportadoras =
      await this.transportadoraService.listTransportadoras();
    return { transportadoras };
  }

  @Get('bootstrap')
  @Permissions('config.read')
  async bootstrap() {
    return this.transportadoraService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const transportadora =
      await this.transportadoraService.getTransportadoraById(id);
    return { transportadora };
  }

  @Get(':id/api-config')
  @Permissions('config.read')
  async getApiConfig(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TransportadoraApiConfigResponseDto> {
    return this.transportadoraService.getTransportadoraApiConfigById(id);
  }

  @Get(':id/configuracion')
  @Permissions('config.read')
  async getConfiguracion(
    @Param('id', ParseIntPipe) id: number,
    @Query('zonaSeleccionadaId') zonaSeleccionadaId?: string,
  ): Promise<TransportadoraConfiguracionResponseDto> {
    const zonaId =
      zonaSeleccionadaId !== undefined && zonaSeleccionadaId.trim() !== ''
        ? Number(zonaSeleccionadaId)
        : undefined;

    return this.transportadoraService.getTransportadoraConfiguracionById(
      id,
      zonaId,
    );
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateTransportadoraDto) {
    const result = await this.transportadoraService.createTransportadora(body);
    return {
      success: true,
      transportadoraId: result.transportadoraId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransportadoraDto,
  ): Promise<{ success: true }> {
    await this.transportadoraService.updateTransportadora(id, body);
    return { success: true };
  }

  @Patch(':id/configuracion')
  @Permissions('config.manage')
  async updateConfiguracion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransportadoraConfiguracionDto,
  ): Promise<{ success: true }> {
    await this.transportadoraService.updateTransportadoraConfiguracion(
      id,
      body,
    );
    return { success: true };
  }

  @Patch(':id/api-config')
  @Permissions('config.manage')
  async updateApiConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransportadoraApiConfigDto,
  ): Promise<{ success: true }> {
    await this.transportadoraService.updateTransportadoraApiConfig(id, body);
    return { success: true };
  }
}
