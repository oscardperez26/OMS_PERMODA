import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BodegaRepository } from './bodega.repository';
import type { BodegaBootstrapData, BodegaListItem } from './bodega.types';

type CreateBodegaParams = {
  empresaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  tiendaId?: number;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  activo?: boolean;
};

type UpdateBodegaParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  tipo?: string;
  tiendaId?: number | null;
  paisId?: number | null;
  ciudadId?: number | null;
  direccion?: string | null;
  activo?: boolean;
};

@Injectable()
export class BodegaService {
  constructor(private readonly bodegaRepository: BodegaRepository) {}

  async listBodegas(): Promise<BodegaListItem[]> {
    return this.bodegaRepository.list();
  }

  async getBootstrapData(): Promise<BodegaBootstrapData> {
    return this.bodegaRepository.listBootstrapData();
  }

  async getBodegaById(bodegaId: number): Promise<BodegaListItem> {
    const bodega = await this.bodegaRepository.findById(bodegaId);
    if (!bodega) {
      throw new NotFoundException('Bodega no existe');
    }
    return bodega;
  }

  async createBodega(params: CreateBodegaParams): Promise<{ bodegaId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 180);
    const tipo = this.normalizeRequiredText(params.tipo, 'tipo', 30).toUpperCase();
    const tiendaId = this.normalizeOptionalId(params.tiendaId, 'tiendaId');
    const paisId = this.normalizeOptionalId(params.paisId, 'paisId');
    const ciudadId = this.normalizeOptionalId(params.ciudadId, 'ciudadId');
    const direccion = this.normalizeOptionalText(params.direccion, 'direccion', 255);
    const activo = this.normalizeBoolean(params.activo, true);

    const duplicated = await this.bodegaRepository.existsByEmpresaAndCodigo(
      empresaId,
      codigo,
    );
    if (duplicated) {
      throw new ConflictException('Ya existe una bodega con ese codigo en la empresa');
    }

    await this.validateForeignKeys(empresaId, tiendaId, paisId, ciudadId);

    try {
      return await this.bodegaRepository.create({
        empresaId,
        codigo,
        nombre,
        tipo,
        tiendaId,
        paisId,
        ciudadId,
        direccion,
        activo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una bodega con ese codigo en la empresa');
      }
      throw error;
    }
  }

  async updateBodega(bodegaId: number, params: UpdateBodegaParams): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.tipo !== undefined ||
      params.tiendaId !== undefined ||
      params.paisId !== undefined ||
      params.ciudadId !== undefined ||
      params.direccion !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.bodegaRepository.findById(bodegaId);
    if (!current) {
      throw new NotFoundException('Bodega no existe');
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
    const nextTipo =
      params.tipo !== undefined
        ? this.normalizeRequiredText(params.tipo, 'tipo', 30).toUpperCase()
        : current.tipo;
    const nextTiendaId =
      params.tiendaId !== undefined
        ? this.normalizeOptionalId(params.tiendaId, 'tiendaId')
        : current.tiendaId ?? null;
    const nextPaisId =
      params.paisId !== undefined
        ? this.normalizeOptionalId(params.paisId, 'paisId')
        : current.paisId ?? null;
    const nextCiudadId =
      params.ciudadId !== undefined
        ? this.normalizeOptionalId(params.ciudadId, 'ciudadId')
        : current.ciudadId ?? null;
    const nextDireccion =
      params.direccion !== undefined
        ? this.normalizeOptionalText(params.direccion, 'direccion', 255)
        : current.direccion ?? null;
    const nextActivo =
      params.activo !== undefined ? this.normalizeBoolean(params.activo) : current.activo;

    const duplicated = await this.bodegaRepository.existsByEmpresaAndCodigo(
      nextEmpresaId,
      nextCodigo,
      bodegaId,
    );
    if (duplicated) {
      throw new ConflictException('Ya existe una bodega con ese codigo en la empresa');
    }

    await this.validateForeignKeys(
      nextEmpresaId,
      nextTiendaId,
      nextPaisId,
      nextCiudadId,
    );

    try {
      await this.bodegaRepository.update(bodegaId, {
        empresaId: nextEmpresaId,
        codigo: nextCodigo,
        nombre: nextNombre,
        tipo: nextTipo,
        tiendaId: nextTiendaId,
        paisId: nextPaisId,
        ciudadId: nextCiudadId,
        direccion: nextDireccion,
        activo: nextActivo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una bodega con ese codigo en la empresa');
      }
      throw error;
    }
  }

  private async validateForeignKeys(
    empresaId: number,
    tiendaId: number | null,
    paisId: number | null,
    ciudadId: number | null,
  ): Promise<void> {
    const empresaExists = await this.bodegaRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (tiendaId !== null) {
      const tiendaExists = await this.bodegaRepository.existsTiendaByIdAndEmpresaId(
        tiendaId,
        empresaId,
      );
      if (!tiendaExists) {
        throw new BadRequestException(
          'TiendaId no existe o no pertenece a la empresa seleccionada',
        );
      }
    }

    if (paisId !== null) {
      const paisExists = await this.bodegaRepository.existsPaisById(paisId);
      if (!paisExists) {
        throw new BadRequestException('PaisId no existe en la base de datos');
      }
    }

    if (ciudadId === null) {
      return;
    }

    if (paisId === null) {
      const ciudadExists = await this.bodegaRepository.existsCiudadById(ciudadId);
      if (!ciudadExists) {
        throw new BadRequestException('CiudadId no existe en la base de datos');
      }
      return;
    }

    const ciudadBelongsToPais = await this.bodegaRepository.existsCiudadByIdAndPaisId(
      ciudadId,
      paisId,
    );
    if (!ciudadBelongsToPais) {
      throw new BadRequestException('CiudadId no pertenece al pais seleccionado');
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

  private normalizeOptionalId(
    value: number | null | undefined,
    fieldName: string,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }
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
