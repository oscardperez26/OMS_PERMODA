import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ZonaTransporteRepository } from './zona-transporte.repository';
import type {
  ZonaTransporteBootstrapData,
  ZonaTransporteListItem,
} from './zona-transporte.types';

type CreateZonaTransporteParams = {
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  activo?: boolean;
};

type UpdateZonaTransporteParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  paisId?: number | null;
  activo?: boolean;
};

@Injectable()
export class ZonaTransporteService {
  constructor(
    private readonly zonaTransporteRepository: ZonaTransporteRepository,
  ) {}

  async listZonasTransporte(): Promise<ZonaTransporteListItem[]> {
    return this.zonaTransporteRepository.list();
  }

  async getBootstrapData(): Promise<ZonaTransporteBootstrapData> {
    return this.zonaTransporteRepository.listBootstrapData();
  }

  async getZonaTransporteById(
    zonaTransporteId: number,
  ): Promise<ZonaTransporteListItem> {
    const zonaTransporte =
      await this.zonaTransporteRepository.findById(zonaTransporteId);
    if (!zonaTransporte) {
      throw new NotFoundException('Zona de transporte no existe');
    }
    return zonaTransporte;
  }

  async createZonaTransporte(
    params: CreateZonaTransporteParams,
  ): Promise<{ zonaTransporteId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 180);
    const paisId = this.normalizeOptionalId(params.paisId, 'paisId');
    const activo = this.normalizeBoolean(params.activo, true);

    const duplicated =
      await this.zonaTransporteRepository.existsByEmpresaAndCodigo(
        empresaId,
        codigo,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una zona con ese codigo en la empresa',
      );
    }

    await this.validateForeignKeys(empresaId, paisId);

    try {
      return await this.zonaTransporteRepository.create({
        empresaId,
        codigo,
        nombre,
        paisId,
        activo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una zona con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async updateZonaTransporte(
    zonaTransporteId: number,
    params: UpdateZonaTransporteParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.paisId !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    const current =
      await this.zonaTransporteRepository.findById(zonaTransporteId);
    if (!current) {
      throw new NotFoundException('Zona de transporte no existe');
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextCodigo =
      params.codigo !== undefined
        ? this.normalizeCodigo(params.codigo)
        : current.codigo;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 180)
        : current.nombre;
    const nextPaisId =
      params.paisId !== undefined
        ? this.normalizeOptionalId(params.paisId, 'paisId')
        : (current.paisId ?? null);
    const nextActivo =
      params.activo !== undefined
        ? this.normalizeBoolean(params.activo)
        : current.activo;

    const duplicated =
      await this.zonaTransporteRepository.existsByEmpresaAndCodigo(
        nextEmpresaId,
        nextCodigo,
        zonaTransporteId,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una zona con ese codigo en la empresa',
      );
    }

    await this.validateForeignKeys(nextEmpresaId, nextPaisId);

    try {
      await this.zonaTransporteRepository.update(zonaTransporteId, {
        empresaId: nextEmpresaId,
        codigo: nextCodigo,
        nombre: nextNombre,
        paisId: nextPaisId,
        activo: nextActivo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una zona con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  private async validateForeignKeys(
    empresaId: number,
    paisId: number | null,
  ): Promise<void> {
    const empresaExists =
      await this.zonaTransporteRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (paisId === null) {
      return;
    }

    const paisExists =
      await this.zonaTransporteRepository.existsPaisById(paisId);
    if (!paisExists) {
      throw new BadRequestException('PaisId no existe en la base de datos');
    }
  }

  private normalizeCodigo(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('El campo codigo no puede estar vacio');
    }
    if (normalized.length > 60) {
      throw new BadRequestException(
        'El campo codigo no puede exceder 60 caracteres',
      );
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
      throw new BadRequestException(
        `El campo ${fieldName} no puede estar vacio`,
      );
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
      throw new BadRequestException(
        `El campo ${fieldName} debe ser un entero mayor a 0`,
      );
    }
    return value;
  }

  private normalizeOptionalId(
    value: number | null | undefined,
    fieldName: string,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(
        `El campo ${fieldName} debe ser un entero mayor a 0`,
      );
    }
    return value;
  }

  private normalizeBoolean(
    value: boolean | undefined,
    fallback?: boolean,
  ): boolean {
    if (value === undefined) {
      if (fallback === undefined) {
        throw new BadRequestException('Valor booleano no enviado');
      }
      return fallback;
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
