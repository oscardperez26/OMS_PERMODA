import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CostoTransporteBootstrapData,
  CostoTransporteEmpresaListItem,
  CostoTransporteListItem,
  CostoTransporteMonedaListItem,
  CostoTransporteRangeCandidate,
  CostoTransporteTransportadoraListItem,
  CostoTransporteZonaListItem,
  CreateCostoTransporteInput,
  UpdateCostoTransporteInput,
} from './costo-transporte.types';

type CostoTransporteRow = {
  CostoTransporteId: string | number;
  EmpresaId: number;
  ZonaTransporteId: number;
  TransportadoraId: number;
  MonedaId: number;
  PesoMinKg: string | number | null;
  PesoMaxKg: string | number | null;
  ValorMin: string | number | null;
  ValorMax: string | number | null;
  Costo: string | number;
  DiasMin: number | null;
  DiasMax: number | null;
  Activo: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type CostoTransporteIdentityRow = {
  CostoTransporteId: string | number;
};

type CostoTransporteRangeRow = {
  CostoTransporteId: string | number;
  PesoMinKg: string | number | null;
  PesoMaxKg: string | number | null;
  ValorMin: string | number | null;
  ValorMax: string | number | null;
  DiasMin: number | null;
  DiasMax: number | null;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type ZonaRow = {
  ZonaTransporteId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type TransportadoraRow = {
  TransportadoraId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type MonedaRow = {
  MonedaId: number;
  Codigo: string;
  Nombre: string;
};

@Injectable()
export class CostoTransporteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<CostoTransporteListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<CostoTransporteRow>>(
      (pool) =>
        pool.request().query<CostoTransporteRow>(`
          SELECT
            [CostoTransporteId],
            [EmpresaId],
            [ZonaTransporteId],
            [TransportadoraId],
            [MonedaId],
            [PesoMinKg],
            [PesoMaxKg],
            [ValorMin],
            [ValorMax],
            [Costo],
            [DiasMin],
            [DiasMax],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[CostoTransporte]
          ORDER BY
            [EmpresaId] ASC,
            [ZonaTransporteId] ASC,
            [TransportadoraId] ASC,
            [MonedaId] ASC,
            [CostoTransporteId] ASC
        `),
      'costo-transporte.list',
    );

    return result.recordset.map((row) => this.mapCostoTransporteRow(row));
  }

  async listBootstrapData(): Promise<CostoTransporteBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [CostoTransporteId],
            [EmpresaId],
            [ZonaTransporteId],
            [TransportadoraId],
            [MonedaId],
            [PesoMinKg],
            [PesoMaxKg],
            [ValorMin],
            [ValorMax],
            [Costo],
            [DiasMin],
            [DiasMax],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[CostoTransporte]
          ORDER BY
            [EmpresaId] ASC,
            [ZonaTransporteId] ASC,
            [TransportadoraId] ASC,
            [MonedaId] ASC,
            [CostoTransporteId] ASC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [ZonaTransporteId],
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[ZonaTransporte]
          ORDER BY [Nombre] ASC, [ZonaTransporteId] ASC;

          SELECT
            [TransportadoraId],
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Transportadora]
          ORDER BY [Nombre] ASC, [TransportadoraId] ASC;

          SELECT
            [MonedaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Moneda]
          ORDER BY [Nombre] ASC, [MonedaId] ASC;
        `),
      'costo-transporte.listBootstrapData',
    );

    const costosRows = (result.recordsets?.[0] ?? []) as CostoTransporteRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const zonasRows = (result.recordsets?.[2] ?? []) as ZonaRow[];
    const transportadorasRows = (result.recordsets?.[3] ?? []) as TransportadoraRow[];
    const monedasRows = (result.recordsets?.[4] ?? []) as MonedaRow[];

    return {
      costosTransporte: costosRows.map((row) => this.mapCostoTransporteRow(row)),
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
      zonasTransporte: zonasRows.map((row) => this.mapZonaRow(row)),
      transportadoras: transportadorasRows.map((row) => this.mapTransportadoraRow(row)),
      monedas: monedasRows.map((row) => this.mapMonedaRow(row)),
    };
  }

  async findById(costoTransporteId: string): Promise<CostoTransporteListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<CostoTransporteRow>>(
      (pool) =>
        pool
          .request()
          .input('costoTransporteId', sql.BigInt, costoTransporteId)
          .query<CostoTransporteRow>(`
            SELECT
              [CostoTransporteId],
              [EmpresaId],
              [ZonaTransporteId],
              [TransportadoraId],
              [MonedaId],
              [PesoMinKg],
              [PesoMaxKg],
              [ValorMin],
              [ValorMax],
              [Costo],
              [DiasMin],
              [DiasMax],
              [Activo],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[CostoTransporte]
            WHERE [CostoTransporteId] = @costoTransporteId
          `),
      'costo-transporte.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapCostoTransporteRow(row);
  }

  async existsExactDuplicate(
    input: CreateCostoTransporteInput,
    excludeCostoTransporteId?: string,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, input.empresaId)
          .input('zonaTransporteId', sql.Int, input.zonaTransporteId)
          .input('transportadoraId', sql.Int, input.transportadoraId)
          .input('monedaId', sql.Int, input.monedaId)
          .input('pesoMinKg', sql.Decimal(10, 3), input.pesoMinKg)
          .input('pesoMaxKg', sql.Decimal(10, 3), input.pesoMaxKg)
          .input('valorMin', sql.Decimal(18, 2), input.valorMin)
          .input('valorMax', sql.Decimal(18, 2), input.valorMax)
          .input('diasMin', sql.Int, input.diasMin)
          .input('diasMax', sql.Int, input.diasMax)
          .input('excludeCostoTransporteId', sql.BigInt, excludeCostoTransporteId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[CostoTransporte]
            WHERE [EmpresaId] = @empresaId
              AND [ZonaTransporteId] = @zonaTransporteId
              AND [TransportadoraId] = @transportadoraId
              AND [MonedaId] = @monedaId
              AND ((@pesoMinKg IS NULL AND [PesoMinKg] IS NULL) OR [PesoMinKg] = @pesoMinKg)
              AND ((@pesoMaxKg IS NULL AND [PesoMaxKg] IS NULL) OR [PesoMaxKg] = @pesoMaxKg)
              AND ((@valorMin IS NULL AND [ValorMin] IS NULL) OR [ValorMin] = @valorMin)
              AND ((@valorMax IS NULL AND [ValorMax] IS NULL) OR [ValorMax] = @valorMax)
              AND ((@diasMin IS NULL AND [DiasMin] IS NULL) OR [DiasMin] = @diasMin)
              AND ((@diasMax IS NULL AND [DiasMax] IS NULL) OR [DiasMax] = @diasMax)
              AND (
                @excludeCostoTransporteId IS NULL
                OR [CostoTransporteId] <> @excludeCostoTransporteId
              )
          `),
      'costo-transporte.existsExactDuplicate',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async listActiveByCombination(
    empresaId: number,
    zonaTransporteId: number,
    transportadoraId: number,
    monedaId: number,
    excludeCostoTransporteId?: string,
  ): Promise<CostoTransporteRangeCandidate[]> {
    const result = await this.databaseService.execute<sql.IResult<CostoTransporteRangeRow>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .input('transportadoraId', sql.Int, transportadoraId)
          .input('monedaId', sql.Int, monedaId)
          .input('excludeCostoTransporteId', sql.BigInt, excludeCostoTransporteId ?? null)
          .query<CostoTransporteRangeRow>(`
            SELECT
              [CostoTransporteId],
              [PesoMinKg],
              [PesoMaxKg],
              [ValorMin],
              [ValorMax],
              [DiasMin],
              [DiasMax]
            FROM [oms].[CostoTransporte]
            WHERE [EmpresaId] = @empresaId
              AND [ZonaTransporteId] = @zonaTransporteId
              AND [TransportadoraId] = @transportadoraId
              AND [MonedaId] = @monedaId
              AND [Activo] = 1
              AND (
                @excludeCostoTransporteId IS NULL
                OR [CostoTransporteId] <> @excludeCostoTransporteId
              )
          `),
      'costo-transporte.listActiveByCombination',
    );

    return result.recordset.map((row) => ({
      costoTransporteId: this.toStringId(row.CostoTransporteId),
      pesoMinKg: this.toNullableNumber(row.PesoMinKg),
      pesoMaxKg: this.toNullableNumber(row.PesoMaxKg),
      valorMin: this.toNullableNumber(row.ValorMin),
      valorMax: this.toNullableNumber(row.ValorMax),
      diasMin: row.DiasMin ?? null,
      diasMax: row.DiasMax ?? null,
    }));
  }

  async existsEmpresaById(empresaId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Empresa]
            WHERE [EmpresaId] = @empresaId
          `),
      'costo-transporte.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsZonaTransporteById(zonaTransporteId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[ZonaTransporte]
            WHERE [ZonaTransporteId] = @zonaTransporteId
          `),
      'costo-transporte.existsZonaTransporteById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsZonaTransporteByIdAndEmpresaId(
    zonaTransporteId: number,
    empresaId: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[ZonaTransporte]
            WHERE [ZonaTransporteId] = @zonaTransporteId
              AND [EmpresaId] = @empresaId
          `),
      'costo-transporte.existsZonaTransporteByIdAndEmpresaId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsTransportadoraById(transportadoraId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('transportadoraId', sql.Int, transportadoraId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Transportadora]
            WHERE [TransportadoraId] = @transportadoraId
          `),
      'costo-transporte.existsTransportadoraById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsTransportadoraByIdAndEmpresaId(
    transportadoraId: number,
    empresaId: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('transportadoraId', sql.Int, transportadoraId)
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Transportadora]
            WHERE [TransportadoraId] = @transportadoraId
              AND [EmpresaId] = @empresaId
          `),
      'costo-transporte.existsTransportadoraByIdAndEmpresaId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsMonedaById(monedaId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('monedaId', sql.Int, monedaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Moneda]
            WHERE [MonedaId] = @monedaId
          `),
      'costo-transporte.existsMonedaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(
    input: CreateCostoTransporteInput,
  ): Promise<{ costoTransporteId: string }> {
    const result = await this.databaseService.execute<sql.IResult<CostoTransporteIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('ZonaTransporteId', sql.Int, input.zonaTransporteId)
          .input('TransportadoraId', sql.Int, input.transportadoraId)
          .input('MonedaId', sql.Int, input.monedaId)
          .input('PesoMinKg', sql.Decimal(10, 3), input.pesoMinKg)
          .input('PesoMaxKg', sql.Decimal(10, 3), input.pesoMaxKg)
          .input('ValorMin', sql.Decimal(18, 2), input.valorMin)
          .input('ValorMax', sql.Decimal(18, 2), input.valorMax)
          .input('Costo', sql.Decimal(18, 2), input.costo)
          .input('DiasMin', sql.Int, input.diasMin)
          .input('DiasMax', sql.Int, input.diasMax)
          .input('Activo', sql.Bit, input.activo)
          .query<CostoTransporteIdentityRow>(`
            INSERT INTO [oms].[CostoTransporte]
            (
              [EmpresaId],
              [ZonaTransporteId],
              [TransportadoraId],
              [MonedaId],
              [PesoMinKg],
              [PesoMaxKg],
              [ValorMin],
              [ValorMax],
              [Costo],
              [DiasMin],
              [DiasMax],
              [Activo],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[CostoTransporteId]
            VALUES
            (
              @EmpresaId,
              @ZonaTransporteId,
              @TransportadoraId,
              @MonedaId,
              @PesoMinKg,
              @PesoMaxKg,
              @ValorMin,
              @ValorMax,
              @Costo,
              @DiasMin,
              @DiasMax,
              @Activo,
              NULL
            )
          `),
      'costo-transporte.create',
    );

    return { costoTransporteId: this.toStringId(result.recordset[0].CostoTransporteId) };
  }

  async update(
    costoTransporteId: string,
    input: UpdateCostoTransporteInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('costoTransporteId', sql.BigInt, costoTransporteId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('zonaTransporteId', sql.Int, input.zonaTransporteId)
          .input('transportadoraId', sql.Int, input.transportadoraId)
          .input('monedaId', sql.Int, input.monedaId)
          .input('pesoMinKg', sql.Decimal(10, 3), input.pesoMinKg)
          .input('pesoMaxKg', sql.Decimal(10, 3), input.pesoMaxKg)
          .input('valorMin', sql.Decimal(18, 2), input.valorMin)
          .input('valorMax', sql.Decimal(18, 2), input.valorMax)
          .input('costo', sql.Decimal(18, 2), input.costo)
          .input('diasMin', sql.Int, input.diasMin)
          .input('diasMax', sql.Int, input.diasMax)
          .input('activo', sql.Bit, input.activo)
          .query(`
            UPDATE [oms].[CostoTransporte]
            SET
              [EmpresaId] = @empresaId,
              [ZonaTransporteId] = @zonaTransporteId,
              [TransportadoraId] = @transportadoraId,
              [MonedaId] = @monedaId,
              [PesoMinKg] = @pesoMinKg,
              [PesoMaxKg] = @pesoMaxKg,
              [ValorMin] = @valorMin,
              [ValorMax] = @valorMax,
              [Costo] = @costo,
              [DiasMin] = @diasMin,
              [DiasMax] = @diasMax,
              [Activo] = @activo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [CostoTransporteId] = @costoTransporteId
          `),
      'costo-transporte.update',
    );
  }

  private mapCostoTransporteRow(row: CostoTransporteRow): CostoTransporteListItem {
    return {
      costoTransporteId: this.toStringId(row.CostoTransporteId),
      empresaId: row.EmpresaId,
      zonaTransporteId: row.ZonaTransporteId,
      transportadoraId: row.TransportadoraId,
      monedaId: row.MonedaId,
      pesoMinKg: this.toUndefinedNumber(row.PesoMinKg),
      pesoMaxKg: this.toUndefinedNumber(row.PesoMaxKg),
      valorMin: this.toUndefinedNumber(row.ValorMin),
      valorMax: this.toUndefinedNumber(row.ValorMax),
      costo: Number(row.Costo),
      diasMin: row.DiasMin ?? undefined,
      diasMax: row.DiasMax ?? undefined,
      activo: row.Activo,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): CostoTransporteEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapZonaRow(row: ZonaRow): CostoTransporteZonaListItem {
    return {
      zonaTransporteId: row.ZonaTransporteId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapTransportadoraRow(
    row: TransportadoraRow,
  ): CostoTransporteTransportadoraListItem {
    return {
      transportadoraId: row.TransportadoraId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapMonedaRow(row: MonedaRow): CostoTransporteMonedaListItem {
    return {
      monedaId: row.MonedaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private toStringId(value: string | number): string {
    return String(value);
  }

  private toNullableNumber(value: string | number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return Number(value);
  }

  private toUndefinedNumber(value: string | number | null): number | undefined {
    const normalized = this.toNullableNumber(value);
    return normalized === null ? undefined : normalized;
  }
}
