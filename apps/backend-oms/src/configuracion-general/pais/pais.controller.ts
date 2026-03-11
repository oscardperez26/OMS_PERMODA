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
import { CreatePaisDto } from './dto/create-pais.dto';
import { UpdatePaisDto } from './dto/update-pais.dto';
import { PaisService } from './pais.service';

@Controller('configuracion-general/pais')
export class PaisController {
  constructor(private readonly paisService: PaisService) {}

  @Get()
  @Permissions('config.read')
  async list() {
    const paises = await this.paisService.listPaises();
    return { paises };
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const pais = await this.paisService.getPaisById(id);
    return { pais };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreatePaisDto) {
    const result = await this.paisService.createPais(body);
    return {
      success: true,
      paisId: result.paisId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaisDto,
  ): Promise<{ success: true }> {
    await this.paisService.updatePais(id, body);
    return { success: true };
  }
}
