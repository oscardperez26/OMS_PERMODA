import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CostoTransporteRepository } from './costo-transporte.repository';
import type {
  CostoTransporteBootstrapData,
  CostoTransporteListItem,
  CostoTransporteRangeCandidate,
} from './costo-transporte.types';

type CreateCostoTransporteParams = {
  empresaId: number;
  zonaTransporteId: number;
  transportadoraId: number;
  monedaId: number;
  pesoMinKg?: number;
  pesoMaxKg?: number;
  valorMin?: number;
  valorMax?: number;
  costo: number;
  diasMin?: number;
  diasMax?: number;
  activo?: boolean;
};

type UpdateCostoTransporteParams = {
  empresaId?: number;
  zonaTransporteId?: number;
  transportadoraId?: number;
  monedaId?: number;
  pesoMinKg?: number | null;
  pesoMaxKg?: number | null;
  valorMin?: number | null;
  valorMax?: number | null;
  costo?: number;
  diasMin?: number | null;
  diasMax?: number | null;
  activo?: boolean;
};

@Injectable()
export class CostoTransporteService {
  constructor(private readonly costoTransporteRepository: CostoTransporteRepository) {}

  async listCostosTransporte(): Promise<CostoTransporteListItem[]> {
    return this.costoTransporteRepository.list();
  }

  async getBootstrapData(): Promise<CostoTransporteBootstrapData> {
    return this.costoTransporteRepository.listBootstrapData();
  }

  async getCostoTransporteById(costoTransporteId: string): Promise<CostoTransporteListItem> {
    const normalizedId = this.normalizeRequiredBigIntId(
      costoTransporteId,
      'costoTransporteId',
    );
    const costoTransporte = await this.costoTransporteRepository.findById(normalizedId);
    if (!costoTransporte) {
      throw new NotFoundException('Costo transporte no existe');
    }
    return costoTransporte;
  }

