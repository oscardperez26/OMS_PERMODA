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
import { CreateEmpresaClienteDto } from './dto/create-empresa-cliente.dto';
import { UpdateEmpresaClienteDto } from './dto/update-empresa-cliente.dto';
import { EmpresaClienteService } from './empresa-cliente.service';

@Controller('configuracion-general/empresa-cliente')
export class EmpresaClienteController {
  constructor(private readonly empresaClienteService: EmpresaClienteService) {}

  @Get()
  @Permissions('catalog.read')
  async list() {
    const empresaClientes = await this.empresaClienteService.listEmpresaClientes();
    return { empresaClientes };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap() {
    return this.empresaClienteService.getBootstrapData();
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const empresaCliente = await this.empresaClienteService.getEmpresaClienteById(id);
    return { empresaCliente };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateEmpresaClienteDto) {
    const result = await this.empresaClienteService.createEmpresaCliente(body);
    return {
      success: true,
      empresaClienteId: result.empresaClienteId,
    };
  }

  @Patch(':id')
  @Permissions('catalog.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateEmpresaClienteDto,
  ): Promise<{ success: true }> {
    await this.empresaClienteService.updateEmpresaCliente(id, body);
    return { success: true };
  }
}
