import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../../auth/auth.decorators';
import type { SafeUser } from '../../auth/auth.types';
import { CreateEmpresaClienteDto } from './dto/create-empresa-cliente.dto';
import { UpdateEmpresaClienteDto } from './dto/update-empresa-cliente.dto';
import { EmpresaClienteService } from './empresa-cliente.service';

type RequestWithUser = Request & {
  user?: SafeUser;
};

@Controller('configuracion-general/empresa-cliente')
export class EmpresaClienteController {
  constructor(private readonly empresaClienteService: EmpresaClienteService) {}

  @Get()
  @Permissions('catalog.read')
  async list(@Req() req: RequestWithUser) {
    const scopedEmpresaClienteId = this.parseScopedEmpresaClienteId(req.user);
    const empresaClientes =
      await this.empresaClienteService.listEmpresaClientes(
        scopedEmpresaClienteId,
      );
    return { empresaClientes };
  }

  @Get('bootstrap')
  @Permissions('catalog.read')
  async bootstrap(@Req() req: RequestWithUser) {
    const scopedEmpresaClienteId = this.parseScopedEmpresaClienteId(req.user);
    return this.empresaClienteService.getBootstrapData(scopedEmpresaClienteId);
  }

  @Get(':id')
  @Permissions('catalog.read')
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    this.assertScopedAccess(this.parseScopedEmpresaClienteId(req.user), id);
    const empresaCliente =
      await this.empresaClienteService.getEmpresaClienteById(id);
    return { empresaCliente };
  }

  @Post()
  @Permissions('catalog.manage')
  async create(@Body() body: CreateEmpresaClienteDto, @Req() req: RequestWithUser) {
    if (this.parseScopedEmpresaClienteId(req.user) !== null) {
      throw new ForbiddenException(
        'No tienes permisos para crear nuevas franquicias',
      );
    }

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
    @Req() req: RequestWithUser,
  ): Promise<{ success: true }> {
    this.assertScopedAccess(this.parseScopedEmpresaClienteId(req.user), id);
    await this.empresaClienteService.updateEmpresaCliente(id, body);
    return { success: true };
  }

  private parseScopedEmpresaClienteId(user?: SafeUser): number | null {
    const rawValue = user?.empresaClienteId;
    if (rawValue === undefined) {
      return null;
    }

    const normalizedValue = rawValue.trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      throw new ForbiddenException('Contexto de franquicia invalido');
    }

    return parsedValue;
  }

  private assertScopedAccess(
    scopedEmpresaClienteId: number | null,
    targetEmpresaClienteId: number,
  ): void {
    if (scopedEmpresaClienteId === null) {
      return;
    }

    if (scopedEmpresaClienteId !== targetEmpresaClienteId) {
      throw new ForbiddenException(
        'No tienes permisos para ver o editar otra franquicia',
      );
    }
  }
}
