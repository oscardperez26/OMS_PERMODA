import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../../auth/auth.decorators';
import type { SafeUser } from '../../auth/auth.types';
import { CreateIntegracionEntranteDto } from './dto/create-integracion-entrante.dto';
import { SyncIntegracionEntranteDto } from './dto/sync-integracion-entrante.dto';
import { UpdateIntegracionEntranteDto } from './dto/update-integracion-entrante.dto';
import { IntegracionesEntrantesService } from './integraciones-entrantes.service';

type RequestWithUser = Request & {
  user?: SafeUser;
};

@Controller('configuracion-general/integraciones/entrantes')
export class IntegracionesEntrantesController {
  constructor(
    private readonly integracionesEntrantesService: IntegracionesEntrantesService,
  ) {}

  @Get()
  @Permissions('config.read')
  async list() {
    return this.integracionesEntrantesService.listBootstrap();
  }

  @Get(':id')
  @Permissions('config.read')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const integracionEntrante = await this.integracionesEntrantesService.getById(
      id,
    );
    return { integracionEntrante };
  }

  @Get(':id/runs')
  @Permissions('config.read')
  async listRuns(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limitRaw?: string,
  ) {
    const parsedLimit = Number(limitRaw);
    const runs = await this.integracionesEntrantesService.listRuns(
      id,
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : undefined,
    );
    return { runs };
  }

  @Post()
  @Permissions('config.manage')
  async create(@Body() body: CreateIntegracionEntranteDto) {
    const result = await this.integracionesEntrantesService.create(body);
    return {
      success: true,
      integracionId: result.integracionId,
    };
  }

  @Patch(':id')
  @Permissions('config.manage')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateIntegracionEntranteDto,
  ): Promise<{ success: true }> {
    await this.integracionesEntrantesService.update(id, body);
    return { success: true };
  }

  @Post(':id/validate')
  @Permissions('config.manage')
  async validate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const validation = await this.integracionesEntrantesService.validate(
      id,
      this.mapActor(req),
    );
    return {
      success: true,
      validation,
    };
  }

  @Post(':id/sync-now')
  @Permissions('config.manage')
  async syncNow(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SyncIntegracionEntranteDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.integracionesEntrantesService.syncNow(id, {
      limit: body.limit,
    }, this.mapActor(req));
    return {
      success: true,
      result,
    };
  }

  private mapActor(req: RequestWithUser): {
    userId: number | null;
    username: string | null;
  } {
    const userId = this.parseUserId(req.user?.id);
    const username = req.user?.username?.trim() || null;
    return { userId, username };
  }

  private parseUserId(rawValue: string | undefined): number | null {
    if (!rawValue) {
      return null;
    }
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }
}
