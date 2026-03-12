import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductoVarianteRepository } from './producto-variante.repository';
import type {
  ProductoVarianteBootstrapData,
  ProductoVarianteListItem,
} from './producto-variante.types';

type CreateProductoVarianteParams = {
  empresaId: number;
  productoId: number;
  sku: string;
  ean?: string;
  nombre?: string;
  pesoKg?: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  activo?: boolean;
};

type UpdateProductoVarianteParams = {
  empresaId?: number;
  productoId?: number;
  sku?: string;
  ean?: string | null;
  nombre?: string | null;
  pesoKg?: number | null;
  largoCm?: number | null;
  anchoCm?: number | null;
  altoCm?: number | null;
  activo?: boolean;
};

@Injectable()
export class ProductoVarianteService {
  constructor(
    private readonly productoVarianteRepository: ProductoVarianteRepository,
  ) {}

  async listVariantes(): Promise<ProductoVarianteListItem[]> {
    return this.productoVarianteRepository.list();
  }

  async getBootstrapData(): Promise<ProductoVarianteBootstrapData> {
    return this.productoVarianteRepository.listBootstrapData();
  }

  async getVarianteById(varianteId: number): Promise<ProductoVarianteListItem> {
    const variante = await this.productoVarianteRepository.findById(varianteId);
    if (!variante) {
      throw new NotFoundException('Producto variante no existe');
    }
    return variante;
  }

  async createVariante(
    params: CreateProductoVarianteParams,
  ): Promise<{ varianteId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const productoId = this.normalizeRequiredId(
      params.productoId,
      'productoId',
    );
    const sku = this.normalizeSku(params.sku);
    const ean = this.normalizeOptionalText(params.ean, 'ean', 120);
    const nombre = this.normalizeOptionalText(params.nombre, 'nombre', 255);
    const pesoKg = this.normalizeOptionalDecimal(params.pesoKg, 'pesoKg');
    const largoCm = this.normalizeOptionalDecimal(params.largoCm, 'largoCm');
    const anchoCm = this.normalizeOptionalDecimal(params.anchoCm, 'anchoCm');
    const altoCm = this.normalizeOptionalDecimal(params.altoCm, 'altoCm');
    const activo = this.normalizeBoolean(params.activo, true);

    const duplicated =
      await this.productoVarianteRepository.existsByEmpresaAndSku(
        empresaId,
        sku,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una variante con ese SKU en la empresa',
      );
    }

    await this.validateForeignKeys(empresaId, productoId);

    try {
      return await this.productoVarianteRepository.create({
        empresaId,
        productoId,
        sku,
        ean,
        nombre,
        pesoKg,
        largoCm,
        anchoCm,
        altoCm,
        activo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una variante con ese SKU en la empresa',
        );
      }
      throw error;
    }
  }

  async updateVariante(
    varianteId: number,
    params: UpdateProductoVarianteParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.productoId !== undefined ||
      params.sku !== undefined ||
      params.ean !== undefined ||
      params.nombre !== undefined ||
      params.pesoKg !== undefined ||
      params.largoCm !== undefined ||
      params.anchoCm !== undefined ||
      params.altoCm !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    const current = await this.productoVarianteRepository.findById(varianteId);
    if (!current) {
      throw new NotFoundException('Producto variante no existe');
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextProductoId =
      params.productoId !== undefined
        ? this.normalizeRequiredId(params.productoId, 'productoId')
        : current.productoId;
    const nextSku =
      params.sku !== undefined ? this.normalizeSku(params.sku) : current.sku;
    const nextEan =
      params.ean !== undefined
        ? this.normalizeOptionalText(params.ean, 'ean', 120)
        : (current.ean ?? null);
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeOptionalText(params.nombre, 'nombre', 255)
        : (current.nombre ?? null);
    const nextPesoKg =
      params.pesoKg !== undefined
        ? this.normalizeOptionalDecimal(params.pesoKg, 'pesoKg')
        : (current.pesoKg ?? null);
    const nextLargoCm =
      params.largoCm !== undefined
        ? this.normalizeOptionalDecimal(params.largoCm, 'largoCm')
        : (current.largoCm ?? null);
    const nextAnchoCm =
      params.anchoCm !== undefined
        ? this.normalizeOptionalDecimal(params.anchoCm, 'anchoCm')
        : (current.anchoCm ?? null);
    const nextAltoCm =
      params.altoCm !== undefined
        ? this.normalizeOptionalDecimal(params.altoCm, 'altoCm')
        : (current.altoCm ?? null);
    const nextActivo =
      params.activo !== undefined
        ? this.normalizeBoolean(params.activo)
        : current.activo;

    const duplicated =
      await this.productoVarianteRepository.existsByEmpresaAndSku(
        nextEmpresaId,
        nextSku,
        varianteId,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una variante con ese SKU en la empresa',
      );
    }

    await this.validateForeignKeys(nextEmpresaId, nextProductoId);

    try {
      await this.productoVarianteRepository.update(varianteId, {
        empresaId: nextEmpresaId,
        productoId: nextProductoId,
        sku: nextSku,
        ean: nextEan,
        nombre: nextNombre,
        pesoKg: nextPesoKg,
        largoCm: nextLargoCm,
        anchoCm: nextAnchoCm,
        altoCm: nextAltoCm,
        activo: nextActivo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una variante con ese SKU en la empresa',
        );
      }
      throw error;
    }
  }

  private async validateForeignKeys(
    empresaId: number,
    productoId: number,
  ): Promise<void> {
    const empresaExists =
      await this.productoVarianteRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    const productoExists =
      await this.productoVarianteRepository.existsProductoByIdAndEmpresaId(
        productoId,
        empresaId,
      );
    if (!productoExists) {
      throw new BadRequestException(
        'ProductoId no existe o no pertenece a la empresa seleccionada',
      );
    }
  }

  private normalizeSku(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('El campo sku no puede estar vacio');
    }
    if (normalized.length > 120) {
      throw new BadRequestException(
        'El campo sku no puede exceder 120 caracteres',
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

  private normalizeOptionalDecimal(
    value: number | null | undefined,
    fieldName: string,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `El campo ${fieldName} debe ser un numero >= 0`,
      );
    }
    return value;
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
