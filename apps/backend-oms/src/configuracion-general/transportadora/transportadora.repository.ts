import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateTransportadoraInput,
  TransportadoraApiConfigItem,
  TransportadoraBootstrapData,
  TransportadoraConfigItem,
  TransportadoraEmpresaListItem,
  TransportadoraListItem,
  TransportadoraTarifaZonaItem,
  TransportadoraTiendaItem,
  TransportadoraZonaItem,
  UpsertTransportadoraApiConfigInput,
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
  Servicio: string | null;
  PermiteExpress: boolean | null;
  ModuloCode: string | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type TransportadoraWithEmpresaMonedaRow = TransportadoraRow & {
  EmpresaMonedaId: number;
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

type ZonaRow = {
  ZonaTransporteId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  Activo: boolean;
};

type TarifaZonaRow = {
  CostoTransporteId: string | number;
  MonedaId: number;
  Costo: string | number;
  DiasMin: number | null;
  DiasMax: number | null;
  Activo: boolean;
};

type TransportadoraApiConfigRow = {
  BaseUrl: string | null;
  AuthType: string;
  ApiKeyCiphertext: string | null;
  TimeoutMs: number;
  CreateShipmentEndpoint: string | null;
  TrackingEndpointTemplate: string | null;
  TrackingNumberField: string | null;
  StatusField: string | null;
  ApiKeyLastRotatedAt: Date | null;
  UpdatedAt: Date | null;
};

type TransportadoraConfiguracionBase = {
  transportadora: TransportadoraListItem;
  config: TransportadoraConfigItem;
  tiendasSeleccionadas: TransportadoraTiendaItem[];
  tiendasDisponibles: TransportadoraTiendaItem[];
  zonasDisponibles: TransportadoraZonaItem[];
  empresaMonedaId: number;
};

@Injectable()
export class TransportadoraRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<TransportadoraListItem[]> {
    const result = await this.databaseService.execute<
      sql.IResult<TransportadoraRow>
    >(
      (pool) =>
        pool.request().query<TransportadoraRow>(`
          SELECT
            [TransportadoraId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [TrackingUrlTemplate],
            [Activo],
            [Servicio],
            [PermiteExpress],
            [ModuloCode],
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
            [Servicio],
            [PermiteExpress],
            [ModuloCode],
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

    const transportadorasRows = (result.recordsets?.[0] ??
      []) as TransportadoraRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];

    return {
      transportadoras: transportadorasRows.map((row) =>
        this.mapTransportadoraRow(row),
      ),
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
    };
  }

  async findById(
    transportadoraId: number,
  ): Promise<TransportadoraListItem | null> {
    const result = await this.databaseService.execute<
      sql.IResult<TransportadoraRow>
    >(
      (pool) =>
        pool.request().input('transportadoraId', sql.Int, transportadoraId)
          .query<TransportadoraRow>(`
            SELECT
              [TransportadoraId],
              [EmpresaId],
              [Codigo],
              [Nombre],
              [TrackingUrlTemplate],
              [Activo],
              [Servicio],
              [PermiteExpress],
              [ModuloCode],
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

  async findApiConfigByTransportadoraId(
    transportadoraId: number,
  ): Promise<TransportadoraApiConfigItem | null> {
    const result = await this.databaseService.execute<
      sql.IResult<TransportadoraApiConfigRow>
    >(
      (pool) =>
        pool
          .request()
          .input('transportadoraId', sql.Int, transportadoraId)
          .query<TransportadoraApiConfigRow>(`
            SELECT
              [BaseUrl],
              [AuthType],
              [ApiKeyCiphertext],
              [TimeoutMs],
              [CreateShipmentEndpoint],
              [TrackingEndpointTemplate],
              [TrackingNumberField],
              [StatusField],
              [ApiKeyLastRotatedAt],
              [UpdatedAt]
            FROM [oms].[TransportadoraApiConfig]
            WHERE [TransportadoraId] = @transportadoraId
          `),
      'transportadora.findApiConfigByTransportadoraId',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapTransportadoraApiConfigRow(row);
  }

  async findConfiguracionBaseById(
    transportadoraId: number,
  ): Promise<TransportadoraConfiguracionBase | null> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().input('transportadoraId', sql.Int, transportadoraId)
          .query(`
            SELECT
              t.[TransportadoraId],
              t.[EmpresaId],
              t.[Codigo],
              t.[Nombre],
              t.[TrackingUrlTemplate],
              t.[Activo],
              t.[Servicio],
              t.[PermiteExpress],
              t.[ModuloCode],
              t.[CreatedAt],
              t.[UpdatedAt],
              e.[MonedaId] AS [EmpresaMonedaId]
            FROM [oms].[Transportadora] t
            INNER JOIN [oms].[Empresa] e
              ON e.[EmpresaId] = t.[EmpresaId]
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

            SELECT
              z.[ZonaTransporteId],
              z.[EmpresaId],
              z.[Codigo],
              z.[Nombre],
              z.[Activo]
            FROM [oms].[ZonaTransporte] z
            INNER JOIN [oms].[Transportadora] t
              ON t.[EmpresaId] = z.[EmpresaId]
            WHERE t.[TransportadoraId] = @transportadoraId
              AND z.[Activo] = 1
            ORDER BY z.[Nombre] ASC, z.[ZonaTransporteId] ASC;
          `),
      'transportadora.findConfiguracionBaseById',
    );

    const baseRow = (result.recordsets?.[0]?.[0] ??
      null) as TransportadoraWithEmpresaMonedaRow | null;
    if (!baseRow) {
      return null;
    }

    const tiendasSeleccionadasRows = (result.recordsets?.[1] ??
      []) as TiendaRow[];
    const tiendasDisponiblesRows = (result.recordsets?.[2] ??
      []) as TiendaRow[];
    const zonasDisponiblesRows = (result.recordsets?.[3] ?? []) as ZonaRow[];

    return {
      transportadora: this.mapTransportadoraRow(baseRow),
      config: this.mapTransportadoraConfigFromRow(baseRow),
      tiendasSeleccionadas: tiendasSeleccionadasRows.map((row) =>
        this.mapTiendaRow(row),
      ),
      tiendasDisponibles: tiendasDisponiblesRows.map((row) =>
        this.mapTiendaRow(row),
      ),
      zonasDisponibles: zonasDisponiblesRows.map((row) => this.mapZonaRow(row)),
      empresaMonedaId: baseRow.EmpresaMonedaId,
    };
  }

  async findTarifaZonaBase(
    empresaId: number,
    transportadoraId: number,
    zonaSeleccionadaId: number,
    monedaId: number,
  ): Promise<TransportadoraTarifaZonaItem | null> {
    const result = await this.databaseService.execute<
      sql.IResult<TarifaZonaRow>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('transportadoraId', sql.Int, transportadoraId)
          .input('zonaSeleccionadaId', sql.Int, zonaSeleccionadaId)
          .input('monedaId', sql.Int, monedaId).query<TarifaZonaRow>(`
            SELECT TOP (1)
              [CostoTransporteId],
              [MonedaId],
              [Costo],
              [DiasMin],
              [DiasMax],
              [Activo]
            FROM [oms].[CostoTransporte]
            WHERE [EmpresaId] = @empresaId
              AND [TransportadoraId] = @transportadoraId
              AND [ZonaTransporteId] = @zonaSeleccionadaId
              AND [MonedaId] = @monedaId
              AND [PesoMinKg] IS NULL
              AND [PesoMaxKg] IS NULL
              AND [ValorMin] IS NULL
              AND [ValorMax] IS NULL
            ORDER BY
              [Activo] DESC,
              [UpdatedAt] DESC,
              [CostoTransporteId] DESC
          `),
      'transportadora.findTarifaZonaBase',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      zonaSeleccionadaId,
      monedaId: row.MonedaId,
      costo: Number(row.Costo),
      diasMin: row.DiasMin ?? undefined,
      diasMax: row.DiasMax ?? undefined,
      activo: row.Activo,
    };
  }

  async findEmpresaMonedaId(empresaId: number): Promise<number | null> {
    const result = await this.databaseService.execute<
      sql.IResult<{ MonedaId: number }>
    >(
      (pool) =>
        pool.request().input('empresaId', sql.Int, empresaId).query<{
          MonedaId: number;
        }>(`
            SELECT [MonedaId]
            FROM [oms].[Empresa]
            WHERE [EmpresaId] = @empresaId
          `),
      'transportadora.findEmpresaMonedaId',
    );

    return result.recordset[0]?.MonedaId ?? null;
  }

  async findZonaByIdAndEmpresaId(
    zonaSeleccionadaId: number,
    empresaId: number,
  ): Promise<TransportadoraZonaItem | null> {
    const result = await this.databaseService.execute<sql.IResult<ZonaRow>>(
      (pool) =>
        pool
          .request()
          .input('zonaSeleccionadaId', sql.Int, zonaSeleccionadaId)
          .input('empresaId', sql.Int, empresaId).query<ZonaRow>(`
            SELECT
              [ZonaTransporteId],
              [EmpresaId],
              [Codigo],
              [Nombre],
              [Activo]
            FROM [oms].[ZonaTransporte]
            WHERE [ZonaTransporteId] = @zonaSeleccionadaId
              AND [EmpresaId] = @empresaId
          `),
      'transportadora.findZonaByIdAndEmpresaId',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapZonaRow(row);
  }

  async findTiendasByIds(
    tiendaIds: number[],
  ): Promise<TransportadoraTiendaItem[]> {
    const normalized = [
      ...new Set(
        tiendaIds.filter((value) => Number.isInteger(value) && value > 0),
      ),
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
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('codigo', sql.NVarChar(60), codigo)
          .input(
            'excludeTransportadoraId',
            sql.Int,
            excludeTransportadoraId ?? null,
          ).query<{ count: number }>(`
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
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool.request().input('empresaId', sql.Int, empresaId).query<{
          count: number;
        }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Empresa]
            WHERE [EmpresaId] = @empresaId
          `),
      'transportadora.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(
    input: CreateTransportadoraInput,
  ): Promise<{ transportadoraId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<TransportadoraIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('Codigo', sql.NVarChar(60), input.codigo)
          .input('Nombre', sql.NVarChar(180), input.nombre)
          .input(
            'TrackingUrlTemplate',
            sql.NVarChar(255),
            input.trackingUrlTemplate,
          )
          .input('Activo', sql.Bit, input.activo)
          .query<TransportadoraIdentityRow>(`
            INSERT INTO [oms].[Transportadora]
            (
              [EmpresaId],
              [Codigo],
              [Nombre],
              [TrackingUrlTemplate],
              [Activo],
              [PermiteExpress],
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
              0,
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
          .input(
            'trackingUrlTemplate',
            sql.NVarChar(255),
            input.trackingUrlTemplate,
          )
          .input('activo', sql.Bit, input.activo).query(`
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

  async upsertApiConfig(
    transportadoraId: number,
    input: UpsertTransportadoraApiConfigInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('transportadoraId', sql.Int, transportadoraId)
          .input('baseUrl', sql.NVarChar(500), input.baseUrl)
          .input('authType', sql.NVarChar(30), input.authType)
          .input('timeoutMs', sql.Int, input.timeoutMs)
          .input(
            'createShipmentEndpoint',
            sql.NVarChar(300),
            input.createShipmentEndpoint,
          )
          .input(
            'trackingEndpointTemplate',
            sql.NVarChar(300),
            input.trackingEndpointTemplate,
          )
          .input(
            'trackingNumberField',
            sql.NVarChar(120),
            input.trackingNumberField,
          )
          .input('statusField', sql.NVarChar(120), input.statusField)
          .input('rotateApiKey', sql.Bit, input.rotateApiKey)
          .input(
            'apiKeyCiphertext',
            sql.NVarChar(sql.MAX),
            input.apiKeyCiphertext ?? null,
          )
          .input('apiKeyIv', sql.NVarChar(64), input.apiKeyIv ?? null)
          .input('apiKeyTag', sql.NVarChar(64), input.apiKeyTag ?? null)
          .input(
            'apiKeyLastRotatedAt',
            sql.DateTime2(0),
            input.apiKeyLastRotatedAt ?? null,
          ).query(`
            IF EXISTS (
              SELECT 1
              FROM [oms].[TransportadoraApiConfig]
              WHERE [TransportadoraId] = @transportadoraId
            )
            BEGIN
              UPDATE [oms].[TransportadoraApiConfig]
              SET
                [BaseUrl] = @baseUrl,
                [AuthType] = @authType,
                [TimeoutMs] = @timeoutMs,
                [CreateShipmentEndpoint] = @createShipmentEndpoint,
                [TrackingEndpointTemplate] = @trackingEndpointTemplate,
                [TrackingNumberField] = @trackingNumberField,
                [StatusField] = @statusField,
                [ApiKeyCiphertext] = CASE WHEN @rotateApiKey = 1 THEN @apiKeyCiphertext ELSE [ApiKeyCiphertext] END,
                [ApiKeyIv] = CASE WHEN @rotateApiKey = 1 THEN @apiKeyIv ELSE [ApiKeyIv] END,
                [ApiKeyTag] = CASE WHEN @rotateApiKey = 1 THEN @apiKeyTag ELSE [ApiKeyTag] END,
                [ApiKeyLastRotatedAt] = CASE WHEN @rotateApiKey = 1 THEN @apiKeyLastRotatedAt ELSE [ApiKeyLastRotatedAt] END,
                [UpdatedAt] = SYSUTCDATETIME()
              WHERE [TransportadoraId] = @transportadoraId;
            END
            ELSE
            BEGIN
              INSERT INTO [oms].[TransportadoraApiConfig]
              (
                [TransportadoraId],
                [BaseUrl],
                [AuthType],
                [ApiKeyCiphertext],
                [ApiKeyIv],
                [ApiKeyTag],
                [TimeoutMs],
                [CreateShipmentEndpoint],
                [TrackingEndpointTemplate],
                [TrackingNumberField],
                [StatusField],
                [ApiKeyLastRotatedAt],
                [UpdatedAt]
              )
              VALUES
              (
                @transportadoraId,
                @baseUrl,
                @authType,
                CASE WHEN @rotateApiKey = 1 THEN @apiKeyCiphertext ELSE NULL END,
                CASE WHEN @rotateApiKey = 1 THEN @apiKeyIv ELSE NULL END,
                CASE WHEN @rotateApiKey = 1 THEN @apiKeyTag ELSE NULL END,
                @timeoutMs,
                @createShipmentEndpoint,
                @trackingEndpointTemplate,
                @trackingNumberField,
                @statusField,
                CASE WHEN @rotateApiKey = 1 THEN @apiKeyLastRotatedAt ELSE NULL END,
                NULL
              );
            END
          `),
      'transportadora.upsertApiConfig',
    );
  }

  async updateConfiguracion(
    transportadoraId: number,
    input: UpdateTransportadoraConfiguracionInput,
  ): Promise<void> {
    await this.databaseService.execute(async (pool) => {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        await new sql.Request(transaction)
          .input('transportadoraId', sql.Int, transportadoraId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('codigo', sql.NVarChar(60), input.codigo)
          .input('nombre', sql.NVarChar(180), input.nombre)
          .input(
            'trackingUrlTemplate',
            sql.NVarChar(255),
            input.trackingUrlTemplate,
          )
          .input('activo', sql.Bit, input.activo)
          .input('servicio', sql.NVarChar(120), input.servicio)
          .input('permiteExpress', sql.Bit, input.permiteExpress)
          .input('moduloCode', sql.NVarChar(120), input.moduloCode).query(`
              UPDATE [oms].[Transportadora]
              SET
                [EmpresaId] = @empresaId,
                [Codigo] = @codigo,
                [Nombre] = @nombre,
                [TrackingUrlTemplate] = @trackingUrlTemplate,
                [Activo] = @activo,
                [Servicio] = @servicio,
                [PermiteExpress] = @permiteExpress,
                [ModuloCode] = @moduloCode,
                [UpdatedAt] = SYSUTCDATETIME()
              WHERE [TransportadoraId] = @transportadoraId
            `);

        if (
          input.zonaSeleccionadaId !== undefined &&
          input.tarifaZona !== undefined
        ) {
          await new sql.Request(transaction)
            .input('empresaId', sql.Int, input.empresaId)
            .input('transportadoraId', sql.Int, transportadoraId)
            .input('zonaSeleccionadaId', sql.Int, input.zonaSeleccionadaId)
            .input('tarifaCosto', sql.Decimal(18, 2), input.tarifaZona.costo)
            .input('tarifaDiasMin', sql.Int, input.tarifaZona.diasMin)
            .input('tarifaDiasMax', sql.Int, input.tarifaZona.diasMax)
            .input('tarifaActiva', sql.Bit, input.tarifaZona.activo).query(`
              DECLARE @monedaId INT;
              SELECT @monedaId = [MonedaId]
              FROM [oms].[Empresa]
              WHERE [EmpresaId] = @empresaId;

              UPDATE [oms].[CostoTransporte]
              SET
                [Costo] = @tarifaCosto,
                [DiasMin] = @tarifaDiasMin,
                [DiasMax] = @tarifaDiasMax,
                [Activo] = @tarifaActiva,
                [UpdatedAt] = SYSUTCDATETIME()
              WHERE [EmpresaId] = @empresaId
                AND [ZonaTransporteId] = @zonaSeleccionadaId
                AND [TransportadoraId] = @transportadoraId
                AND [MonedaId] = @monedaId
                AND [PesoMinKg] IS NULL
                AND [PesoMaxKg] IS NULL
                AND [ValorMin] IS NULL
                AND [ValorMax] IS NULL;

              IF @@ROWCOUNT = 0
              BEGIN
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
                VALUES
                (
                  @empresaId,
                  @zonaSeleccionadaId,
                  @transportadoraId,
                  @monedaId,
                  NULL,
                  NULL,
                  NULL,
                  NULL,
                  @tarifaCosto,
                  @tarifaDiasMin,
                  @tarifaDiasMax,
                  @tarifaActiva,
                  NULL
                );
              END;
            `);
        }

        const tiendaIds = [...new Set(input.tiendaIds)];
        if (tiendaIds.length > 0) {
          const requestActivate = new sql.Request(transaction).input(
            'transportadoraId',
            sql.Int,
            transportadoraId,
          );
          const activateParamNames = this.bindTiendaIds(
            requestActivate,
            tiendaIds,
          );
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
          await new sql.Request(transaction).input(
            'transportadoraId',
            sql.Int,
            transportadoraId,
          ).query(`
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
    }, 'transportadora.updateConfiguracion');
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
      servicio: row.Servicio ?? undefined,
      permiteExpress: row.PermiteExpress ?? false,
      moduloCode: row.ModuloCode ?? undefined,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapTransportadoraConfigFromRow(
    row: TransportadoraRow,
  ): TransportadoraConfigItem {
    return {
      servicio: row.Servicio ?? undefined,
      permiteExpress: row.PermiteExpress ?? false,
      moduloCode: row.ModuloCode ?? undefined,
    };
  }

  private mapTransportadoraApiConfigRow(
    row: TransportadoraApiConfigRow,
  ): TransportadoraApiConfigItem {
    return {
      baseUrl: row.BaseUrl ?? undefined,
      authType: 'API_KEY',
      timeoutMs: row.TimeoutMs,
      createShipmentEndpoint: row.CreateShipmentEndpoint ?? undefined,
      trackingEndpointTemplate: row.TrackingEndpointTemplate ?? undefined,
      trackingNumberField: row.TrackingNumberField ?? undefined,
      statusField: row.StatusField ?? undefined,
      hasApiKey: Boolean(row.ApiKeyCiphertext),
      apiKeyLastRotatedAt: row.ApiKeyLastRotatedAt?.toISOString() ?? null,
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

  private mapTiendaRow(row: TiendaRow): TransportadoraTiendaItem {
    return {
      tiendaId: row.TiendaId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      activa: row.Activo,
    };
  }

  private mapZonaRow(row: ZonaRow): TransportadoraZonaItem {
    return {
      zonaTransporteId: row.ZonaTransporteId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      activa: row.Activo,
    };
  }
}
