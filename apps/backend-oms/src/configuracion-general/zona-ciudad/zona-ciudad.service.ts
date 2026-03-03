import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ZonaCiudadRepository } from './zona-ciudad.repository';
import type { ZonaCiudadBootstrapData, ZonaCiudadListItem } from './zona-ciudad.types';

type CreateZonaCiudadParams = {
  zonaTransporteId: number;
  ciudadId: number;
};

type UpdateZonaCiudadParams = {
  zonaTransporteId?: number;
  ciudadId?: number;
};

@Injectable()
export class ZonaCiudadService {
  constructor(private readonly zonaCiudadRepository: ZonaCiudadRepository) {}

  async listZonasCiudad(): Promise<ZonaCiudadListItem[]> {
    return this.zonaCiudadRepository.list();
  }

  async getBootstrapData(): Promise<ZonaCiudadBootstrapData> {
    return this.zonaCiudadRepository.listBootstrapData();
  }

  async getZonaCiudadById(
    zonaTransporteId: number,
    ciudadId: number,
  ): Promise<ZonaCiudadListItem> {
    const zonaCiudad = await this.zonaCiudadRepository.findById(zonaTransporteId, ciudadId);
    if (!zonaCiudad) {
      throw new NotFoundException('Zona ciudad no existe');
    }
    return zonaCiudad;
  }

  async createZonaCiudad(params: CreateZonaCiudadParams): Promise<void> {
    const zonaTransporteId = this.normalizeRequiredId(
      params.zonaTransporteId,
      'zonaTransporteId',
    );
    const ciudadId = this.normalizeRequiredId(params.ciudadId, 'ciudadId');

    await this.validateForeignKeys(zonaTransporteId, ciudadId);

    const duplicated = await this.zonaCiudadRepository.existsByPk(zonaTransporteId, ciudadId);
    if (duplicated) {
      throw new ConflictException('La relacion zona-ciudad ya existe');
    }

    try {
      await this.zonaCiudadRepository.create({
        zonaTransporteId,
        ciudadId,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('La relacion zona-ciudad ya existe');
      }
      throw error;
    }
  }

  async updateZonaCiudad(
    currentZonaTransporteId: number,
    currentCiudadId: number,
    params: UpdateZonaCiudadParams,
  ): Promise<void> {
    const hasAnyField =
      params.zonaTransporteId !== undefined || params.ciudadId !== undefined;
    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.zonaCiudadRepository.findById(
      currentZonaTransporteId,
      currentCiudadId,
    );
    if (!current) {
      throw new NotFoundException('Zona ciudad no existe');
    }

    const nextZonaTransporteId =
      params.zonaTransporteId !== undefined
        ? this.normalizeRequiredId(params.zonaTransporteId, 'zonaTransporteId')
        : current.zonaTransporteId;
    const nextCiudadId =
      params.ciudadId !== undefined
        ? this.normalizeRequiredId(params.ciudadId, 'ciudadId')
        : current.ciudadId;

    const duplicated = await this.zonaCiudadRepository.existsByPk(
      nextZonaTransporteId,
      nextCiudadId,
      {
        zonaTransporteId: current.zonaTransporteId,
        ciudadId: current.ciudadId,
      },
    );
    if (duplicated) {
      throw new ConflictException('La relacion zona-ciudad ya existe');
    }

    await this.validateForeignKeys(nextZonaTransporteId, nextCiudadId);

    try {
      await this.zonaCiudadRepository.update(currentZonaTransporteId, currentCiudadId, {
        zonaTransporteId: nextZonaTransporteId,
        ciudadId: nextCiudadId,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('La relacion zona-ciudad ya existe');
      }
      throw error;
    }
  }

  private async validateForeignKeys(
    zonaTransporteId: number,
    ciudadId: number,
  ): Promise<void> {
    const [zonaExists, ciudadExists] = await Promise.all([
      this.zonaCiudadRepository.existsZonaTransporteById(zonaTransporteId),
      this.zonaCiudadRepository.existsCiudadById(ciudadId),
    ]);

    if (!zonaExists) {
      throw new BadRequestException('ZonaTransporteId no existe en la base de datos');
    }
    if (!ciudadExists) {
      throw new BadRequestException('CiudadId no existe en la base de datos');
    }
  }

  private normalizeRequiredId(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un entero mayor a 0`);
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
