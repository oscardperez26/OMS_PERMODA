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
  @Permissions('catalog.read')
  async list() {
    const empresas = await this.empresaService.listEmpresas();
    return { empresas };
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const empresa = await this.empresaService.getEmpresaById(id);
    return { empresa };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateEmpresaDto) {
    const result = await this.empresaService.createEmpresa(body);
    return {
      success: true,
      empresaId: result.empresaId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateEmpresaDto,
  ): Promise<{ success: true }> {
    await this.empresaService.updateEmpresa(id, body);
    return { success: true };
  }
}
