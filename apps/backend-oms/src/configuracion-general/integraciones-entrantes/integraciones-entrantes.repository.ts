import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateIntegracionEntranteInput,
  IntegracionEntranteCanalOption,
  IntegracionEntranteEmpresaOption,
  IntegracionEntrantePersistenceRow,
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
}
