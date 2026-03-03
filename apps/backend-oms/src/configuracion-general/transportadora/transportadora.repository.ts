import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateTransportadoraInput,
  TransportadoraBootstrapData,
  TransportadoraEmpresaListItem,
  TransportadoraListItem,
  UpdateTransportadoraInput,
} from './transportadora.types';

type TransportadoraRow = {
  TransportadoraId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  TrackingUrlTemplate: string | null;
  Activo: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type TransportadoraIdentityRow = {
  TransportadoraId: number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

@Injectable()
export class TransportadoraRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<TransportadoraListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<TransportadoraRow>>(
      (pool) =>
        pool.request().query<TransportadoraRow>(`
          SELECT
            [TransportadoraId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [TrackingUrlTemplate],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Transportadora]
          ORDER BY [Nombre] ASC, [TransportadoraId] ASC
        `),
      'transportadora.list',
    );

    return result.recordset.map((row) => this.mapTransportadoraRow(row));
  }

  async listBootstrapData(): Promise<TransportadoraBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [TransportadoraId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [TrackingUrlTemplate],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Transportadora]
          ORDER BY [Nombre] ASC, [TransportadoraId] ASC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;
        `),
      'transportadora.listBootstrapData',
    );

    const transportadorasRows = (result.recordsets?.[0] ?? []) as TransportadoraRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];

    return {
      transportadoras: transportadorasRows.map((row) => this.mapTransportadoraRow(row)),
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
    };
  }

  async findById(transportadoraId: number): Promise<TransportadoraListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<TransportadoraRow>>(
      (pool) =>
        pool
          .request()
          .input('transportadoraId', sql.Int, transportadoraId)
          .query<TransportadoraRow>(`
            SELECT
              [TransportadoraId],
              [EmpresaId],
              [Codigo],
              [Nombre],
              [TrackingUrlTemplate],
              [Activo],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[Transportadora]
            WHERE [TransportadoraId] = @transportadoraId
          `),
      'transportadora.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapTransportadoraRow(row);
  }

  async existsByEmpresaAndCodigo(
    empresaId: number,
    codigo: string,
    excludeTransportadoraId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('codigo', sql.NVarChar(60), codigo)
          .input('excludeTransportadoraId', sql.Int, excludeTransportadoraId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Transportadora]
            WHERE [EmpresaId] = @empresaId
              AND [Codigo] = @codigo
              AND (@excludeTransportadoraId IS NULL OR [TransportadoraId] <> @excludeTransportadoraId)
          `),
      'transportadora.existsByEmpresaAndCodigo',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
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
      'transportadora.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateTransportadoraInput): Promise<{ transportadoraId: number }> {
    const result = await this.databaseService.execute<sql.IResult<TransportadoraIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('Codigo', sql.NVarChar(60), input.codigo)
          .input('Nombre', sql.NVarChar(180), input.nombre)
          .input('TrackingUrlTemplate', sql.NVarChar(255), input.trackingUrlTemplate)
          .input('Activo', sql.Bit, input.activo)
          .query<TransportadoraIdentityRow>(`
            INSERT INTO [oms].[Transportadora]
            (
              [EmpresaId],
              [Codigo],
              [Nombre],
              [TrackingUrlTemplate],
              [Activo],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[TransportadoraId]
            VALUES
            (
              @EmpresaId,
              @Codigo,
              @Nombre,
              @TrackingUrlTemplate,
              @Activo,
              NULL
            )
          `),
      'transportadora.create',
    );

    return { transportadoraId: result.recordset[0].TransportadoraId };
  }

  async update(
    transportadoraId: number,
    input: UpdateTransportadoraInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('transportadoraId', sql.Int, transportadoraId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('codigo', sql.NVarChar(60), input.codigo)
          .input('nombre', sql.NVarChar(180), input.nombre)
          .input('trackingUrlTemplate', sql.NVarChar(255), input.trackingUrlTemplate)
          .input('activo', sql.Bit, input.activo)
          .query(`
            UPDATE [oms].[Transportadora]
            SET
              [EmpresaId] = @empresaId,
              [Codigo] = @codigo,
              [Nombre] = @nombre,
              [TrackingUrlTemplate] = @trackingUrlTemplate,
              [Activo] = @activo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [TransportadoraId] = @transportadoraId
          `),
      'transportadora.update',
    );
  }

  private mapTransportadoraRow(row: TransportadoraRow): TransportadoraListItem {
    return {
      transportadoraId: row.TransportadoraId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      trackingUrlTemplate: row.TrackingUrlTemplate ?? undefined,
      activo: row.Activo,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): TransportadoraEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }
}
