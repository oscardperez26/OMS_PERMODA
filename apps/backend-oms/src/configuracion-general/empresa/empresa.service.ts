import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmpresaRepository } from './empresa.repository';
import type { EmpresaBootstrapData, EmpresaListItem } from './empresa.types';

type CreateEmpresaParams = {
  codigo: string;
  nombre: string;
  nit?: string;
  email?: string;
  telefono?: string;
  paisId: number;
  ciudadId?: number;
  direccion?: string;
  monedaId: number;
};

type UpdateEmpresaParams = {
  codigo?: string;
  nombre?: string;
  nit?: string | null;
  email?: string | null;
  telefono?: string | null;
  paisId?: number;
  ciudadId?: number | null;
  direccion?: string | null;
  monedaId?: number;
};

@Injectable()
export class EmpresaService {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async listEmpresas(): Promise<EmpresaListItem[]> {
    return this.empresaRepository.list();
  }

  async getBootstrapData(): Promise<EmpresaBootstrapData> {
    return this.empresaRepository.listBootstrapData();
  }

  async getEmpresaById(empresaId: number): Promise<EmpresaListItem> {
    const empresa = await this.empresaRepository.findById(empresaId);
    if (!empresa) {
      throw new NotFoundException('Empresa no existe');
    }
    return empresa;
  }

  async createEmpresa(params: CreateEmpresaParams): Promise<{ empresaId: number }> {
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 240);
    const paisId = this.normalizeRequiredId(params.paisId, 'paisId');
    const monedaId = this.normalizeRequiredId(params.monedaId, 'monedaId');
    const ciudadId = this.normalizeOptionalId(params.ciudadId, 'ciudadId');

    const isDuplicate = await this.empresaRepository.existsByCodigo(codigo);
    if (isDuplicate) {
      throw new ConflictException('Ya existe una empresa con ese codigo');
    }

    await this.validateForeignKeys(paisId, monedaId, ciudadId);

    return this.empresaRepository.create({
      codigo,
      nombre,
      nit: this.normalizeOptionalText(params.nit, 'nit', 50),
      email: this.normalizeOptionalText(params.email, 'email', 180, true),
      telefono: this.normalizeOptionalText(params.telefono, 'telefono', 50),
      paisId,
      ciudadId,
      direccion: this.normalizeOptionalText(params.direccion, 'direccion', 300),
      monedaId,
    });
  }

  async updateEmpresa(empresaId: number, params: UpdateEmpresaParams): Promise<void> {
    const hasAnyField =
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.nit !== undefined ||
      params.email !== undefined ||
      params.telefono !== undefined ||
      params.paisId !== undefined ||
      params.ciudadId !== undefined ||
      params.direccion !== undefined ||
      params.monedaId !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.empresaRepository.findById(empresaId);
    if (!current) {
      throw new NotFoundException('Empresa no existe');
    }

    const nextCodigo =
      params.codigo !== undefined
        ? this.normalizeCodigo(params.codigo)
        : current.codigo;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 240)
        : current.nombre;
    const nextPaisId =
      params.paisId !== undefined
        ? this.normalizeRequiredId(params.paisId, 'paisId')
        : current.paisId;
    const nextMonedaId =
      params.monedaId !== undefined
        ? this.normalizeRequiredId(params.monedaId, 'monedaId')
        : current.monedaId;
    const nextCiudadId =
      params.ciudadId !== undefined
        ? this.normalizeOptionalId(params.ciudadId, 'ciudadId')
        : current.ciudadId ?? null;
    const nextNit =
      params.nit !== undefined
        ? this.normalizeOptionalText(params.nit, 'nit', 50)
        : current.nit ?? null;
    const nextEmail =
      params.email !== undefined
        ? this.normalizeOptionalText(params.email, 'email', 180, true)
        : current.email ?? null;
    const nextTelefono =
      params.telefono !== undefined
        ? this.normalizeOptionalText(params.telefono, 'telefono', 50)
        : current.telefono ?? null;
    const nextDireccion =
      params.direccion !== undefined
        ? this.normalizeOptionalText(params.direccion, 'direccion', 300)
        : current.direccion ?? null;

    const isDuplicate = await this.empresaRepository.existsByCodigo(
      nextCodigo,
      empresaId,
    );
    if (isDuplicate) {
      throw new ConflictException('Ya existe una empresa con ese codigo');
    }

    await this.validateForeignKeys(nextPaisId, nextMonedaId, nextCiudadId);

    await this.empresaRepository.update(empresaId, {
      codigo: nextCodigo,
      nombre: nextNombre,
      nit: nextNit,
      email: nextEmail,
      telefono: nextTelefono,
      paisId: nextPaisId,
      ciudadId: nextCiudadId,
      direccion: nextDireccion,
      monedaId: nextMonedaId,
    });
  }

  private async validateForeignKeys(
    paisId: number,
    monedaId: number,
    ciudadId: number | null,
  ): Promise<void> {
    const [paisExists, monedaExists] = await Promise.all([
      this.empresaRepository.existsPaisById(paisId),
      this.empresaRepository.existsMonedaById(monedaId),
    ]);

    if (!paisExists) {
      throw new BadRequestException('PaisId no existe en la base de datos');
    }

    if (!monedaExists) {
      throw new BadRequestException('MonedaId no existe en la base de datos');
    }

    if (ciudadId === null) {
      return;
    }

    const ciudadBelongsToPais = await this.empresaRepository.existsCiudadByIdAndPaisId(
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
    if (normalized.length > 50) {
      throw new BadRequestException('El campo codigo no puede exceder 50 caracteres');
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
    lowerCase = false,
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
    return lowerCase ? normalized.toLowerCase() : normalized;
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
}