  async createCostoTransporte(
    params: CreateCostoTransporteParams,
  ): Promise<{ costoTransporteId: string }> {
    const normalized = this.normalizeCreateInput(params);
    this.validateRangeConsistency(normalized);
    await this.validateForeignKeys(normalized);
    await this.validateExactDuplicate(normalized);
    await this.validateRangeOverlap(normalized);

    try {
      return await this.costoTransporteRepository.create(normalized);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe un costo transporte con la misma combinacion');
      }
      throw error;
    }
  }

  async updateCostoTransporte(
    costoTransporteId: string,
    params: UpdateCostoTransporteParams,
  ): Promise<void> {
    const normalizedId = this.normalizeRequiredBigIntId(
      costoTransporteId,
      'costoTransporteId',
    );

    const hasAnyField =
      params.empresaId !== undefined ||
      params.zonaTransporteId !== undefined ||
      params.transportadoraId !== undefined ||
      params.monedaId !== undefined ||
      params.pesoMinKg !== undefined ||
      params.pesoMaxKg !== undefined ||
      params.valorMin !== undefined ||
      params.valorMax !== undefined ||
      params.costo !== undefined ||
      params.diasMin !== undefined ||
      params.diasMax !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.costoTransporteRepository.findById(normalizedId);
    if (!current) {
      throw new NotFoundException('Costo transporte no existe');
    }

    const normalized = {
      empresaId:
        params.empresaId !== undefined
          ? this.normalizeRequiredId(params.empresaId, 'empresaId')
          : current.empresaId,
      zonaTransporteId:
        params.zonaTransporteId !== undefined
          ? this.normalizeRequiredId(params.zonaTransporteId, 'zonaTransporteId')
          : current.zonaTransporteId,
      transportadoraId:
        params.transportadoraId !== undefined
          ? this.normalizeRequiredId(params.transportadoraId, 'transportadoraId')
          : current.transportadoraId,
      monedaId:
        params.monedaId !== undefined
          ? this.normalizeRequiredId(params.monedaId, 'monedaId')
          : current.monedaId,
      pesoMinKg:
        params.pesoMinKg !== undefined
          ? this.normalizeOptionalDecimal(params.pesoMinKg, 'pesoMinKg')
          : current.pesoMinKg ?? null,
      pesoMaxKg:
        params.pesoMaxKg !== undefined
          ? this.normalizeOptionalDecimal(params.pesoMaxKg, 'pesoMaxKg')
          : current.pesoMaxKg ?? null,
      valorMin:
        params.valorMin !== undefined
          ? this.normalizeOptionalDecimal(params.valorMin, 'valorMin')
          : current.valorMin ?? null,
      valorMax:
        params.valorMax !== undefined
          ? this.normalizeOptionalDecimal(params.valorMax, 'valorMax')
          : current.valorMax ?? null,
      costo:
        params.costo !== undefined
          ? this.normalizeRequiredDecimal(params.costo, 'costo')
          : current.costo,
      diasMin:
        params.diasMin !== undefined
          ? this.normalizeOptionalInteger(params.diasMin, 'diasMin')
          : current.diasMin ?? null,
      diasMax:
        params.diasMax !== undefined
          ? this.normalizeOptionalInteger(params.diasMax, 'diasMax')
          : current.diasMax ?? null,
      activo: params.activo !== undefined ? params.activo : current.activo,
    };

    this.validateRangeConsistency(normalized);
    await this.validateForeignKeys(normalized);
    await this.validateExactDuplicate(normalized, normalizedId);
    await this.validateRangeOverlap(normalized, normalizedId);

    try {
      await this.costoTransporteRepository.update(normalizedId, normalized);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe un costo transporte con la misma combinacion');
      }
      throw error;
    }
  }

  private normalizeCreateInput(params: CreateCostoTransporteParams) {
    return {
      empresaId: this.normalizeRequiredId(params.empresaId, 'empresaId'),
      zonaTransporteId: this.normalizeRequiredId(
        params.zonaTransporteId,
        'zonaTransporteId',
      ),
      transportadoraId: this.normalizeRequiredId(
        params.transportadoraId,
        'transportadoraId',
      ),
      monedaId: this.normalizeRequiredId(params.monedaId, 'monedaId'),
      pesoMinKg: this.normalizeOptionalDecimal(params.pesoMinKg, 'pesoMinKg'),
      pesoMaxKg: this.normalizeOptionalDecimal(params.pesoMaxKg, 'pesoMaxKg'),
      valorMin: this.normalizeOptionalDecimal(params.valorMin, 'valorMin'),
      valorMax: this.normalizeOptionalDecimal(params.valorMax, 'valorMax'),
      costo: this.normalizeRequiredDecimal(params.costo, 'costo'),
      diasMin: this.normalizeOptionalInteger(params.diasMin, 'diasMin'),
      diasMax: this.normalizeOptionalInteger(params.diasMax, 'diasMax'),
      activo: params.activo ?? true,
    };
  }

  private async validateForeignKeys(input: {
    empresaId: number;
    zonaTransporteId: number;
    transportadoraId: number;
    monedaId: number;
  }): Promise<void> {
    const [
      empresaExists,
      zonaExists,
      zonaBelongsEmpresa,
      transportadoraExists,
      transportadoraBelongsEmpresa,
      monedaExists,
    ] = await Promise.all([
      this.costoTransporteRepository.existsEmpresaById(input.empresaId),
      this.costoTransporteRepository.existsZonaTransporteById(input.zonaTransporteId),
      this.costoTransporteRepository.existsZonaTransporteByIdAndEmpresaId(
        input.zonaTransporteId,
        input.empresaId,
      ),
      this.costoTransporteRepository.existsTransportadoraById(input.transportadoraId),
      this.costoTransporteRepository.existsTransportadoraByIdAndEmpresaId(
        input.transportadoraId,
        input.empresaId,
      ),
      this.costoTransporteRepository.existsMonedaById(input.monedaId),
    ]);

    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }
    if (!zonaExists) {
      throw new BadRequestException('ZonaTransporteId no existe en la base de datos');
    }
    if (!zonaBelongsEmpresa) {
      throw new BadRequestException('ZonaTransporteId no pertenece a la empresa seleccionada');
    }
    if (!transportadoraExists) {
      throw new BadRequestException('TransportadoraId no existe en la base de datos');
    }
    if (!transportadoraBelongsEmpresa) {
      throw new BadRequestException(
        'TransportadoraId no pertenece a la empresa seleccionada',
      );
    }
    if (!monedaExists) {
      throw new BadRequestException('MonedaId no existe en la base de datos');
    }
  }

  private async validateExactDuplicate(
    input: {
      empresaId: number;
      zonaTransporteId: number;
      transportadoraId: number;
      monedaId: number;
      pesoMinKg: number | null;
      pesoMaxKg: number | null;
      valorMin: number | null;
      valorMax: number | null;
      costo: number;
      diasMin: number | null;
      diasMax: number | null;
      activo: boolean;
    },
    excludeCostoTransporteId?: string,
  ): Promise<void> {
    const duplicated = await this.costoTransporteRepository.existsExactDuplicate(
      input,
      excludeCostoTransporteId,
    );
    if (duplicated) {
      throw new ConflictException('Existe un costo transporte duplicado con los mismos rangos');
    }
  }

  private async validateRangeOverlap(
    input: {
      empresaId: number;
      zonaTransporteId: number;
      transportadoraId: number;
      monedaId: number;
      pesoMinKg: number | null;
      pesoMaxKg: number | null;
      valorMin: number | null;
      valorMax: number | null;
      diasMin: number | null;
      diasMax: number | null;
      activo: boolean;
    },
    excludeCostoTransporteId?: string,
  ): Promise<void> {
    if (!input.activo) {
      return;
    }

    const activeRanges = await this.costoTransporteRepository.listActiveByCombination(
      input.empresaId,
      input.zonaTransporteId,
      input.transportadoraId,
      input.monedaId,
      excludeCostoTransporteId,
    );

    const hasOverlap = activeRanges.some((candidate) =>
      this.overlapsAllRanges(candidate, input),
    );
    if (hasOverlap) {
      throw new ConflictException(
        'El rango se traslapa con otro costo transporte activo de la misma combinacion',
      );
    }
  }

  private overlapsAllRanges(
    existing: CostoTransporteRangeCandidate,
    next: {
      pesoMinKg: number | null;
      pesoMaxKg: number | null;
      valorMin: number | null;
      valorMax: number | null;
      diasMin: number | null;
      diasMax: number | null;
    },
  ): boolean {
    const pesoOverlap = this.intervalOverlaps(
      existing.pesoMinKg,
      existing.pesoMaxKg,
      next.pesoMinKg,
      next.pesoMaxKg,
    );
    const valorOverlap = this.intervalOverlaps(
      existing.valorMin,
      existing.valorMax,
      next.valorMin,
      next.valorMax,
    );
    const diasOverlap = this.intervalOverlaps(
      existing.diasMin,
      existing.diasMax,
      next.diasMin,
      next.diasMax,
    );

    return pesoOverlap && valorOverlap && diasOverlap;
  }

  private intervalOverlaps(
    existingMin: number | null,
    existingMax: number | null,
    nextMin: number | null,
    nextMax: number | null,
  ): boolean {
    const aMin = existingMin ?? Number.NEGATIVE_INFINITY;
    const aMax = existingMax ?? Number.POSITIVE_INFINITY;
    const bMin = nextMin ?? Number.NEGATIVE_INFINITY;
    const bMax = nextMax ?? Number.POSITIVE_INFINITY;
    return aMin <= bMax && bMin <= aMax;
  }

  private validateRangeConsistency(input: {
    pesoMinKg: number | null;
    pesoMaxKg: number | null;
    valorMin: number | null;
    valorMax: number | null;
    diasMin: number | null;
    diasMax: number | null;
  }): void {
    this.validateMinMax('pesoMinKg', input.pesoMinKg, 'pesoMaxKg', input.pesoMaxKg);
    this.validateMinMax('valorMin', input.valorMin, 'valorMax', input.valorMax);
    this.validateMinMax('diasMin', input.diasMin, 'diasMax', input.diasMax);
  }

  private validateMinMax(
    minField: string,
    minValue: number | null,
    maxField: string,
    maxValue: number | null,
  ): void {
    if (minValue === null || maxValue === null) {
      return;
    }
    if (minValue > maxValue) {
      throw new BadRequestException(
        `El campo ${minField} no puede ser mayor que ${maxField}`,
      );
    }
  }

  private normalizeRequiredId(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un entero mayor a 0`);
    }
    return value;
  }

  private normalizeRequiredBigIntId(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!/^[0-9]+$/.test(normalized)) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un bigint valido`);
    }
    if (normalized === '0') {
      throw new BadRequestException(`El campo ${fieldName} debe ser mayor a 0`);
    }
    return normalized;
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

  private normalizeRequiredDecimal(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un numero >= 0`);
    }
    return value;
  }

  private normalizeOptionalInteger(
    value: number | null | undefined,
    fieldName: string,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un entero >= 0`);
    }
    return value;
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
