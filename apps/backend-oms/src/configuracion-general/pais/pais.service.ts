import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaisRepository } from './pais.repository';
import type { PaisListItem } from './pais.types';

type CreatePaisParams = {
  codigoISO2: string;
  codigoISO3?: string;
  nombre: string;
};

type UpdatePaisParams = {
  codigoISO2?: string;
  codigoISO3?: string;
  nombre?: string;
};

@Injectable()
export class PaisService {
  constructor(private readonly paisRepository: PaisRepository) {}

  async listPaises(): Promise<PaisListItem[]> {
    return this.paisRepository.list();
  }

  async getPaisById(paisId: number): Promise<PaisListItem> {
    const pais = await this.paisRepository.findById(paisId);
    if (!pais) {
      throw new NotFoundException('Pais no existe');
    }
    return pais;
  }

  async createPais(params: CreatePaisParams): Promise<{ paisId: number }> {
    const codigoISO2 = this.normalizeCode(params.codigoISO2, 2, 'codigoISO2');
    const exists = await this.paisRepository.existsByCodigoISO2(codigoISO2);
    if (exists) {
      throw new ConflictException('Ya existe un pais con ese codigoISO2');
    }

    return this.paisRepository.create({
      codigoISO2,
      codigoISO3: this.normalizeOptionalCode(params.codigoISO3, 3, 'codigoISO3'),
      nombre: this.normalizeRequiredText(params.nombre, 'nombre'),
    });
  }

  async updatePais(paisId: number, params: UpdatePaisParams): Promise<void> {
    const hasAnyField =
      params.codigoISO2 !== undefined ||
      params.codigoISO3 !== undefined ||
      params.nombre !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.paisRepository.findById(paisId);
    if (!current) {
      throw new NotFoundException('Pais no existe');
    }

    const nextCodigoISO2 =
      params.codigoISO2 !== undefined
        ? this.normalizeCode(params.codigoISO2, 2, 'codigoISO2')
        : current.codigoISO2;
    const nextCodigoISO3 =
      params.codigoISO3 !== undefined
        ? this.normalizeOptionalCode(params.codigoISO3, 3, 'codigoISO3')
        : current.codigoISO3 ?? null;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre')
        : current.nombre;

    const duplicateCodigoISO2 = await this.paisRepository.existsByCodigoISO2(
      nextCodigoISO2,
      paisId,
    );
    if (duplicateCodigoISO2) {
      throw new ConflictException('Ya existe un pais con ese codigoISO2');
    }

    await this.paisRepository.update(paisId, {
      codigoISO2: nextCodigoISO2,
      codigoISO3: nextCodigoISO3,
      nombre: nextNombre,
    });
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`El campo ${fieldName} no puede estar vacio`);
    }
    return normalized;
  }

  private normalizeCode(value: string, length: number, fieldName: string): string {
    const normalized = value.trim().toUpperCase();
    if (normalized.length !== length) {
      throw new BadRequestException(
        `El campo ${fieldName} debe tener exactamente ${length} caracteres`,
      );
    }
    return normalized;
  }

  // Se persiste null cuando el campo opcional llega vacio.
  private normalizeOptionalCode(
    value: string | undefined,
    length: number,
    fieldName: string,
  ): string | null {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (normalized.length !== length) {
      throw new BadRequestException(
        `El campo ${fieldName} debe tener exactamente ${length} caracteres`,
      );
    }
    return normalized;
  }
}
