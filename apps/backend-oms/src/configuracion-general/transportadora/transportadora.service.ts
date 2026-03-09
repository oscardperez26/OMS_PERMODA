import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TransportadoraRepository } from './transportadora.repository';
import type {
  TransportadoraBootstrapData,
  TransportadoraConfiguracionDetail,
  TransportadoraListItem,
  UpdateTransportadoraConfiguracionInput,
} from './transportadora.types';

type CreateTransportadoraParams = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate?: string;
  activo?: boolean;
};

type UpdateTransportadoraParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  trackingUrlTemplate?: string | null;
  activo?: boolean;
};

type UpdateTransportadoraConfiguracionParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  trackingUrlTemplate?: string | null;
  activo?: boolean;
  servicio?: string | null;
  permiteExpress?: boolean;
  moduloCode?: string | null;
  costeFijo?: number | null;
  distanciaFijaKm?: number | null;
  costeIncrementalKm?: number | null;
  tiendaIds?: number[];
};

@Injectable()
export class TransportadoraService {
  private readonly logger = new Logger(TransportadoraService.name);

  constructor(private readonly transportadoraRepository: TransportadoraRepository) {}

  async listTransportadoras(): Promise<TransportadoraListItem[]> {
    return this.transportadoraRepository.list();
  }

  async getBootstrapData(): Promise<TransportadoraBootstrapData> {
    return this.transportadoraRepository.listBootstrapData();
  }

  async getTransportadoraById(transportadoraId: number): Promise<TransportadoraListItem> {
    const transportadora = await this.transportadoraRepository.findById(transportadoraId);
    if (!transportadora) {
      throw new NotFoundException('Transportadora no existe');
    }
    return transportadora;
  }

  async getTransportadoraConfiguracionById(
    transportadoraId: number,
  ): Promise<TransportadoraConfiguracionDetail> {
    const detail = await this.transportadoraRepository.findConfiguracionById(transportadoraId);
    if (!detail) {
      throw new NotFoundException('Transportadora no existe');
    }
    return detail;
  }

  async createTransportadora(
    params: CreateTransportadoraParams,
  ): Promise<{ transportadoraId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 180);
    const trackingUrlTemplate = this.normalizeOptionalText(
      params.trackingUrlTemplate,
      'trackingUrlTemplate',
      255,
    );
    const activo = this.normalizeBoolean(params.activo, true);

