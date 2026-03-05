import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventarioRepository } from './inventario.repository';
import type { InventarioBootstrapData, InventarioListItem } from './inventario.types';

type CreateInventarioParams = {
  empresaId: number;
  bodegaId: number;
  varianteId: number;
  stockTotal: number;
  stockReservado?: number;
};

type UpdateInventarioParams = {
  empresaId?: number;
  bodegaId?: number;
  varianteId?: number;
  stockTotal?: number;
  stockReservado?: number;
};

@Injectable()
export class InventarioService {
  constructor(private readonly inventarioRepository: InventarioRepository) {}

  async listInventarios(): Promise<InventarioListItem[]> {
    return this.inventarioRepository.list();
  }

  async getBootstrapData(): Promise<InventarioBootstrapData> {
    return this.inventarioRepository.listBootstrapData();
  }

  async getInventarioById(inventarioId: number): Promise<InventarioListItem> {
    const inventario = await this.inventarioRepository.findById(inventarioId);
    if (!inventario) {
      throw new NotFoundException('Inventario no existe');
    }
    return inventario;
  }

  async createInventario(
    params: CreateInventarioParams,
  ): Promise<{ inventarioId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const bodegaId = this.normalizeRequiredId(params.bodegaId, 'bodegaId');
    const varianteId = this.normalizeRequiredId(params.varianteId, 'varianteId');
    const stockTotal = this.normalizeStock(params.stockTotal, 'stockTotal');
    const stockReservado = this.normalizeStock(params.stockReservado ?? 0, 'stockReservado');

    this.validateStockConsistency(stockTotal, stockReservado);
    await this.validateForeignKeys(empresaId, bodegaId, varianteId);

    const duplicated = await this.inventarioRepository.existsByBodegaAndVariante(
      bodegaId,
      varianteId,
    );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe un registro de inventario para la combinacion bodega/variante',
      );
    }

    try {
      return await this.inventarioRepository.create({
        empresaId,
        bodegaId,
        varianteId,
        stockTotal,
        stockReservado,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe un registro de inventario para la combinacion bodega/variante',
        );
      }
      throw error;
    }
  }

  async updateInventario(
    inventarioId: number,
    params: UpdateInventarioParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.bodegaId !== undefined ||
      params.varianteId !== undefined ||
      params.stockTotal !== undefined ||
      params.stockReservado !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }

    const current = await this.inventarioRepository.findById(inventarioId);
    if (!current) {
      throw new NotFoundException('Inventario no existe');
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextBodegaId =
      params.bodegaId !== undefined
        ? this.normalizeRequiredId(params.bodegaId, 'bodegaId')
        : current.bodegaId;
    const nextVarianteId =
      params.varianteId !== undefined
        ? this.normalizeRequiredId(params.varianteId, 'varianteId')
        : current.varianteId;
    const nextStockTotal =
      params.stockTotal !== undefined
        ? this.normalizeStock(params.stockTotal, 'stockTotal')
        : current.stockTotal;
    const nextStockReservado =
      params.stockReservado !== undefined
        ? this.normalizeStock(params.stockReservado, 'stockReservado')
        : current.stockReservado;

    this.validateStockConsistency(nextStockTotal, nextStockReservado);
    await this.validateForeignKeys(nextEmpresaId, nextBodegaId, nextVarianteId);

    const duplicated = await this.inventarioRepository.existsByBodegaAndVariante(
      nextBodegaId,
      nextVarianteId,
      inventarioId,
    );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe un registro de inventario para la combinacion bodega/variante',
      );
    }

    try {
      await this.inventarioRepository.update(inventarioId, {
        empresaId: nextEmpresaId,
        bodegaId: nextBodegaId,
        varianteId: nextVarianteId,
        stockTotal: nextStockTotal,
        stockReservado: nextStockReservado,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe un registro de inventario para la combinacion bodega/variante',
        );
      }
      throw error;
    }
  }

  private async validateForeignKeys(
    empresaId: number,
    bodegaId: number,
    varianteId: number,
  ): Promise<void> {
    const empresaExists = await this.inventarioRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    const bodegaExists = await this.inventarioRepository.existsBodegaByIdAndEmpresaId(
      bodegaId,
      empresaId,
    );
    if (!bodegaExists) {
      throw new BadRequestException(
        'BodegaId no existe o no pertenece a la empresa seleccionada',
      );
    }

    const varianteExists = await this.inventarioRepository.existsVarianteByIdAndEmpresaId(
      varianteId,
      empresaId,
    );
    if (!varianteExists) {
      throw new BadRequestException(
        'VarianteId no existe o no pertenece a la empresa seleccionada',
      );
    }
  }

  private validateStockConsistency(stockTotal: number, stockReservado: number): void {
    if (stockReservado > stockTotal) {
      throw new BadRequestException('stockReservado no puede ser mayor que stockTotal');
    }
  }

  private normalizeRequiredId(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un entero mayor a 0`);
    }
    return value;
  }

  private normalizeStock(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(`El campo ${fieldName} debe ser un entero >= 0`);
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
