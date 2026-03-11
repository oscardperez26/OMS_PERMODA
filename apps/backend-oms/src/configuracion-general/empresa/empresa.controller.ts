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
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresaService } from './empresa.service';

@Controller('configuracion-general/empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Get()
  @Permissions('config.read')
  async list() {
    const empresas = await this.empresaService.listEmpresas();
    return { empresas };
  }

  @Get('bootstrap')
  @Permissions('config.read')
  async bootstrap() {
    return this.empresaService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const empresa = await this.empresaService.getEmpresaById(id);
    return { empresa };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateEmpresaDto) {
    const result = await this.empresaService.createEmpresa(body);
    return {
      success: true,
      empresaId: result.empresaId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateEmpresaDto,
  ): Promise<{ success: true }> {
    await this.empresaService.updateEmpresa(id, body);
    return { success: true };
  }
}
