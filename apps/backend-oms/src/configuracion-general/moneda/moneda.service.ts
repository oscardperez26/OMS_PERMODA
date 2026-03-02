import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MonedaRepository } from './moneda.repository';
import type { MonedaListItem } from './moneda.types';

type CreateMonedaParams = {
  codigo: string;
  simbolo?: string;
  nombre: string;
  decimales?: number;
};

type UpdateMonedaParams = {
  codigo?: string;
  simbolo?: string | null;
  nombre?: string;
  decimales?: number;
};

@Injectable()
export class MonedaService {
  constructor(private readonly monedaRepository: MonedaRepository) {}

  async listMonedas(): Promise<MonedaListItem[]> {
    return this.monedaRepository.list();
  }

  async getMonedaById(monedaId: number): Promise<MonedaListItem> {
    const moneda = await this.monedaRepository.findById(monedaId);
    if (!moneda) {
      throw new NotFoundException('Moneda no existe');
    }
    return moneda;
  }

  async createMoneda(params: CreateMonedaParams): Promise<{ monedaId: number }> {
    const codigo = this.normalizeCodigo(params.codigo);
    const exists = await this.monedaRepository.existsByCodigo(codigo);
    if (exists) {
      throw new ConflictException('Ya existe una moneda con ese codigo');
    }

    return this.monedaRepository.create({
      codigo,
      simbolo: this.normalizeOptionalSimbolo(params.simbolo),
      nombre: this.normalizeRequiredNombre(params.nombre),
      decimales: this.normalizeDecimales(params.decimales, 2),
    });
  }

  async updateMoneda(monedaId: number, params: UpdateMonedaParams): Promise<void> {
    const hasAnyField =
      params.codigo !== undefined ||
      params.simbolo !== undefined ||
      params.nombre !== undefined ||
      params.decimales !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.monedaRepository.findById(monedaId);
    if (!current) {
      throw new NotFoundException('Moneda no existe');
    }

    const nextCodigo =
      params.codigo !== undefined
        ? this.normalizeCodigo(params.codigo)
        : current.codigo;
    const nextSimbolo =
      params.simbolo !== undefined
        ? this.normalizeOptionalSimbolo(params.simbolo)
        : current.simbolo ?? null;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredNombre(params.nombre)
        : current.nombre;
    const nextDecimales =
      params.decimales !== undefined
        ? this.normalizeDecimales(params.decimales)
        : current.decimales;

    const isDuplicate = await this.monedaRepository.existsByCodigo(
      nextCodigo,
      monedaId,
    );
    if (isDuplicate) {
      throw new ConflictException('Ya existe una moneda con ese codigo');
    }

    await this.monedaRepository.update(monedaId, {
      codigo: nextCodigo,
      simbolo: nextSimbolo,
      nombre: nextNombre,
      decimales: nextDecimales,
    });
  }

  private normalizeCodigo(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (normalized.length !== 3) {
      throw new BadRequestException('El campo codigo debe tener exactamente 3 caracteres');
    }
    return normalized;
  }

  private normalizeRequiredNombre(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('El campo nombre no puede estar vacio');
    }
    if (normalized.length > 60) {
      throw new BadRequestException('El campo nombre no puede exceder 60 caracteres');
    }
    return normalized;
  }

  private normalizeOptionalSimbolo(value?: string | null): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 10) {
      throw new BadRequestException('El campo simbolo no puede exceder 10 caracteres');
    }
    return normalized;
  }

  private normalizeDecimales(value: number | undefined, fallback?: number): number {
    const normalized = value ?? fallback;
    if (normalized === undefined) {
      throw new BadRequestException('El campo decimales es requerido');
    }
    if (!Number.isInteger(normalized) || normalized < 0 || normalized > 255) {
      throw new BadRequestException('El campo decimales debe ser un entero entre 0 y 255');
    }
    return normalized;
  }
}
