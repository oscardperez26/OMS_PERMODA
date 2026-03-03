import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateZonaTransporteInput,
  UpdateZonaTransporteInput,
  ZonaTransporteBootstrapData,
  ZonaTransporteEmpresaListItem,
  ZonaTransporteListItem,
  ZonaTransportePaisListItem,
} from './zona-transporte.types';

type ZonaTransporteRow = {
  ZonaTransporteId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  PaisId: number | null;
  Activo: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type ZonaTransporteIdentityRow = {
  ZonaTransporteId: number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type PaisRow = {
  PaisId: number;
  CodigoISO2: string;
  Nombre: string;
};

@Injectable()
export class ZonaTransporteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<ZonaTransporteListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<ZonaTransporteRow>>(
      (pool) =>
        pool.request().query<ZonaTransporteRow>(`
          SELECT
            [ZonaTransporteId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [PaisId],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[ZonaTransporte]
          ORDER BY [Nombre] ASC, [ZonaTransporteId] ASC
        `),
      'zona-transporte.list',
    );

    return result.recordset.map((row) => this.mapZonaTransporteRow(row));
  }

  async listBootstrapData(): Promise<ZonaTransporteBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [ZonaTransporteId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [PaisId],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[ZonaTransporte]
          ORDER BY [Nombre] ASC, [ZonaTransporteId] ASC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [PaisId],
            [CodigoISO2],
            [Nombre]
          FROM [oms].[Pais]
          ORDER BY [Nombre] ASC, [PaisId] ASC;
        `),
      'zona-transporte.listBootstrapData',
    );

    const zonasRows = (result.recordsets?.[0] ?? []) as ZonaTransporteRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const paisesRows = (result.recordsets?.[2] ?? []) as PaisRow[];

    return {
      zonasTransporte: zonasRows.map((row) => this.mapZonaTransporteRow(row)),
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
      paises: paisesRows.map((row) => this.mapPaisRow(row)),
    };
  }

  async findById(zonaTransporteId: number): Promise<ZonaTransporteListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<ZonaTransporteRow>>(
      (pool) =>
        pool
          .request()
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .query<ZonaTransporteRow>(`
            SELECT
              [ZonaTransporteId],
              [EmpresaId],
              [Codigo],
              [Nombre],
              [PaisId],
              [Activo],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[ZonaTransporte]
            WHERE [ZonaTransporteId] = @zonaTransporteId
          `),
      'zona-transporte.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapZonaTransporteRow(row);
  }

  async existsByEmpresaAndCodigo(
    empresaId: number,
    codigo: string,
    excludeZonaTransporteId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('codigo', sql.NVarChar(60), codigo)
          .input('excludeZonaTransporteId', sql.Int, excludeZonaTransporteId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[ZonaTransporte]
            WHERE [EmpresaId] = @empresaId
              AND [Codigo] = @codigo
              AND (@excludeZonaTransporteId IS NULL OR [ZonaTransporteId] <> @excludeZonaTransporteId)
          `),
      'zona-transporte.existsByEmpresaAndCodigo',
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
      'zona-transporte.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsPaisById(paisId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('paisId', sql.Int, paisId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Pais]
            WHERE [PaisId] = @paisId
          `),
      'zona-transporte.existsPaisById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(
    input: CreateZonaTransporteInput,
  ): Promise<{ zonaTransporteId: number }> {
    const result = await this.databaseService.execute<sql.IResult<ZonaTransporteIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('Codigo', sql.NVarChar(60), input.codigo)
          .input('Nombre', sql.NVarChar(180), input.nombre)
          .input('PaisId', sql.Int, input.paisId)
          .input('Activo', sql.Bit, input.activo)
          .query<ZonaTransporteIdentityRow>(`
            INSERT INTO [oms].[ZonaTransporte]
            (
              [EmpresaId],
              [Codigo],
              [Nombre],
              [PaisId],
              [Activo],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[ZonaTransporteId]
            VALUES
            (
              @EmpresaId,
              @Codigo,
              @Nombre,
              @PaisId,
              @Activo,
              NULL
            )
          `),
      'zona-transporte.create',
    );

    return { zonaTransporteId: result.recordset[0].ZonaTransporteId };
  }

  async update(
    zonaTransporteId: number,
    input: UpdateZonaTransporteInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('codigo', sql.NVarChar(60), input.codigo)
          .input('nombre', sql.NVarChar(180), input.nombre)
          .input('paisId', sql.Int, input.paisId)
          .input('activo', sql.Bit, input.activo)
          .query(`
            UPDATE [oms].[ZonaTransporte]
            SET
              [EmpresaId] = @empresaId,
              [Codigo] = @codigo,
              [Nombre] = @nombre,
              [PaisId] = @paisId,
              [Activo] = @activo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [ZonaTransporteId] = @zonaTransporteId
          `),
      'zona-transporte.update',
    );
  }

  private mapZonaTransporteRow(row: ZonaTransporteRow): ZonaTransporteListItem {
    return {
      zonaTransporteId: row.ZonaTransporteId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      paisId: row.PaisId ?? undefined,
      activo: row.Activo,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): ZonaTransporteEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapPaisRow(row: PaisRow): ZonaTransportePaisListItem {
    return {
      paisId: row.PaisId,
      codigoISO2: row.CodigoISO2,
      nombre: row.Nombre,
    };
  }
}
