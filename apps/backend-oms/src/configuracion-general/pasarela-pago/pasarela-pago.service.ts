import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PasarelaPagoRepository } from './pasarela-pago.repository';
import type {
  PasarelaPagoBootstrapData,
  PasarelaPagoListItem,
} from './pasarela-pago.types';

type CreatePasarelaPagoParams = {
  empresaId: number;
  codigo: string;
  nombre: string;
  activo?: boolean;
  configJson?: string;
};

type UpdatePasarelaPagoParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  configJson?: string | null;
};

@Injectable()
export class PasarelaPagoService {
  constructor(
    private readonly pasarelaPagoRepository: PasarelaPagoRepository,
  ) {}

  async listPasarelasPago(): Promise<PasarelaPagoListItem[]> {
    return this.pasarelaPagoRepository.list();
  }

  async getBootstrapData(): Promise<PasarelaPagoBootstrapData> {
    return this.pasarelaPagoRepository.listBootstrapData();
  }

  async getPasarelaPagoById(
    pasarelaPagoId: number,
  ): Promise<PasarelaPagoListItem> {
    const pasarelaPago =
      await this.pasarelaPagoRepository.findById(pasarelaPagoId);
    if (!pasarelaPago) {
      throw new NotFoundException('Pasarela de pago no existe');
    }
    return pasarelaPago;
  }

  async createPasarelaPago(
    params: CreatePasarelaPagoParams,
  ): Promise<{ pasarelaPagoId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 180);
    const activo = this.normalizeBoolean(params.activo, true);
    const configJson = this.normalizeOptionalJson(params.configJson);

    await this.validateEmpresa(empresaId);

    const duplicated =
      await this.pasarelaPagoRepository.existsByEmpresaAndCodigo(
        empresaId,
        codigo,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una pasarela con ese codigo en la empresa',
      );
    }

    try {
      return await this.pasarelaPagoRepository.create({
        empresaId,
        codigo,
        nombre,
        activo,
        configJson,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una pasarela con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async updatePasarelaPago(
    pasarelaPagoId: number,
    params: UpdatePasarelaPagoParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.activo !== undefined ||
      params.configJson !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    const current = await this.pasarelaPagoRepository.findById(pasarelaPagoId);
    if (!current) {
      throw new NotFoundException('Pasarela de pago no existe');
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
    const nextActivo =
      params.activo !== undefined
        ? this.normalizeBoolean(params.activo)
        : current.activo;
    const nextConfigJson =
      params.configJson !== undefined
        ? this.normalizeOptionalJson(params.configJson)
        : (current.configJson ?? null);

    await this.validateEmpresa(nextEmpresaId);

    const duplicated =
      await this.pasarelaPagoRepository.existsByEmpresaAndCodigo(
        nextEmpresaId,
        nextCodigo,
        pasarelaPagoId,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una pasarela con ese codigo en la empresa',
      );
    }

    try {
      await this.pasarelaPagoRepository.update(pasarelaPagoId, {
        empresaId: nextEmpresaId,
        codigo: nextCodigo,
        nombre: nextNombre,
        activo: nextActivo,
        configJson: nextConfigJson,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una pasarela con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  private async validateEmpresa(empresaId: number): Promise<void> {
    const empresaExists =
      await this.pasarelaPagoRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
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

  private normalizeBoolean(
    value: boolean | undefined,
    fallback?: boolean,
  ): boolean {
    if (value === undefined) {
      if (fallback === undefined) {
        throw new BadRequestException('El campo activo es requerido');
      }
      return fallback;
    }
    return value;
  }

  private normalizeOptionalJson(
    value: string | null | undefined,
  ): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    try {
      JSON.parse(normalized);
    } catch {
      throw new BadRequestException(
        'El campo configJson debe contener JSON valido',
      );
    }

    return normalized;
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