    const duplicated = await this.transportadoraRepository.existsByEmpresaAndCodigo(
      empresaId,
      codigo,
    );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una transportadora con ese codigo en la empresa',
      );
    }

    await this.validateEmpresa(empresaId);

    try {
      return await this.transportadoraRepository.create({
        empresaId,
        codigo,
        nombre,
        trackingUrlTemplate,
        activo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una transportadora con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async updateTransportadora(
    transportadoraId: number,
    params: UpdateTransportadoraParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.trackingUrlTemplate !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.transportadoraRepository.findById(transportadoraId);
    if (!current) {
      throw new NotFoundException('Transportadora no existe');
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextCodigo =
      params.codigo !== undefined ? this.normalizeCodigo(params.codigo) : current.codigo;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 180)
        : current.nombre;
    const nextTrackingUrlTemplate =
      params.trackingUrlTemplate !== undefined
        ? this.normalizeOptionalText(
            params.trackingUrlTemplate,
            'trackingUrlTemplate',
            255,
          )
        : current.trackingUrlTemplate ?? null;
    const nextActivo =
      params.activo !== undefined ? this.normalizeBoolean(params.activo) : current.activo;

    const duplicated = await this.transportadoraRepository.existsByEmpresaAndCodigo(
      nextEmpresaId,
      nextCodigo,
      transportadoraId,
    );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una transportadora con ese codigo en la empresa',
      );
    }

    await this.validateEmpresa(nextEmpresaId);

    try {
      await this.transportadoraRepository.update(transportadoraId, {
        empresaId: nextEmpresaId,
        codigo: nextCodigo,
        nombre: nextNombre,
        trackingUrlTemplate: nextTrackingUrlTemplate,
        activo: nextActivo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una transportadora con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async updateTransportadoraConfiguracion(
    transportadoraId: number,
    params: UpdateTransportadoraConfiguracionParams,
  ): Promise<void> {
    const tiendaIdsFromRequest = params.tiendaIds;
    const hasTiendaIdsField = params.tiendaIds !== undefined;
    if (hasTiendaIdsField && !Array.isArray(tiendaIdsFromRequest)) {
      throw new BadRequestException('tiendaIds debe ser una lista de enteros');
    }

    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.trackingUrlTemplate !== undefined ||
      params.activo !== undefined ||
      params.servicio !== undefined ||
      params.permiteExpress !== undefined ||
      params.moduloCode !== undefined ||
      params.costeFijo !== undefined ||
      params.distanciaFijaKm !== undefined ||
      params.costeIncrementalKm !== undefined ||
      hasTiendaIdsField;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const detail = await this.transportadoraRepository.findConfiguracionById(transportadoraId);
    if (!detail) {
      throw new NotFoundException('Transportadora no existe');
    }

    const base = detail.transportadora;
    const config = detail.config;

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : base.empresaId;
    const nextCodigo =
      params.codigo !== undefined ? this.normalizeCodigo(params.codigo) : base.codigo;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 180)
        : base.nombre;
    const nextTrackingUrlTemplate =
      params.trackingUrlTemplate !== undefined
        ? this.normalizeOptionalText(
            params.trackingUrlTemplate,
            'trackingUrlTemplate',
            255,
          )
        : base.trackingUrlTemplate ?? null;
    const nextActivo =
      params.activo !== undefined ? this.normalizeBoolean(params.activo) : base.activo;

    const nextServicio =
      params.servicio !== undefined
        ? this.normalizeOptionalText(params.servicio, 'servicio', 120)
        : config.servicio ?? null;
    const nextPermiteExpress =
      params.permiteExpress !== undefined
        ? this.normalizeBoolean(params.permiteExpress)
        : config.permiteExpress;
    const nextModuloCode =
      params.moduloCode !== undefined
        ? this.normalizeOptionalText(params.moduloCode, 'moduloCode', 120)
        : config.moduloCode ?? null;
    const nextCosteFijo =
      params.costeFijo !== undefined
        ? this.normalizeOptionalDecimal(params.costeFijo, 'costeFijo')
        : config.costeFijo ?? null;
    const nextDistanciaFijaKm =
      params.distanciaFijaKm !== undefined
        ? this.normalizeOptionalDecimal(params.distanciaFijaKm, 'distanciaFijaKm')
        : config.distanciaFijaKm ?? null;
    const nextCosteIncrementalKm =
      params.costeIncrementalKm !== undefined
        ? this.normalizeOptionalDecimal(params.costeIncrementalKm, 'costeIncrementalKm')
        : config.costeIncrementalKm ?? null;

    const nextTiendaIds = hasTiendaIdsField
      ? this.normalizeTiendaIds(tiendaIdsFromRequest as number[])
      : detail.tiendasSeleccionadas.map((item) => item.tiendaId);

    const duplicated = await this.transportadoraRepository.existsByEmpresaAndCodigo(
      nextEmpresaId,
      nextCodigo,
      transportadoraId,
    );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una transportadora con ese codigo en la empresa',
      );
    }

    await this.validateEmpresa(nextEmpresaId);
    await this.validateTiendas(nextTiendaIds, nextEmpresaId);

    const input: UpdateTransportadoraConfiguracionInput = {
      empresaId: nextEmpresaId,
      codigo: nextCodigo,
      nombre: nextNombre,
      trackingUrlTemplate: nextTrackingUrlTemplate,
      activo: nextActivo,
      servicio: nextServicio,
      permiteExpress: nextPermiteExpress,
      moduloCode: nextModuloCode,
      costeFijo: nextCosteFijo,
      distanciaFijaKm: nextDistanciaFijaKm,
      costeIncrementalKm: nextCosteIncrementalKm,
      tiendaIds: nextTiendaIds,
    };

    try {
      await this.transportadoraRepository.updateConfiguracion(transportadoraId, input);
      this.logger.log(
        `Transportadora ${transportadoraId} actualizada: empresa=${nextEmpresaId}, tiendas=${nextTiendaIds.length}`,
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una transportadora con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  private async validateEmpresa(empresaId: number): Promise<void> {
    const empresaExists = await this.transportadoraRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }
  }

  private async validateTiendas(tiendaIds: number[], empresaId: number): Promise<void> {
    if (tiendaIds.length === 0) {
      return;
    }

    const tiendas = await this.transportadoraRepository.findTiendasByIds(tiendaIds);
    if (tiendas.length !== tiendaIds.length) {
      throw new BadRequestException('Una o mas tiendas no existen');
    }

    const mismatched = tiendas.find((item) => item.empresaId !== empresaId);
    if (mismatched) {
      throw new BadRequestException(
        'Todas las tiendas deben pertenecer a la misma empresa de la transportadora',
      );
    }
  }

  private normalizeCodigo(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('El campo codigo no puede estar vacio');
    }
    if (normalized.length > 60) {
      throw new BadRequestException('El campo codigo no puede exceder 60 caracteres');
    }
    return normalized;
  }

  private normalizeRequiredText(
    value: string,
    fieldName: string,
    maxLength: number,
  ): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`El campo ${fieldName} no puede estar vacio`);
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede exceder ${maxLength} caracteres`,
      );
    }
    return normalized;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
    fieldName: string,
    maxLength: number,
  ): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede exceder ${maxLength} caracteres`,
      );
    }
    return normalized;
  }

  private normalizeRequiredId(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un entero mayor a 0`);
    }
    return value;
  }

  private normalizeBoolean(value: boolean | undefined, fallback?: boolean): boolean {
    if (value === undefined) {
      if (fallback === undefined) {
        throw new BadRequestException('Valor booleano no enviado');
      }
      return fallback;
    }
    return value;
  }

  private normalizeOptionalDecimal(
    value: number | null | undefined,
    fieldName: string,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un numero >= 0`);
    }
    return value;
  }

  private normalizeTiendaIds(values: number[]): number[] {
    const ids = [...new Set(values)];
    const invalid = ids.find((value) => !Number.isInteger(value) || value <= 0);
    if (invalid !== undefined) {
      throw new BadRequestException('Cada tiendaId debe ser un entero mayor a 0');
    }
    return ids;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as {
      number?: number;
      originalError?: { info?: { number?: number }; number?: number };
      precedingErrors?: Array<{ number?: number }>;
    };

    const numbers = [
      maybeError.number,
      maybeError.originalError?.number,
      maybeError.originalError?.info?.number,
      ...(maybeError.precedingErrors?.map((item) => item.number) ?? []),
    ].filter((value): value is number => typeof value === 'number');

    return numbers.includes(2601) || numbers.includes(2627);
  }
}
