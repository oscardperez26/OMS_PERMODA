import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateIntegracionEntranteInput,
  IntegracionEntranteDedupeSummary,
  IntegracionEntranteCanalOption,
  IntegracionEntranteEmpresaOption,
  IntegracionEntrantePersistenceRow,
  IntegracionEntranteRunLog,
  UpdateIntegracionEntranteInput,
} from './integraciones-entrantes.types';

type IntegracionIdentityRow = {
  IntegracionId: number;
};

type CountRow = {
  count: number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type CanalVentaRow = {
  CanalVentaId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type DedupeSummaryRow = {
  Total: number;
  Ingestado: number;
  Duplicado: number;
  Failed: number;
  LastUpdatedAt: Date | null;
};

type RunLogRow = {
  CreatedAt: Date;
  DataJson: string | null;
  Mensaje: string | null;
};

@Injectable()
export class IntegracionesEntrantesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listWithCatalog(): Promise<{
    rows: IntegracionEntrantePersistenceRow[];
    empresas: IntegracionEntranteEmpresaOption[];
    canalesVenta: IntegracionEntranteCanalOption[];
  }> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            i.[IntegracionId],
            i.[EmpresaId],
            e.[Codigo] AS [EmpresaCodigo],
            e.[Nombre] AS [EmpresaNombre],
            i.[CanalVentaId],
            cv.[Codigo] AS [CanalVentaCodigo],
            cv.[Nombre] AS [CanalVentaNombre],
            i.[Codigo],
            i.[Nombre],
            i.[Estado],
            i.[ConfigJson],
            i.[CreatedAt],
            i.[UpdatedAt]
          FROM [oms].[Integracion] i
          INNER JOIN [oms].[Empresa] e
            ON e.[EmpresaId] = i.[EmpresaId]
          INNER JOIN [oms].[CanalVenta] cv
            ON cv.[CanalVentaId] = i.[CanalVentaId]
          ORDER BY i.[IntegracionId] ASC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [CanalVentaId],
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[CanalVenta]
          ORDER BY [EmpresaId] ASC, [Nombre] ASC, [CanalVentaId] ASC;
        `),
      'integraciones-entrantes.listWithCatalog',
    );

    const rows = (result.recordsets?.[0] ?? []) as IntegracionEntrantePersistenceRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const canalesRows = (result.recordsets?.[2] ?? []) as CanalVentaRow[];

    return {
      rows,
      empresas: empresasRows.map((row) => ({
        empresaId: row.EmpresaId,
        codigo: row.Codigo,
        nombre: row.Nombre,
      })),
      canalesVenta: canalesRows.map((row) => ({
        canalVentaId: row.CanalVentaId,
        empresaId: row.EmpresaId,
        codigo: row.Codigo,
        nombre: row.Nombre,
      })),
    };
  }

  async findById(
    integracionId: number,
  ): Promise<IntegracionEntrantePersistenceRow | null> {
    const result = await this.databaseService.execute<
      sql.IResult<IntegracionEntrantePersistenceRow>
    >(
      (pool) =>
        pool.request().input('integracionId', sql.Int, integracionId)
          .query<IntegracionEntrantePersistenceRow>(`
            SELECT
              i.[IntegracionId],
              i.[EmpresaId],
              e.[Codigo] AS [EmpresaCodigo],
              e.[Nombre] AS [EmpresaNombre],
              i.[CanalVentaId],
              cv.[Codigo] AS [CanalVentaCodigo],
              cv.[Nombre] AS [CanalVentaNombre],
              i.[Codigo],
              i.[Nombre],
              i.[Estado],
              i.[ConfigJson],
              i.[CreatedAt],
              i.[UpdatedAt]
            FROM [oms].[Integracion] i
            INNER JOIN [oms].[Empresa] e
              ON e.[EmpresaId] = i.[EmpresaId]
            INNER JOIN [oms].[CanalVenta] cv
              ON cv.[CanalVentaId] = i.[CanalVentaId]
            WHERE i.[IntegracionId] = @integracionId
          `),
      'integraciones-entrantes.findById',
    );

    return result.recordset[0] ?? null;
  }

  async listByEmpresaAndCanal(
    empresaId: number,
    canalVentaId: number,
  ): Promise<IntegracionEntrantePersistenceRow[]> {
    const result = await this.databaseService.execute<
      sql.IResult<IntegracionEntrantePersistenceRow>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('canalVentaId', sql.Int, canalVentaId)
          .query<IntegracionEntrantePersistenceRow>(`
            SELECT
              i.[IntegracionId],
              i.[EmpresaId],
              e.[Codigo] AS [EmpresaCodigo],
              e.[Nombre] AS [EmpresaNombre],
              i.[CanalVentaId],
              cv.[Codigo] AS [CanalVentaCodigo],
              cv.[Nombre] AS [CanalVentaNombre],
              i.[Codigo],
              i.[Nombre],
              i.[Estado],
              i.[ConfigJson],
              i.[CreatedAt],
              i.[UpdatedAt]
            FROM [oms].[Integracion] i
            INNER JOIN [oms].[Empresa] e
              ON e.[EmpresaId] = i.[EmpresaId]
            INNER JOIN [oms].[CanalVenta] cv
              ON cv.[CanalVentaId] = i.[CanalVentaId]
            WHERE i.[EmpresaId] = @empresaId
              AND i.[CanalVentaId] = @canalVentaId
            ORDER BY i.[IntegracionId] ASC
          `),
      'integraciones-entrantes.listByEmpresaAndCanal',
    );

    return result.recordset;
  }

  async listActive(): Promise<IntegracionEntrantePersistenceRow[]> {
    const result = await this.databaseService.execute<
      sql.IResult<IntegracionEntrantePersistenceRow>
    >(
      (pool) =>
        pool.request().query<IntegracionEntrantePersistenceRow>(`
            SELECT
              i.[IntegracionId],
              i.[EmpresaId],
              e.[Codigo] AS [EmpresaCodigo],
              e.[Nombre] AS [EmpresaNombre],
              i.[CanalVentaId],
              cv.[Codigo] AS [CanalVentaCodigo],
              cv.[Nombre] AS [CanalVentaNombre],
              i.[Codigo],
              i.[Nombre],
              i.[Estado],
              i.[ConfigJson],
              i.[CreatedAt],
              i.[UpdatedAt]
            FROM [oms].[Integracion] i
            INNER JOIN [oms].[Empresa] e
              ON e.[EmpresaId] = i.[EmpresaId]
            INNER JOIN [oms].[CanalVenta] cv
              ON cv.[CanalVentaId] = i.[CanalVentaId]
            WHERE i.[Estado] = 'ACTIVO'
            ORDER BY i.[IntegracionId] ASC
          `),
      'integraciones-entrantes.listActive',
    );

    return result.recordset;
  }

  async getDedupeSummaryByIntegracion(
    integracionId: number,
  ): Promise<IntegracionEntranteDedupeSummary | null> {
    const result = await this.databaseService.execute<sql.IResult<DedupeSummaryRow>>(
      (pool) =>
        pool
          .request()
          .input('integracionId', sql.Int, integracionId)
          .query<DedupeSummaryRow>(`
            BEGIN TRY
              IF OBJECT_ID('[oms].[IntegracionPedidoExterno]', 'U') IS NULL
                 OR COL_LENGTH('oms.IntegracionPedidoExterno', 'IntegracionId') IS NULL
              BEGIN
                SELECT
                  CAST(0 AS INT) AS [Total],
                  CAST(0 AS INT) AS [Ingestado],
                  CAST(0 AS INT) AS [Duplicado],
                  CAST(0 AS INT) AS [Failed],
                  CAST(NULL AS DATETIME2(0)) AS [LastUpdatedAt];
                RETURN;
              END;

              DECLARE @sql NVARCHAR(MAX) =
                N'SELECT COUNT(1) AS [Total], ' +
                N'CAST(0 AS INT) AS [Ingestado], ' +
                N'CAST(0 AS INT) AS [Duplicado], ' +
                N'CAST(0 AS INT) AS [Failed], ' +
                N'CAST(NULL AS DATETIME2(0)) AS [LastUpdatedAt] ' +
                N'FROM [oms].[IntegracionPedidoExterno] ' +
                N'WHERE [IntegracionId] = @integracionId';

              IF COL_LENGTH('oms.IntegracionPedidoExterno', 'Estado') IS NOT NULL
                 AND COL_LENGTH('oms.IntegracionPedidoExterno', 'CreatedAt') IS NOT NULL
                 AND COL_LENGTH('oms.IntegracionPedidoExterno', 'UpdatedAt') IS NOT NULL
              BEGIN
                SET @sql =
                  N'SELECT COUNT(1) AS [Total], ' +
                  N'SUM(CASE WHEN [Estado] = ''INGESTADO'' THEN 1 ELSE 0 END) AS [Ingestado], ' +
                  N'SUM(CASE WHEN [Estado] = ''DUPLICADO'' THEN 1 ELSE 0 END) AS [Duplicado], ' +
                  N'SUM(CASE WHEN [Estado] = ''FAILED'' THEN 1 ELSE 0 END) AS [Failed], ' +
                  N'MAX(CASE WHEN [UpdatedAt] IS NULL THEN [CreatedAt] ELSE [UpdatedAt] END) AS [LastUpdatedAt] ' +
                  N'FROM [oms].[IntegracionPedidoExterno] ' +
                  N'WHERE [IntegracionId] = @integracionId';
              END
              ELSE IF COL_LENGTH('oms.IntegracionPedidoExterno', 'CreatedAt') IS NOT NULL
              BEGIN
                SET @sql =
                  N'SELECT COUNT(1) AS [Total], ' +
                  N'CAST(0 AS INT) AS [Ingestado], ' +
                  N'CAST(0 AS INT) AS [Duplicado], ' +
                  N'CAST(0 AS INT) AS [Failed], ' +
                  N'MAX([CreatedAt]) AS [LastUpdatedAt] ' +
                  N'FROM [oms].[IntegracionPedidoExterno] ' +
                  N'WHERE [IntegracionId] = @integracionId';
              END;

              EXEC sp_executesql
                @sql,
                N'@integracionId INT',
                @integracionId = @integracionId;
            END TRY
            BEGIN CATCH
              SELECT
                CAST(0 AS INT) AS [Total],
                CAST(0 AS INT) AS [Ingestado],
                CAST(0 AS INT) AS [Duplicado],
                CAST(0 AS INT) AS [Failed],
                CAST(NULL AS DATETIME2(0)) AS [LastUpdatedAt];
            END CATCH;
          `),
      'integraciones-entrantes.getDedupeSummaryByIntegracion',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      total: Number(row.Total ?? 0),
      ingestado: Number(row.Ingestado ?? 0),
      duplicado: Number(row.Duplicado ?? 0),
      failed: Number(row.Failed ?? 0),
      lastUpdatedAt: row.LastUpdatedAt ? row.LastUpdatedAt.toISOString() : null,
    };
  }

  async listRecentSyncRuns(
    integracionId: number,
    limit: number,
  ): Promise<IntegracionEntranteRunLog[]> {
    const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;

    const result = await this.databaseService.execute<sql.IResult<RunLogRow>>(
      (pool) =>
        pool
          .request()
          .input('integracionId', sql.BigInt, integracionId)
          .input('limit', sql.Int, normalizedLimit)
          .query<RunLogRow>(`
            BEGIN TRY
              IF OBJECT_ID('[oms].[Log]', 'U') IS NULL
                 OR COL_LENGTH('oms.Log', 'CreatedAt') IS NULL
                 OR COL_LENGTH('oms.Log', 'Modulo') IS NULL
                 OR COL_LENGTH('oms.Log', 'Accion') IS NULL
                 OR COL_LENGTH('oms.Log', 'Entidad') IS NULL
                 OR COL_LENGTH('oms.Log', 'EntidadId') IS NULL
              BEGIN
                SELECT
                  CAST(NULL AS DATETIME2(0)) AS [CreatedAt],
                  CAST(NULL AS NVARCHAR(MAX)) AS [DataJson],
                  CAST(NULL AS NVARCHAR(510)) AS [Mensaje]
                WHERE 1 = 0;
                RETURN;
              END;

              DECLARE @logSql NVARCHAR(MAX) =
                N'SELECT TOP (@limit) [CreatedAt], ' +
                N'CAST(NULL AS NVARCHAR(MAX)) AS [DataJson], ' +
                N'CAST(NULL AS NVARCHAR(510)) AS [Mensaje] ' +
                N'FROM [oms].[Log] ' +
                N'WHERE [Modulo] = ''INTEGRACIONES_ENTRANTES'' ' +
                N'AND [Accion] = ''integraciones.entrantes.sync-now'' ' +
                N'AND [Entidad] = ''Integracion'' ' +
                N'AND [EntidadId] = @integracionId ' +
                N'ORDER BY [CreatedAt] DESC';

              IF COL_LENGTH('oms.Log', 'DataJson') IS NOT NULL
                 AND COL_LENGTH('oms.Log', 'Mensaje') IS NOT NULL
              BEGIN
                SET @logSql =
                  N'SELECT TOP (@limit) [CreatedAt], [DataJson], [Mensaje] ' +
                  N'FROM [oms].[Log] ' +
                  N'WHERE [Modulo] = ''INTEGRACIONES_ENTRANTES'' ' +
                  N'AND [Accion] = ''integraciones.entrantes.sync-now'' ' +
                  N'AND [Entidad] = ''Integracion'' ' +
                  N'AND [EntidadId] = @integracionId ' +
                  N'ORDER BY [CreatedAt] DESC';
              END
              ELSE IF COL_LENGTH('oms.Log', 'DataJson') IS NOT NULL
              BEGIN
                SET @logSql =
                  N'SELECT TOP (@limit) [CreatedAt], [DataJson], ' +
                  N'CAST(NULL AS NVARCHAR(510)) AS [Mensaje] ' +
                  N'FROM [oms].[Log] ' +
                  N'WHERE [Modulo] = ''INTEGRACIONES_ENTRANTES'' ' +
                  N'AND [Accion] = ''integraciones.entrantes.sync-now'' ' +
                  N'AND [Entidad] = ''Integracion'' ' +
                  N'AND [EntidadId] = @integracionId ' +
                  N'ORDER BY [CreatedAt] DESC';
              END
              ELSE IF COL_LENGTH('oms.Log', 'Mensaje') IS NOT NULL
              BEGIN
                SET @logSql =
                  N'SELECT TOP (@limit) [CreatedAt], ' +
                  N'CAST(NULL AS NVARCHAR(MAX)) AS [DataJson], [Mensaje] ' +
                  N'FROM [oms].[Log] ' +
                  N'WHERE [Modulo] = ''INTEGRACIONES_ENTRANTES'' ' +
                  N'AND [Accion] = ''integraciones.entrantes.sync-now'' ' +
                  N'AND [Entidad] = ''Integracion'' ' +
                  N'AND [EntidadId] = @integracionId ' +
                  N'ORDER BY [CreatedAt] DESC';
              END;

              EXEC sp_executesql
                @logSql,
                N'@integracionId BIGINT, @limit INT',
                @integracionId = @integracionId,
                @limit = @limit;
            END TRY
            BEGIN CATCH
              SELECT
                CAST(NULL AS DATETIME2(0)) AS [CreatedAt],
                CAST(NULL AS NVARCHAR(MAX)) AS [DataJson],
                CAST(NULL AS NVARCHAR(510)) AS [Mensaje]
              WHERE 1 = 0;
            END CATCH;
          `),
      'integraciones-entrantes.listRecentSyncRuns',
    );

    return result.recordset
      .map((row) => this.mapRunLogRow(row))
      .filter((item): item is IntegracionEntranteRunLog => item !== null);
  }

  async existsEmpresaById(empresaId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<CountRow>>(
      (pool) =>
        pool.request().input('empresaId', sql.Int, empresaId).query<CountRow>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Empresa]
            WHERE [EmpresaId] = @empresaId
          `),
      'integraciones-entrantes.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsCanalByIdAndEmpresa(
    canalVentaId: number,
    empresaId: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<CountRow>>(
      (pool) =>
        pool
          .request()
          .input('canalVentaId', sql.Int, canalVentaId)
          .input('empresaId', sql.Int, empresaId)
          .query<CountRow>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[CanalVenta]
            WHERE [CanalVentaId] = @canalVentaId
              AND [EmpresaId] = @empresaId
          `),
      'integraciones-entrantes.existsCanalByIdAndEmpresa',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsByEmpresaAndCodigo(
    empresaId: number,
    codigo: string,
    excludeIntegracionId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<CountRow>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('codigo', sql.NVarChar(120), codigo)
          .input('excludeIntegracionId', sql.Int, excludeIntegracionId ?? null)
          .query<CountRow>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Integracion]
            WHERE [EmpresaId] = @empresaId
              AND [Codigo] = @codigo
              AND (@excludeIntegracionId IS NULL OR [IntegracionId] <> @excludeIntegracionId)
          `),
      'integraciones-entrantes.existsByEmpresaAndCodigo',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(
    input: CreateIntegracionEntranteInput,
  ): Promise<{ integracionId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<IntegracionIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('CanalVentaId', sql.Int, input.canalVentaId)
          .input('Codigo', sql.NVarChar(120), input.codigo)
          .input('Nombre', sql.NVarChar(240), input.nombre)
          .input('ConfigJson', sql.NVarChar(sql.MAX), input.configJson)
          .input('Estado', sql.NVarChar(40), input.estado)
          .query<IntegracionIdentityRow>(`
            INSERT INTO [oms].[Integracion]
            (
              [EmpresaId],
              [CanalVentaId],
              [Codigo],
              [Nombre],
              [ConfigJson],
              [Estado],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[IntegracionId]
            VALUES
            (
              @EmpresaId,
              @CanalVentaId,
              @Codigo,
              @Nombre,
              @ConfigJson,
              @Estado,
              NULL
            )
          `),
      'integraciones-entrantes.create',
    );

    return { integracionId: result.recordset[0].IntegracionId };
  }

  async update(
    integracionId: number,
    input: UpdateIntegracionEntranteInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('integracionId', sql.Int, integracionId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('canalVentaId', sql.Int, input.canalVentaId)
          .input('codigo', sql.NVarChar(120), input.codigo)
          .input('nombre', sql.NVarChar(240), input.nombre)
          .input('configJson', sql.NVarChar(sql.MAX), input.configJson)
          .input('estado', sql.NVarChar(40), input.estado).query(`
            UPDATE [oms].[Integracion]
            SET
              [EmpresaId] = @empresaId,
              [CanalVentaId] = @canalVentaId,
              [Codigo] = @codigo,
              [Nombre] = @nombre,
              [ConfigJson] = @configJson,
              [Estado] = @estado,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [IntegracionId] = @integracionId
          `),
      'integraciones-entrantes.update',
    );
  }

  async insertOperationalLog(input: {
    empresaId: number;
    usuarioId: number | null;
    integracionId: number;
    accion: 'validate' | 'sync-now';
    nivel: 'INFO' | 'WARN' | 'ERROR';
    mensaje: string;
    dataJson: string;
  }): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, input.empresaId)
          .input('usuarioId', sql.Int, input.usuarioId)
          .input('nivel', sql.NVarChar(20), input.nivel)
          .input('entidad', sql.NVarChar(60), 'Integracion')
          .input('entidadId', sql.BigInt, input.integracionId)
          .input('modulo', sql.NVarChar(160), 'INTEGRACIONES_ENTRANTES')
          .input(
            'accion',
            sql.NVarChar(240),
            `integraciones.entrantes.${input.accion}`,
          )
          .input('mensaje', sql.NVarChar(510), input.mensaje)
          .input('dataJson', sql.NVarChar(sql.MAX), input.dataJson)
          .input('ip', sql.NVarChar(90), null)
          .input('userAgent', sql.NVarChar(510), null).query(`
            DECLARE @logObjectId INT = OBJECT_ID('[oms].[Log]');
            IF @logObjectId IS NULL
            BEGIN
              THROW 51000, 'Tabla [oms].[Log] no existe', 1;
            END;

            IF COL_LENGTH('oms.Log', 'Nivel') IS NULL
              OR COL_LENGTH('oms.Log', 'Modulo') IS NULL
              OR COL_LENGTH('oms.Log', 'Accion') IS NULL
            BEGIN
              THROW 51000, 'Tabla [oms].[Log] no tiene columnas minimas para registrar integraciones entrantes', 1;
            END;

            DECLARE @logColumns NVARCHAR(MAX) = N'';
            DECLARE @logValues NVARCHAR(MAX) = N'';
            DECLARE @insertSql NVARCHAR(MAX);

            IF COL_LENGTH('oms.Log', 'EmpresaId') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[EmpresaId]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@empresaId';
            END;
            IF COL_LENGTH('oms.Log', 'UsuarioId') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[UsuarioId]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@usuarioId';
            END;
            IF COL_LENGTH('oms.Log', 'Nivel') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[Nivel]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@nivel';
            END;
            IF COL_LENGTH('oms.Log', 'Modulo') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[Modulo]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@modulo';
            END;
            IF COL_LENGTH('oms.Log', 'Accion') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[Accion]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@accion';
            END;
            IF COL_LENGTH('oms.Log', 'Entidad') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[Entidad]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@entidad';
            END;
            IF COL_LENGTH('oms.Log', 'EntidadId') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[EntidadId]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@entidadId';
            END;
            IF COL_LENGTH('oms.Log', 'Mensaje') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[Mensaje]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@mensaje';
            END;
            IF COL_LENGTH('oms.Log', 'DataJson') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[DataJson]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@dataJson';
            END;
            IF COL_LENGTH('oms.Log', 'Ip') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[Ip]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@ip';
            END;
            IF COL_LENGTH('oms.Log', 'UserAgent') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[UserAgent]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'@userAgent';
            END;
            IF COL_LENGTH('oms.Log', 'CreatedAt') IS NOT NULL
            BEGIN
              SET @logColumns = @logColumns + CASE WHEN LEN(@logColumns) > 0 THEN N', ' ELSE N'' END + N'[CreatedAt]';
              SET @logValues = @logValues + CASE WHEN LEN(@logValues) > 0 THEN N', ' ELSE N'' END + N'SYSUTCDATETIME()';
            END;

            SET @insertSql =
              N'INSERT INTO [oms].[Log] (' + @logColumns + N') VALUES (' + @logValues + N');';

            EXEC sp_executesql
              @insertSql,
              N'@empresaId INT, @usuarioId INT, @nivel NVARCHAR(20), @entidad NVARCHAR(60), @entidadId BIGINT, @modulo NVARCHAR(160), @accion NVARCHAR(240), @mensaje NVARCHAR(510), @dataJson NVARCHAR(MAX), @ip NVARCHAR(90), @userAgent NVARCHAR(510)',
              @empresaId = @empresaId,
              @usuarioId = @usuarioId,
              @nivel = @nivel,
              @entidad = @entidad,
              @entidadId = @entidadId,
              @modulo = @modulo,
              @accion = @accion,
              @mensaje = @mensaje,
              @dataJson = @dataJson,
              @ip = @ip,
              @userAgent = @userAgent;
          `),
      'integraciones-entrantes.insertOperationalLog',
    );
  }

  private mapRunLogRow(row: RunLogRow): IntegracionEntranteRunLog | null {
    if (!(row.CreatedAt instanceof Date)) {
      return null;
    }

    const payload = this.parseRunDataJson(row.DataJson);
    if (!payload) {
      return {
        runId: `SYNC-${row.CreatedAt.getTime()}`,
        status: 'FAILED',
        message: row.Mensaje ?? 'Sin detalle',
        executedAt: row.CreatedAt.toISOString(),
        durationMs: null,
        errorCode: null,
        errorMessage: row.Mensaje ?? null,
        summary: {
          pendingReceived: 0,
          ingested: 0,
          duplicated: 0,
          skippedValidation: 0,
          failed: 0,
        },
      };
    }

    return {
      runId: payload.runId ?? `SYNC-${row.CreatedAt.getTime()}`,
      status: payload.status,
      message: payload.message ?? row.Mensaje ?? 'Sin detalle',
      executedAt: row.CreatedAt.toISOString(),
      durationMs: payload.durationMs,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      summary: payload.summary,
    };
  }

  private parseRunDataJson(
    value: string | null,
  ): {
    runId: string | null;
    status: 'OK' | 'BLOCKED' | 'FAILED';
    message: string | null;
    durationMs: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    summary: {
      pendingReceived: number;
      ingested: number;
      duplicated: number;
      skippedValidation: number;
      failed: number;
    };
  } | null {
    if (!value) {
      return null;
    }

    try {
      const payload = JSON.parse(value) as {
        runId?: string;
        status?: string;
        message?: string;
        durationMs?: number;
        errorCode?: string;
        errorMessage?: string;
        summary?: {
          pendingReceived?: number;
          ingested?: number;
          duplicated?: number;
          skippedValidation?: number;
          failed?: number;
        };
      };

      const status =
        payload.status === 'OK' ||
        payload.status === 'BLOCKED' ||
        payload.status === 'FAILED'
          ? payload.status
          : 'FAILED';

      return {
        runId: this.trimOrNull(payload.runId, 80),
        status,
        message: this.trimOrNull(payload.message, 510),
        durationMs: this.normalizePositiveInteger(payload.durationMs),
        errorCode: this.trimOrNull(payload.errorCode, 120),
        errorMessage: this.trimOrNull(payload.errorMessage, 510),
        summary: {
          pendingReceived: this.normalizeCounter(payload.summary?.pendingReceived),
          ingested: this.normalizeCounter(payload.summary?.ingested),
          duplicated: this.normalizeCounter(payload.summary?.duplicated),
          skippedValidation: this.normalizeCounter(
            payload.summary?.skippedValidation,
          ),
          failed: this.normalizeCounter(payload.summary?.failed),
        },
      };
    } catch {
      return null;
    }
  }

  private normalizeCounter(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : 0;
  }

  private normalizePositiveInteger(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : null;
  }

  private trimOrNull(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    return normalized.length > maxLength
      ? normalized.slice(0, maxLength)
      : normalized;
  }
}
