import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductoRepository } from './producto.repository';
import type { ProductoBootstrapData, ProductoListItem } from './producto.types';

type CreateProductoParams = {
  empresaId: number;
  skuBase?: string;
  nombre: string;
  activo?: boolean;
};

type UpdateProductoParams = {
  empresaId?: number;
  skuBase?: string;
  nombre?: string;
  activo?: boolean;
};

@Injectable()
export class ProductoService {
  constructor(private readonly productoRepository: ProductoRepository) {}

  async listProductos(): Promise<ProductoListItem[]> {
    return this.productoRepository.list();
  }

  async getBootstrapData(): Promise<ProductoBootstrapData> {
    return this.productoRepository.listBootstrapData();
  }

  async getProductoById(productoId: number): Promise<ProductoListItem> {
    const producto = await this.productoRepository.findById(productoId);
    if (!producto) {
      throw new NotFoundException('Producto no existe');
    }
    return producto;
  }

  async createProducto(
    params: CreateProductoParams,
  ): Promise<{ productoId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const skuBase = this.normalizeOptionalSkuBase(params.skuBase);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 255);
    const activo = this.normalizeBoolean(params.activo, true);

    const empresaExists = await this.productoRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (skuBase) {
      const duplicated = await this.productoRepository.existsByEmpresaAndSkuBase(
        empresaId,
        skuBase,
      );
      if (duplicated) {
        throw new ConflictException('Ya existe un producto con ese SKU base en la empresa');
      }
    }

    try {
      return await this.productoRepository.create({
        empresaId,
        skuBase,
        nombre,
        activo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe un producto con ese SKU base en la empresa');
      }
      throw error;
    }
  }

  async updateProducto(
    productoId: number,
    params: UpdateProductoParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.skuBase !== undefined ||
      params.nombre !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.productoRepository.findById(productoId);
    if (!current) {
      throw new NotFoundException('Producto no existe');
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextSkuBase =
      params.skuBase !== undefined
        ? this.normalizeOptionalSkuBase(params.skuBase)
        : current.skuBase ?? null;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 255)
        : current.nombre;
    const nextActivo =
      params.activo !== undefined ? this.normalizeBoolean(params.activo) : current.activo;

    const empresaExists = await this.productoRepository.existsEmpresaById(nextEmpresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    if (nextSkuBase) {
      const duplicated = await this.productoRepository.existsByEmpresaAndSkuBase(
        nextEmpresaId,
        nextSkuBase,
        productoId,
      );
      if (duplicated) {
        throw new ConflictException('Ya existe un producto con ese SKU base en la empresa');
      }
    }

    try {
      await this.productoRepository.update(productoId, {
        empresaId: nextEmpresaId,
        skuBase: nextSkuBase,
        nombre: nextNombre,
        activo: nextActivo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe un producto con ese SKU base en la empresa');
      }
      throw error;
    }
  }

  private normalizeRequiredId(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un entero mayor a 0`);
    }
    return value;
  }

  private normalizeOptionalSkuBase(value?: string): string | null {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 120) {
      throw new BadRequestException('El campo skuBase no puede exceder 120 caracteres');
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
