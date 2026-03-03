import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TiendaRepository } from './tienda.repository';
import type { TiendaBootstrapData, TiendaListItem } from './tienda.types';

type CreateTiendaParams = {
  empresaId: number;
  codigo: string;
  nombre: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  telefono?: string;
  fulfillmentHabilitado?: boolean;
  activo?: boolean;
};

type UpdateTiendaParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  paisId?: number | null;
  ciudadId?: number | null;
  direccion?: string | null;
  telefono?: string | null;
  fulfillmentHabilitado?: boolean;
  activo?: boolean;
};

@Injectable()
export class TiendaService {
  constructor(private readonly tiendaRepository: TiendaRepository) {}

  async listTiendas(): Promise<TiendaListItem[]> {
    return this.tiendaRepository.list();
  }

  async getBootstrapData(): Promise<TiendaBootstrapData> {
    return this.tiendaRepository.listBootstrapData();
  }

  async getTiendaById(tiendaId: number): Promise<TiendaListItem> {
    const tienda = await this.tiendaRepository.findById(tiendaId);
    if (!tienda) {
      throw new NotFoundException('Tienda no existe');
    }
    return tienda;
  }

  async createTienda(params: CreateTiendaParams): Promise<{ tiendaId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 180);
    const paisId = this.normalizeOptionalId(params.paisId, 'paisId');
    const ciudadId = this.normalizeOptionalId(params.ciudadId, 'ciudadId');
    const direccion = this.normalizeOptionalText(params.direccion, 'direccion', 255);
    const telefono = this.normalizeOptionalText(params.telefono, 'telefono', 50);
    const fulfillmentHabilitado = this.normalizeBoolean(
      params.fulfillmentHabilitado,
      true,
    );
    const activo = this.normalizeBoolean(params.activo, true);

    const duplicated = await this.tiendaRepository.existsByEmpresaAndCodigo(
      empresaId,
      codigo,
    );
    if (duplicated) {
      throw new ConflictException('Ya existe una tienda con ese codigo en la empresa');
    }

    await this.validateForeignKeys(empresaId, paisId, ciudadId);

    try {
      return await this.tiendaRepository.create({
        empresaId,
        codigo,
        nombre,
        paisId,
        ciudadId,
        direccion,
        telefono,
        fulfillmentHabilitado,
        activo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una tienda con ese codigo en la empresa');
      }
      throw error;
    }
  }

  async updateTienda(tiendaId: number, params: UpdateTiendaParams): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.paisId !== undefined ||
      params.ciudadId !== undefined ||
      params.direccion !== undefined ||
      params.telefono !== undefined ||
      params.fulfillmentHabilitado !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.tiendaRepository.findById(tiendaId);
    if (!current) {
      throw new NotFoundException('Tienda no existe');
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
    const nextTelefono =
      params.telefono !== undefined
        ? this.normalizeOptionalText(params.telefono, 'telefono', 50)
        : current.telefono ?? null;
    const nextFulfillmentHabilitado =
      params.fulfillmentHabilitado !== undefined
        ? this.normalizeBoolean(params.fulfillmentHabilitado)
        : current.fulfillmentHabilitado;
    const nextActivo =
      params.activo !== undefined ? this.normalizeBoolean(params.activo) : current.activo;

    const duplicated = await this.tiendaRepository.existsByEmpresaAndCodigo(
      nextEmpresaId,
      nextCodigo,
      tiendaId,
    );
    if (duplicated) {
      throw new ConflictException('Ya existe una tienda con ese codigo en la empresa');
    }

    await this.validateForeignKeys(nextEmpresaId, nextPaisId, nextCiudadId);

    try {
      await this.tiendaRepository.update(tiendaId, {
        empresaId: nextEmpresaId,
        codigo: nextCodigo,
        nombre: nextNombre,
        paisId: nextPaisId,
        ciudadId: nextCiudadId,
        direccion: nextDireccion,
        telefono: nextTelefono,
        fulfillmentHabilitado: nextFulfillmentHabilitado,
        activo: nextActivo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una tienda con ese codigo en la empresa');
      }
      throw error;
    }
  }

  private async validateForeignKeys(
    empresaId: number,
    paisId: number | null,
    ciudadId: number | null,
  ): Promise<void> {
    const empresaExists = await this.tiendaRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (paisId !== null) {
      const paisExists = await this.tiendaRepository.existsPaisById(paisId);
      if (!paisExists) {
        throw new BadRequestException('PaisId no existe en la base de datos');
      }
    }

    if (ciudadId === null) {
      return;
    }

    if (paisId === null) {
      const ciudadExists = await this.tiendaRepository.existsCiudadById(ciudadId);
      if (!ciudadExists) {
        throw new BadRequestException('CiudadId no existe en la base de datos');
      }
      return;
    }

    const ciudadBelongsToPais = await this.tiendaRepository.existsCiudadByIdAndPaisId(
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
