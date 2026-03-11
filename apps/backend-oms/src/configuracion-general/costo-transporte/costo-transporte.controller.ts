import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../auth/auth.decorators';
import { CreateCostoTransporteDto } from './dto/create-costo-transporte.dto';
import { UpdateCostoTransporteDto } from './dto/update-costo-transporte.dto';
import { CostoTransporteService } from './costo-transporte.service';

@Controller('configuracion-general/costo-transporte')
export class CostoTransporteController {
  constructor(private readonly costoTransporteService: CostoTransporteService) {}

  @Get()
  @Permissions('config.read')
  async list() {
    const costosTransporte = await this.costoTransporteService.listCostosTransporte();
    return { costosTransporte };
  }

  @Get('bootstrap')
  @Permissions('config.read')
  async bootstrap() {
    return this.costoTransporteService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id') id: string) {
    const costoTransporte = await this.costoTransporteService.getCostoTransporteById(id);
    return { costoTransporte };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateCostoTransporteDto) {
    const result = await this.costoTransporteService.createCostoTransporte(body);
    return {
      success: true,
      costoTransporteId: result.costoTransporteId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCostoTransporteDto,
  ): Promise<{ success: true }> {
    await this.costoTransporteService.updateCostoTransporte(id, body);
    return { success: true };
  }
}
