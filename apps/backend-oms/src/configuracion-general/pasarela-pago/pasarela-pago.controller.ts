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
import { CreatePasarelaPagoDto } from './dto/create-pasarela-pago.dto';
import { UpdatePasarelaPagoDto } from './dto/update-pasarela-pago.dto';
import { PasarelaPagoService } from './pasarela-pago.service';

@Controller('configuracion-general/pasarela-pago')
export class PasarelaPagoController {
  constructor(private readonly pasarelaPagoService: PasarelaPagoService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const pasarelasPago = await this.pasarelaPagoService.listPasarelasPago();
    return { pasarelasPago };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.pasarelaPagoService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const pasarelaPago = await this.pasarelaPagoService.getPasarelaPagoById(id);
    return { pasarelaPago };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreatePasarelaPagoDto) {
    const result = await this.pasarelaPagoService.createPasarelaPago(body);
    return {
      success: true,
      pasarelaPagoId: result.pasarelaPagoId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePasarelaPagoDto,
  ): Promise<{ success: true }> {
    await this.pasarelaPagoService.updatePasarelaPago(id, body);
    return { success: true };
  }
}
