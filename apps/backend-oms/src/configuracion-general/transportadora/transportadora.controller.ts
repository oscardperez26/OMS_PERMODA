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
import { CreateTransportadoraDto } from './dto/create-transportadora.dto';
import { UpdateTransportadoraDto } from './dto/update-transportadora.dto';
import { TransportadoraService } from './transportadora.service';

@Controller('configuracion-general/transportadora')
export class TransportadoraController {
  constructor(private readonly transportadoraService: TransportadoraService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const transportadoras = await this.transportadoraService.listTransportadoras();
    return { transportadoras };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.transportadoraService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const transportadora = await this.transportadoraService.getTransportadoraById(id);
    return { transportadora };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateTransportadoraDto) {
    const result = await this.transportadoraService.createTransportadora(body);
    return {
      success: true,
      transportadoraId: result.transportadoraId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransportadoraDto,
  ): Promise<{ success: true }> {
    await this.transportadoraService.updateTransportadora(id, body);
    return { success: true };
  }
}
