import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmpresaClienteRepository } from './empresa-cliente.repository';
import type {
  EmpresaClienteBootstrapData,
  EmpresaClienteListItem,
} from './empresa-cliente.types';

type CreateEmpresaClienteParams = {
  empresaId: number;
  nombre: string;
  documento?: string;
  email?: string;
  telefono?: string;
  paisId?: number;
  ciudadId?: number;
  direccion?: string;
  estado?: string;
};

type UpdateEmpresaClienteParams = {
  empresaId?: number;
  nombre?: string;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  paisId?: number | null;
  ciudadId?: number | null;
  direccion?: string | null;
  estado?: string;
};

@Injectable()
export class EmpresaClienteService {
  constructor(
    private readonly empresaClienteRepository: EmpresaClienteRepository,
  ) {}

  async listEmpresaClientes(): Promise<EmpresaClienteListItem[]> {
    return this.empresaClienteRepository.list();
  }

  async getBootstrapData(): Promise<EmpresaClienteBootstrapData> {
    return this.empresaClienteRepository.listBootstrapData();
  }

  async getEmpresaClienteById(empresaClienteId: number): Promise<EmpresaClienteListItem> {
    const empresaCliente = await this.empresaClienteRepository.findById(empresaClienteId);
    if (!empresaCliente) {
      throw new NotFoundException('Empresa cliente no existe');
    }
    return empresaCliente;
  }

  async createEmpresaCliente(
    params: CreateEmpresaClienteParams,
  ): Promise<{ empresaClienteId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 180);
    const documento = this.normalizeOptionalText(params.documento, 'documento', 60);
    const email = this.normalizeOptionalText(params.email, 'email', 180, true);
    const telefono = this.normalizeOptionalText(params.telefono, 'telefono', 50);
    const paisId = this.normalizeOptionalId(params.paisId, 'paisId');
    const ciudadId = this.normalizeOptionalId(params.ciudadId, 'ciudadId');
    const direccion = this.normalizeOptionalText(params.direccion, 'direccion', 255);
    const estado = this.normalizeEstado(params.estado);

    this.validateDocumentoOrEmail(documento, email);
    await this.validateDuplicateRule(empresaId, documento, email);
    await this.validateForeignKeys(empresaId, paisId, ciudadId);

    try {
      return await this.empresaClienteRepository.create({
        empresaId,
        nombre,
        documento,
        email,
        telefono,
        paisId,
        ciudadId,
        direccion,
        estado,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe un empresa cliente con esos datos');
      }
      throw error;
    }
  }

  async updateEmpresaCliente(
    empresaClienteId: number,
    params: UpdateEmpresaClienteParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.nombre !== undefined ||
      params.documento !== undefined ||
      params.email !== undefined ||
      params.telefono !== undefined ||
      params.paisId !== undefined ||
      params.ciudadId !== undefined ||
      params.direccion !== undefined ||
      params.estado !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.empresaClienteRepository.findById(empresaClienteId);
    if (!current) {
      throw new NotFoundException('Empresa cliente no existe');
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 180)
        : current.nombre;
    const nextDocumento =
      params.documento !== undefined
        ? this.normalizeOptionalText(params.documento, 'documento', 60)
        : current.documento ?? null;
    const nextEmail =
      params.email !== undefined
        ? this.normalizeOptionalText(params.email, 'email', 180, true)
        : current.email ?? null;
    const nextTelefono =
      params.telefono !== undefined
        ? this.normalizeOptionalText(params.telefono, 'telefono', 50)
        : current.telefono ?? null;
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
    const nextEstado =
      params.estado !== undefined
        ? this.normalizeEstado(params.estado)
        : current.estado;

    this.validateDocumentoOrEmail(nextDocumento, nextEmail);
    await this.validateDuplicateRule(
      nextEmpresaId,
      nextDocumento,
      nextEmail,
      empresaClienteId,
    );
    await this.validateForeignKeys(nextEmpresaId, nextPaisId, nextCiudadId);

    try {
      await this.empresaClienteRepository.update(empresaClienteId, {
        empresaId: nextEmpresaId,
        nombre: nextNombre,
        documento: nextDocumento,
        email: nextEmail,
        telefono: nextTelefono,
        paisId: nextPaisId,
        ciudadId: nextCiudadId,
        direccion: nextDireccion,
        estado: nextEstado,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe un empresa cliente con esos datos');
      }
      throw error;
    }
  }

  private async validateDuplicateRule(
    empresaId: number,
    documento: string | null,
    email: string | null,
    excludeEmpresaClienteId?: number,
  ): Promise<void> {
    if (documento) {
      const duplicatedDocumento =
        await this.empresaClienteRepository.existsByEmpresaAndDocumento(
          empresaId,
          documento,
          excludeEmpresaClienteId,
        );
      if (duplicatedDocumento) {
        throw new ConflictException('Ya existe un cliente con ese documento en la empresa');
      }
      return;
    }

    if (!email) {
      return;
    }

    const duplicatedEmail = await this.empresaClienteRepository.existsByEmpresaAndEmail(
      empresaId,
      email,
      excludeEmpresaClienteId,
    );
    if (duplicatedEmail) {
      throw new ConflictException('Ya existe un cliente con ese email en la empresa');
    }
  }

  private async validateForeignKeys(
    empresaId: number,
    paisId: number | null,
    ciudadId: number | null,
  ): Promise<void> {
    const empresaExists = await this.empresaClienteRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (paisId !== null) {
      const paisExists = await this.empresaClienteRepository.existsPaisById(paisId);
      if (!paisExists) {
        throw new BadRequestException('PaisId no existe en la base de datos');
      }
    }

    if (ciudadId === null) {
      return;
    }

    if (paisId === null) {
      const ciudadExists = await this.empresaClienteRepository.existsCiudadById(ciudadId);
      if (!ciudadExists) {
        throw new BadRequestException('CiudadId no existe en la base de datos');
      }
      return;
    }

    const ciudadBelongsToPais =
      await this.empresaClienteRepository.existsCiudadByIdAndPaisId(ciudadId, paisId);
    if (!ciudadBelongsToPais) {
      throw new BadRequestException('CiudadId no pertenece al pais seleccionado');
    }
  }

  private validateDocumentoOrEmail(
    documento: string | null,
    email: string | null,
  ): void {
    if (!documento && !email) {
      throw new BadRequestException(
        'Debes informar al menos Documento o Email para empresa cliente',
      );
    }
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

  private normalizeEstado(value?: string): string {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) {
      return 'ACTIVA';
    }
    if (normalized.length > 20) {
      throw new BadRequestException('El campo estado no puede exceder 20 caracteres');
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
