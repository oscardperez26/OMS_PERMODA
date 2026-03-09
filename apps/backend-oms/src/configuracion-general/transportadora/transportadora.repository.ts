import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateTransportadoraInput,
  TransportadoraBootstrapData,
  TransportadoraConfiguracionDetail,
  TransportadoraConfigItem,
  TransportadoraEmpresaListItem,
  TransportadoraListItem,
  TransportadoraTiendaItem,
  UpdateTransportadoraConfiguracionInput,
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

type TransportadoraWithConfigRow = TransportadoraRow & {
  Servicio: string | null;
  PermiteExpress: boolean | null;
  ModuloCode: string | null;
  CosteFijo: string | number | null;
  DistanciaFijaKm: string | number | null;
  CosteIncrementalKm: string | number | null;
  ConfigCreatedAt: Date | null;
  ConfigUpdatedAt: Date | null;
};

type TransportadoraIdentityRow = {
  TransportadoraId: number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type TiendaRow = {
  TiendaId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  Activo: boolean;
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

  async findConfiguracionById(
    transportadoraId: number,
  ): Promise<TransportadoraConfiguracionDetail | null> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('transportadoraId', sql.Int, transportadoraId)
          .query(`
            SELECT
              t.[TransportadoraId],
              t.[EmpresaId],
              t.[Codigo],
              t.[Nombre],
              t.[TrackingUrlTemplate],
              t.[Activo],
              t.[CreatedAt],
              t.[UpdatedAt],
              cfg.[Servicio],
              cfg.[PermiteExpress],
              cfg.[ModuloCode],
              cfg.[CosteFijo],
              cfg.[DistanciaFijaKm],
              cfg.[CosteIncrementalKm],
              cfg.[CreatedAt] AS [ConfigCreatedAt],
              cfg.[UpdatedAt] AS [ConfigUpdatedAt]
            FROM [oms].[Transportadora] t
            LEFT JOIN [oms].[TransportadoraConfig] cfg
              ON cfg.[TransportadoraId] = t.[TransportadoraId]
            WHERE t.[TransportadoraId] = @transportadoraId;

            SELECT
              ti.[TiendaId],
              ti.[EmpresaId],
              ti.[Codigo],
              ti.[Nombre],
              ti.[Activo]
            FROM [oms].[TransportadoraTienda] tt
            INNER JOIN [oms].[Tienda] ti
              ON ti.[TiendaId] = tt.[TiendaId]
            WHERE tt.[TransportadoraId] = @transportadoraId
              AND tt.[Activo] = 1
            ORDER BY ti.[Nombre] ASC, ti.[TiendaId] ASC;

            SELECT
              ti.[TiendaId],
              ti.[EmpresaId],
              ti.[Codigo],
              ti.[Nombre],
              ti.[Activo]
            FROM [oms].[Tienda] ti
            INNER JOIN [oms].[Transportadora] t
              ON t.[EmpresaId] = ti.[EmpresaId]
            WHERE t.[TransportadoraId] = @transportadoraId
            ORDER BY ti.[Nombre] ASC, ti.[TiendaId] ASC;
          `),
      'transportadora.findConfiguracionById',
    );

    const baseRow = (result.recordsets?.[0]?.[0] ?? null) as
      | TransportadoraWithConfigRow
      | null;
    if (!baseRow) {
      return null;
    }

    const tiendasSeleccionadasRows = (result.recordsets?.[1] ?? []) as TiendaRow[];
    const tiendasDisponiblesRows = (result.recordsets?.[2] ?? []) as TiendaRow[];

    return {
      transportadora: this.mapTransportadoraRow(baseRow),
      config: this.mapTransportadoraConfigRow(baseRow),
      tiendasSeleccionadas: tiendasSeleccionadasRows.map((row) => this.mapTiendaRow(row)),
      tiendasDisponibles: tiendasDisponiblesRows.map((row) => this.mapTiendaRow(row)),
    };
  }

  async findTiendasByIds(tiendaIds: number[]): Promise<TransportadoraTiendaItem[]> {
    const normalized = [
      ...new Set(tiendaIds.filter((value) => Number.isInteger(value) && value > 0)),
    ];
    if (normalized.length === 0) {
      return [];
    }

    const result = await this.databaseService.execute<sql.IResult<TiendaRow>>(
      (pool) => {
        const request = pool.request();
        const paramNames = this.bindTiendaIds(request, normalized);
        const inClause = this.toInClause(paramNames);

        return request.query<TiendaRow>(`
          SELECT
            [TiendaId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Activo]
          FROM [oms].[Tienda]
          WHERE [TiendaId] IN (${inClause})
          ORDER BY [TiendaId] ASC
        `);
      },
      'transportadora.findTiendasByIds',
    );

    return result.recordset.map((row) => this.mapTiendaRow(row));
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

  async updateConfiguracion(
    transportadoraId: number,
    input: UpdateTransportadoraConfiguracionInput,
  ): Promise<void> {
    await this.databaseService.execute(
      async (pool) => {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
          await new sql.Request(transaction)
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
            `);

          await new sql.Request(transaction)
            .input('transportadoraId', sql.Int, transportadoraId)
            .input('servicio', sql.NVarChar(120), input.servicio)
            .input('permiteExpress', sql.Bit, input.permiteExpress)
            .input('moduloCode', sql.NVarChar(120), input.moduloCode)
            .input('costeFijo', sql.Decimal(18, 6), input.costeFijo)
            .input('distanciaFijaKm', sql.Decimal(18, 6), input.distanciaFijaKm)
            .input('costeIncrementalKm', sql.Decimal(18, 6), input.costeIncrementalKm)
            .query(`
              MERGE [oms].[TransportadoraConfig] AS target
              USING (SELECT @transportadoraId AS [TransportadoraId]) AS source
              ON target.[TransportadoraId] = source.[TransportadoraId]
              WHEN MATCHED THEN
                UPDATE SET
                  [Servicio] = @servicio,
                  [PermiteExpress] = @permiteExpress,
                  [ModuloCode] = @moduloCode,
                  [CosteFijo] = @costeFijo,
                  [DistanciaFijaKm] = @distanciaFijaKm,
                  [CosteIncrementalKm] = @costeIncrementalKm,
                  [UpdatedAt] = SYSUTCDATETIME()
              WHEN NOT MATCHED THEN
                INSERT
                (
                  [TransportadoraId],
                  [Servicio],
                  [PermiteExpress],
                  [ModuloCode],
                  [CosteFijo],
                  [DistanciaFijaKm],
                  [CosteIncrementalKm],
                  [CreatedAt],
                  [UpdatedAt]
                )
                VALUES
                (
                  @transportadoraId,
                  @servicio,
                  @permiteExpress,
                  @moduloCode,
                  @costeFijo,
                  @distanciaFijaKm,
                  @costeIncrementalKm,
                  SYSUTCDATETIME(),
                  NULL
                );
            `);

          const tiendaIds = [...new Set(input.tiendaIds)];
          if (tiendaIds.length > 0) {
            const requestActivate = new sql.Request(transaction).input(
              'transportadoraId',
              sql.Int,
              transportadoraId,
            );
            const activateParamNames = this.bindTiendaIds(requestActivate, tiendaIds);
            const activateInClause = this.toInClause(activateParamNames);

            await requestActivate.query(`
              UPDATE [oms].[TransportadoraTienda]
              SET
                [Activo] = 1,
                [UpdatedAt] = SYSUTCDATETIME()
              WHERE [TransportadoraId] = @transportadoraId
                AND [TiendaId] IN (${activateInClause})
            `);

            const requestInsert = new sql.Request(transaction).input(
              'transportadoraId',
              sql.Int,
              transportadoraId,
            );
            const insertParamNames = this.bindTiendaIds(requestInsert, tiendaIds);
            const insertValuesClause = this.toValuesClause(insertParamNames);
            await requestInsert.query(`
              INSERT INTO [oms].[TransportadoraTienda]
              (
                [TransportadoraId],
                [TiendaId],
                [Activo],
                [CreatedAt],
                [UpdatedAt]
              )
              SELECT
                @transportadoraId,
                src.[TiendaId],
                1,
                SYSUTCDATETIME(),
                NULL
              FROM (VALUES ${insertValuesClause}) AS src([TiendaId])
              WHERE NOT EXISTS (
                SELECT 1
                FROM [oms].[TransportadoraTienda] tt
                WHERE tt.[TransportadoraId] = @transportadoraId
                  AND tt.[TiendaId] = src.[TiendaId]
              )
            `);

            const requestDeactivate = new sql.Request(transaction).input(
              'transportadoraId',
              sql.Int,
              transportadoraId,
            );
            const deactivateParamNames = this.bindTiendaIds(
              requestDeactivate,
              tiendaIds,
            );
            const deactivateInClause = this.toInClause(deactivateParamNames);
            await requestDeactivate.query(`
              UPDATE [oms].[TransportadoraTienda]
              SET
                [Activo] = 0,
                [UpdatedAt] = SYSUTCDATETIME()
              WHERE [TransportadoraId] = @transportadoraId
                AND [Activo] = 1
                AND [TiendaId] NOT IN (${deactivateInClause})
            `);
          } else {
            await new sql.Request(transaction)
              .input('transportadoraId', sql.Int, transportadoraId)
              .query(`
                UPDATE [oms].[TransportadoraTienda]
                SET
                  [Activo] = 0,
                  [UpdatedAt] = SYSUTCDATETIME()
                WHERE [TransportadoraId] = @transportadoraId
                  AND [Activo] = 1
              `);
          }

          await transaction.commit();
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      },
      'transportadora.updateConfiguracion',
    );
  }

  private bindTiendaIds(request: sql.Request, tiendaIds: number[]): string[] {
    const paramNames: string[] = [];

    tiendaIds.forEach((tiendaId, index) => {
      const paramName = `tiendaId${index}`;
      request.input(paramName, sql.Int, tiendaId);
      paramNames.push(paramName);
    });

    return paramNames;
  }

  private toInClause(paramNames: string[]): string {
    return paramNames.map((paramName) => `@${paramName}`).join(', ');
  }

  private toValuesClause(paramNames: string[]): string {
    return paramNames.map((paramName) => `(@${paramName})`).join(', ');
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

  private mapTransportadoraConfigRow(row: TransportadoraWithConfigRow): TransportadoraConfigItem {
    return {
      servicio: row.Servicio ?? undefined,
      permiteExpress: row.PermiteExpress ?? false,
      moduloCode: row.ModuloCode ?? undefined,
      costeFijo: this.toUndefinedNumber(row.CosteFijo),
      distanciaFijaKm: this.toUndefinedNumber(row.DistanciaFijaKm),
      costeIncrementalKm: this.toUndefinedNumber(row.CosteIncrementalKm),
      createdAt: row.ConfigCreatedAt?.toISOString(),
      updatedAt: row.ConfigUpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): TransportadoraEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapTiendaRow(row: TiendaRow): TransportadoraTiendaItem {
    return {
      tiendaId: row.TiendaId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      activa: row.Activo,
    };
  }

  private toUndefinedNumber(value: string | number | null): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  }
}
