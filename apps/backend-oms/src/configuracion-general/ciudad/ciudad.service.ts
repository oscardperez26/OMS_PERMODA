import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CiudadRepository } from './ciudad.repository';
import type { CiudadListItem } from './ciudad.types';

type CreateCiudadParams = {
  paisId: number;
  nombre: string;
  departamento?: string;
  codigo?: string;
};

type UpdateCiudadParams = {
  paisId?: number;
  nombre?: string;
  departamento?: string;
  codigo?: string;
};

@Injectable()
export class CiudadService {
  constructor(private readonly ciudadRepository: CiudadRepository) {}

  async listCiudades(): Promise<CiudadListItem[]> {
    return this.ciudadRepository.list();
  }

  async getCiudadById(ciudadId: number): Promise<CiudadListItem> {
    const ciudad = await this.ciudadRepository.findById(ciudadId);
    if (!ciudad) {
      throw new NotFoundException('Ciudad no existe');
    }
    return ciudad;
  }

  async createCiudad(params: CreateCiudadParams): Promise<{ ciudadId: number }> {
    const paisExists = await this.ciudadRepository.existsPaisById(params.paisId);
    if (!paisExists) {
      throw new BadRequestException('PaisId no existe en la base de datos');
    }

    const nombre = this.normalizeRequiredText(params.nombre, 'nombre');
    const isDuplicate = await this.ciudadRepository.existsByPaisAndNombre(
      params.paisId,
      nombre,
    );
    if (isDuplicate) {
      throw new ConflictException(
        'Ya existe una ciudad con ese nombre para el pais seleccionado',
      );
    }

    return this.ciudadRepository.create({
      paisId: params.paisId,
      nombre,
      departamento: this.normalizeOptionalText(params.departamento),
      codigo: this.normalizeOptionalText(params.codigo),
    });
  }

  async updateCiudad(ciudadId: number, params: UpdateCiudadParams): Promise<void> {
    const hasAnyField =
      params.paisId !== undefined ||
      params.nombre !== undefined ||
      params.departamento !== undefined ||
      params.codigo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.ciudadRepository.findById(ciudadId);
    if (!current) {
      throw new NotFoundException('Ciudad no existe');
    }

    const nextPaisId = params.paisId ?? current.paisId;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre')
        : current.nombre;
    const nextDepartamento =
      params.departamento !== undefined
        ? this.normalizeOptionalText(params.departamento)
        : current.departamento ?? null;
    const nextCodigo =
      params.codigo !== undefined
        ? this.normalizeOptionalText(params.codigo)
        : current.codigo ?? null;

    const paisExists = await this.ciudadRepository.existsPaisById(nextPaisId);
    if (!paisExists) {
      throw new BadRequestException('PaisId no existe en la base de datos');
    }

    const isDuplicate = await this.ciudadRepository.existsByPaisAndNombre(
      nextPaisId,
      nextNombre,
      ciudadId,
    );
    if (isDuplicate) {
      throw new ConflictException(
        'Ya existe una ciudad con ese nombre para el pais seleccionado',
      );
    }

    await this.ciudadRepository.update(ciudadId, {
      paisId: nextPaisId,
      nombre: nextNombre,
      departamento: nextDepartamento,
      codigo: nextCodigo,
    });
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`El campo ${fieldName} no puede estar vacio`);
    }
    return normalized;
  }

  // Normaliza cadenas opcionales para persistir null en columnas nullable.
  private normalizeOptionalText(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
