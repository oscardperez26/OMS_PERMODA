import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type {
  CreatePedidoInput,
  OrdersSyncContext,
  PedidoDetail,
  PedidoListRow,
} from './orders.types';

type SyncContextRaw = {
  EmpresaId: number | null;
  TiendaId: number | null;
  MonedaId: number | null;
  EstadoId: number | null;
  PaisId: number | null;
};

type CanalRow = {
  CanalVentaId: number;
  Codigo: string;
};

type CiudadRow = {
  CiudadId: number;
  Nombre: string;
};

type CountRow = {
  count: number;
};

type PedidoIdentityRow = {
  PedidoId: number;
};

type PedidoRow = {
  PedidoId: number;
  NumeroPedido: string;
  NumeroExterno: string | null;
  ClienteNombre: string;
  Total: number;
  CreatedAt: Date;
  EstadoNombre: string | null;
  PaisNombre: string | null;
};

type PedidoDetailRow = {
  PedidoId: number;
  EmpresaId: number;
  NumeroPedido: string;
  NumeroExterno: string | null;
  EstadoId: number | null;
  EstadoCodigo: string | null;
  EstadoNombre: string | null;
  ClienteNombre: string;
  ClienteDocumento: string | null;
  ClienteEmail: string | null;
  ClienteTelefono: string | null;
  ShippingPaisId: number | null;
  ShippingPaisNombre: string | null;
  ShippingCiudadId: number | null;
  ShippingCiudadNombre: string | null;
  ShippingDireccion: string | null;
  ShippingBarrio: string | null;
  ShippingZip: string | null;
  Subtotal: string | number;
  Descuento: string | number;
  Impuestos: string | number;
  CostoEnvio: string | number;
  Total: string | number;
  MonedaId: number | null;
  MonedaCodigo: string | null;
  MonedaNombre: string | null;
  TiendaOrigenId: number | null;
  TiendaOrigenCodigo: string | null;
  TiendaOrigenNombre: string | null;
  TiendaOrigenActiva: boolean | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type ZonaRow = {
  ZonaTransporteId: number;
  Codigo: string;
  Nombre: string;
};

type TiendaRow = {
  TiendaId: number;
  Codigo: string;
  Nombre: string;
  Activo: boolean;
};

type CostoTransporteCandidateRow = {
  CostoTransporteId: string | number;
  Costo: string | number;
  DiasMin: number | null;
  DiasMax: number | null;
  MonedaId: number;
  MonedaCodigo: string;
  TransportadoraId: number;
  TransportadoraCodigo: string;
  TransportadoraNombre: string;
};

type EstadoRow = {
  EstadoId: number;
  Codigo: string;
  Nombre: string;
};

@Injectable()
export class OrdersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getSyncContext(
    empresaId: number,
    tiendaCodigo: string,
    monedaCodigo: string,
    estadoEntidad: string,
    estadoCodigo: string,
    paisNombre: string,
  ): Promise<OrdersSyncContext> {
    const contextResult = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('tiendaCodigo', sql.NVarChar(60), tiendaCodigo)
          .input('monedaCodigo', sql.Char(3), monedaCodigo)
          .input('estadoEntidad', sql.NVarChar(30), estadoEntidad)
          .input('estadoCodigo', sql.NVarChar(60), estadoCodigo)
          .input('paisNombre', sql.NVarChar(120), paisNombre)
          .query(`
            SELECT
              CAST(
                CASE WHEN EXISTS(
                  SELECT 1
                  FROM [oms].[Empresa]
                  WHERE [EmpresaId] = @empresaId
                ) THEN @empresaId ELSE NULL END
              AS INT) AS [EmpresaId],
              (
                SELECT TOP 1 [TiendaId]
                FROM [oms].[Tienda]
                WHERE [EmpresaId] = @empresaId
                  AND [Codigo] = @tiendaCodigo
                  AND [Activo] = 1
                ORDER BY [TiendaId] ASC
              ) AS [TiendaId],
              (
                SELECT TOP 1 [MonedaId]
                FROM [oms].[Moneda]
                WHERE UPPER([Codigo]) = UPPER(@monedaCodigo)
              ) AS [MonedaId],
              (
                SELECT TOP 1 [EstadoId]
                FROM [oms].[Estado]
                WHERE [Entidad] = @estadoEntidad
                  AND [Codigo] = @estadoCodigo
                  AND [Activo] = 1
              ) AS [EstadoId],
              (
                SELECT TOP 1 [PaisId]
                FROM [oms].[Pais]
                WHERE UPPER([Nombre]) = UPPER(@paisNombre)
                   OR [CodigoISO2] = 'CO'
                ORDER BY CASE WHEN UPPER([Nombre]) = UPPER(@paisNombre) THEN 0 ELSE 1 END
              ) AS [PaisId];

            SELECT
              [CanalVentaId],
              [Codigo]
            FROM [oms].[CanalVenta]
            WHERE [EmpresaId] = @empresaId
              AND [Estado] = 'ACTIVO'
            ORDER BY [CanalVentaId] ASC;
          `),
      'orders.getSyncContext',
    );

    const contextRow = (contextResult.recordsets?.[0]?.[0] ?? {
      EmpresaId: null,
      TiendaId: null,
      MonedaId: null,
      EstadoId: null,
      PaisId: null,
    }) as SyncContextRaw;
    const canales = (contextResult.recordsets?.[1] ?? []) as CanalRow[];

    const ciudades = await this.getCitiesByPaisId(contextRow.PaisId);

    return {
      empresaId: contextRow.EmpresaId,
      tiendaId: contextRow.TiendaId,
      monedaId: contextRow.MonedaId,
      estadoId: contextRow.EstadoId,
      paisId: contextRow.PaisId,
      canales: canales.map((row) => ({
        canalVentaId: row.CanalVentaId,
        codigo: row.Codigo,
      })),
      ciudades: ciudades.map((row) => ({
        ciudadId: row.CiudadId,
        nombre: row.Nombre,
      })),
    };
  }

  async existsByNumeroPedido(numeroPedido: string): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<CountRow>>(
      (pool) =>
        pool
          .request()
          .input('numeroPedido', sql.NVarChar(60), numeroPedido)
          .query<CountRow>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Pedido]
            WHERE [NumeroPedido] = @numeroPedido
          `),
      'orders.existsByNumeroPedido',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async createPedido(input: CreatePedidoInput): Promise<{ pedidoId: number }> {
    const result = await this.databaseService.execute<sql.IResult<PedidoIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('EmpresaClienteId', sql.Int, input.empresaClienteId)
          .input('CanalVentaId', sql.Int, input.canalVentaId)
          .input('TiendaOrigenId', sql.Int, input.tiendaOrigenId)
          .input('MonedaId', sql.Int, input.monedaId)
          .input('NumeroPedido', sql.NVarChar(60), input.numeroPedido)
          .input('NumeroExterno', sql.NVarChar(80), input.numeroExterno)
          .input('EstadoId', sql.Int, input.estadoId)
          .input('ClienteNombre', sql.NVarChar(180), input.clienteNombre)
          .input('ClienteDocumento', sql.NVarChar(60), input.clienteDocumento)
          .input('ClienteEmail', sql.NVarChar(180), input.clienteEmail)
          .input('ClienteTelefono', sql.NVarChar(50), input.clienteTelefono)
          .input('ShippingPaisId', sql.Int, input.shippingPaisId)
          .input('ShippingCiudadId', sql.Int, input.shippingCiudadId)
          .input('ShippingDireccion', sql.NVarChar(255), input.shippingDireccion)
          .input('ShippingBarrio', sql.NVarChar(120), input.shippingBarrio)
          .input('ShippingZip', sql.NVarChar(20), input.shippingZip)
          .input('Subtotal', sql.Decimal(18, 2), input.subtotal)
          .input('Descuento', sql.Decimal(18, 2), input.descuento)
          .input('Impuestos', sql.Decimal(18, 2), input.impuestos)
          .input('CostoEnvio', sql.Decimal(18, 2), input.costoEnvio)
          .input('Total', sql.Decimal(18, 2), input.total)
          .input('PasarelaPagoId', sql.Int, input.pasarelaPagoId)
          .input('PagoReferencia', sql.NVarChar(120), input.pagoReferencia)
          .input('PagoEstadoId', sql.Int, input.pagoEstadoId)
          .input('CreatedAt', sql.DateTime2, input.createdAt)
          .query<PedidoIdentityRow>(`
            INSERT INTO [oms].[Pedido]
            (
              [EmpresaId],
              [EmpresaClienteId],
              [CanalVentaId],
              [TiendaOrigenId],
              [MonedaId],
              [NumeroPedido],
              [NumeroExterno],
              [EstadoId],
              [ClienteNombre],
              [ClienteDocumento],
              [ClienteEmail],
              [ClienteTelefono],
              [ShippingPaisId],
              [ShippingCiudadId],
              [ShippingDireccion],
              [ShippingBarrio],
              [ShippingZip],
              [Subtotal],
              [Descuento],
              [Impuestos],
              [CostoEnvio],
              [Total],
              [PasarelaPagoId],
              [PagoReferencia],
              [PagoEstadoId],
              [CreatedAt],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[PedidoId]
            VALUES
            (
              @EmpresaId,
              @EmpresaClienteId,
              @CanalVentaId,
              @TiendaOrigenId,
              @MonedaId,
              @NumeroPedido,
              @NumeroExterno,
              @EstadoId,
              @ClienteNombre,
              @ClienteDocumento,
              @ClienteEmail,
              @ClienteTelefono,
              @ShippingPaisId,
              @ShippingCiudadId,
              @ShippingDireccion,
              @ShippingBarrio,
              @ShippingZip,
              @Subtotal,
              @Descuento,
              @Impuestos,
              @CostoEnvio,
              @Total,
              @PasarelaPagoId,
              @PagoReferencia,
              @PagoEstadoId,
              @CreatedAt,
              NULL
            )
          `),
      'orders.createPedido',
    );

    return { pedidoId: result.recordset[0].PedidoId };
  }

  async listPedidos(): Promise<PedidoListRow[]> {
    const result = await this.databaseService.execute<sql.IResult<PedidoRow>>(
      (pool) =>
        pool.request().query<PedidoRow>(`
          SELECT
            p.[PedidoId],
            p.[NumeroPedido],
            p.[NumeroExterno],
            p.[ClienteNombre],
            p.[Total],
            p.[CreatedAt],
            e.[Nombre] AS [EstadoNombre],
            pa.[Nombre] AS [PaisNombre]
          FROM [oms].[Pedido] p
          LEFT JOIN [oms].[Estado] e
            ON e.[EstadoId] = p.[EstadoId]
          LEFT JOIN [oms].[Pais] pa
            ON pa.[PaisId] = p.[ShippingPaisId]
          ORDER BY p.[CreatedAt] DESC, p.[PedidoId] DESC
        `),
      'orders.listPedidos',
    );

    return result.recordset.map((row) => ({
      pedidoId: row.PedidoId,
      numeroPedido: row.NumeroPedido,
      numeroExterno: row.NumeroExterno,
      clienteNombre: row.ClienteNombre,
      total: row.Total,
      createdAt: row.CreatedAt.toISOString(),
      estadoNombre: row.EstadoNombre,
      paisNombre: row.PaisNombre,
    }));
  }

  async findPedidoDetailById(pedidoId: number): Promise<PedidoDetail | null> {
    const result = await this.databaseService.execute<sql.IResult<PedidoDetailRow>>(
      (pool) =>
        pool
          .request()
          .input('pedidoId', sql.Int, pedidoId)
          .query<PedidoDetailRow>(`
            SELECT
              p.[PedidoId],
              p.[EmpresaId],
              p.[NumeroPedido],
              p.[NumeroExterno],
              p.[EstadoId],
              e.[Codigo] AS [EstadoCodigo],
              e.[Nombre] AS [EstadoNombre],
              p.[ClienteNombre],
              p.[ClienteDocumento],
              p.[ClienteEmail],
              p.[ClienteTelefono],
              p.[ShippingPaisId],
              pa.[Nombre] AS [ShippingPaisNombre],
              p.[ShippingCiudadId],
              ci.[Nombre] AS [ShippingCiudadNombre],
              p.[ShippingDireccion],
              p.[ShippingBarrio],
              p.[ShippingZip],
              p.[Subtotal],
              p.[Descuento],
              p.[Impuestos],
              p.[CostoEnvio],
              p.[Total],
              p.[MonedaId],
              mo.[Codigo] AS [MonedaCodigo],
              mo.[Nombre] AS [MonedaNombre],
              p.[TiendaOrigenId],
              ti.[Codigo] AS [TiendaOrigenCodigo],
              ti.[Nombre] AS [TiendaOrigenNombre],
              ti.[Activo] AS [TiendaOrigenActiva],
              p.[CreatedAt],
              p.[UpdatedAt]
            FROM [oms].[Pedido] p
            LEFT JOIN [oms].[Estado] e
              ON e.[EstadoId] = p.[EstadoId]
            LEFT JOIN [oms].[Pais] pa
              ON pa.[PaisId] = p.[ShippingPaisId]
            LEFT JOIN [oms].[Ciudad] ci
              ON ci.[CiudadId] = p.[ShippingCiudadId]
            LEFT JOIN [oms].[Moneda] mo
              ON mo.[MonedaId] = p.[MonedaId]
            LEFT JOIN [oms].[Tienda] ti
              ON ti.[TiendaId] = p.[TiendaOrigenId]
            WHERE p.[PedidoId] = @pedidoId
          `),
      'orders.findPedidoDetailById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      pedidoId: row.PedidoId,
      numeroPedido: row.NumeroPedido,
      numeroExterno: row.NumeroExterno,
      estado: {
        estadoId: row.EstadoId,
        codigo: row.EstadoCodigo,
        nombre: row.EstadoNombre,
      },
      cliente: {
        nombre: row.ClienteNombre,
        documento: row.ClienteDocumento,
        email: row.ClienteEmail,
        telefono: row.ClienteTelefono,
      },
      shipping: {
        direccion: row.ShippingDireccion,
        barrio: row.ShippingBarrio,
        zip: row.ShippingZip,
        ciudadId: row.ShippingCiudadId,
        ciudad: row.ShippingCiudadNombre,
        paisId: row.ShippingPaisId,
        pais: row.ShippingPaisNombre,
      },
      totales: {
        subtotal: Number(row.Subtotal),
        descuento: Number(row.Descuento),
        impuestos: Number(row.Impuestos),
        costoEnvio: Number(row.CostoEnvio),
        total: Number(row.Total),
        monedaId: row.MonedaId,
        monedaCodigo: row.MonedaCodigo,
        monedaNombre: row.MonedaNombre,
      },
      tiendaOrigen: {
        tiendaId: row.TiendaOrigenId,
        codigo: row.TiendaOrigenCodigo,
        nombre: row.TiendaOrigenNombre,
        activa: row.TiendaOrigenActiva === null ? null : this.normalizeBoolean(row.TiendaOrigenActiva),
      },
      empresaId: row.EmpresaId,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  async findZonaByCiudadId(
    ciudadId: number,
  ): Promise<{ zonaTransporteId: number; codigo: string; nombre: string } | null> {
    const result = await this.databaseService.execute<sql.IResult<ZonaRow>>(
      (pool) =>
        pool
          .request()
          .input('ciudadId', sql.Int, ciudadId)
          .query<ZonaRow>(`
            SELECT TOP 1
              zt.[ZonaTransporteId],
              zt.[Codigo],
              zt.[Nombre]
            FROM [oms].[ZonaCiudad] zc
            INNER JOIN [oms].[ZonaTransporte] zt
              ON zt.[ZonaTransporteId] = zc.[ZonaTransporteId]
            WHERE zc.[CiudadId] = @ciudadId
            ORDER BY zt.[ZonaTransporteId] ASC
          `),
      'orders.findZonaByCiudadId',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      zonaTransporteId: row.ZonaTransporteId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  async listTiendasByCodes(
    empresaId: number,
    storeCodes: string[],
  ): Promise<Array<{ tiendaId: number; codigo: string; nombre: string; activa: boolean }>> {
    const normalizedCodes = [...new Set(storeCodes.map((code) => code.trim()).filter(Boolean))];
    if (normalizedCodes.length === 0) {
      return [];
    }

    return this.databaseService.execute<sql.IResult<TiendaRow>>(
      (pool) => {
        const request = pool.request().input('empresaId', sql.Int, empresaId);
        const params: string[] = [];

        normalizedCodes.forEach((code, index) => {
          const param = `codigo${index}`;
          request.input(param, sql.NVarChar(60), code);
          params.push(`@${param}`);
        });

        return request.query<TiendaRow>(`
          SELECT
            [TiendaId],
            [Codigo],
            [Nombre],
            [Activo]
          FROM [oms].[Tienda]
          WHERE [EmpresaId] = @empresaId
            AND [Codigo] IN (${params.join(', ')})
        `);
      },
      'orders.listTiendasByCodes',
    ).then((result) =>
      result.recordset.map((row) => ({
        tiendaId: row.TiendaId,
        codigo: row.Codigo,
        nombre: row.Nombre,
        activa: this.normalizeBoolean(row.Activo),
      })),
    );
  }

  async listActiveTransportCosts(
    empresaId: number,
    zonaTransporteId: number,
    monedaId: number,
  ): Promise<
    Array<{
      costoTransporteId: string;
      costo: number;
      diasMin: number | null;
      diasMax: number | null;
      monedaId: number;
      monedaCodigo: string;
      transportadoraId: number;
      transportadoraCodigo: string;
      transportadoraNombre: string;
    }>
  > {
    const result = await this.databaseService.execute<
      sql.IResult<CostoTransporteCandidateRow>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .input('monedaId', sql.Int, monedaId)
          .query<CostoTransporteCandidateRow>(`
            SELECT
              ct.[CostoTransporteId],
              ct.[Costo],
              ct.[DiasMin],
              ct.[DiasMax],
              ct.[MonedaId],
              mo.[Codigo] AS [MonedaCodigo],
              ct.[TransportadoraId],
              tr.[Codigo] AS [TransportadoraCodigo],
              tr.[Nombre] AS [TransportadoraNombre]
            FROM [oms].[CostoTransporte] ct
            INNER JOIN [oms].[Transportadora] tr
              ON tr.[TransportadoraId] = ct.[TransportadoraId]
            INNER JOIN [oms].[Moneda] mo
              ON mo.[MonedaId] = ct.[MonedaId]
            WHERE ct.[EmpresaId] = @empresaId
              AND ct.[ZonaTransporteId] = @zonaTransporteId
              AND ct.[MonedaId] = @monedaId
              AND ct.[Activo] = 1
              AND tr.[Activo] = 1
            ORDER BY
              ct.[Costo] ASC,
              CASE WHEN ct.[DiasMin] IS NULL THEN 2147483647 ELSE ct.[DiasMin] END ASC,
              ct.[CostoTransporteId] ASC
          `),
      'orders.listActiveTransportCosts',
    );

    return result.recordset.map((row) => ({
      costoTransporteId: String(row.CostoTransporteId),
      costo: Number(row.Costo),
      diasMin: row.DiasMin ?? null,
      diasMax: row.DiasMax ?? null,
      monedaId: row.MonedaId,
      monedaCodigo: row.MonedaCodigo,
      transportadoraId: row.TransportadoraId,
      transportadoraCodigo: row.TransportadoraCodigo,
      transportadoraNombre: row.TransportadoraNombre,
    }));
  }

  async findEstadoActivoByEntidadCodigo(
    entidad: string,
    codigo: string,
  ): Promise<{ estadoId: number; codigo: string; nombre: string } | null> {
    const result = await this.databaseService.execute<sql.IResult<EstadoRow>>(
      (pool) =>
        pool
          .request()
          .input('entidad', sql.NVarChar(30), entidad)
          .input('codigo', sql.NVarChar(60), codigo)
          .query<EstadoRow>(`
            SELECT TOP 1
              [EstadoId],
              [Codigo],
              [Nombre]
            FROM [oms].[Estado]
            WHERE [Entidad] = @entidad
              AND [Codigo] = @codigo
              AND [Activo] = 1
            ORDER BY [EstadoId] ASC
          `),
      'orders.findEstadoActivoByEntidadCodigo',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      estadoId: row.EstadoId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  async findEstadoActivoById(
    estadoId: number,
  ): Promise<{ estadoId: number; codigo: string; nombre: string } | null> {
    const result = await this.databaseService.execute<sql.IResult<EstadoRow>>(
      (pool) =>
        pool
          .request()
          .input('estadoId', sql.Int, estadoId)
          .query<EstadoRow>(`
            SELECT TOP 1
              [EstadoId],
              [Codigo],
              [Nombre]
            FROM [oms].[Estado]
            WHERE [EstadoId] = @estadoId
              AND [Activo] = 1
          `),
      'orders.findEstadoActivoById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      estadoId: row.EstadoId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  async applyAssignmentUpdateAndHistory(input: {
    pedidoId: number;
    tiendaOrigenId: number | null;
    estadoId: number;
    estadoAnteriorId: number | null;
  }): Promise<void> {
    await this.databaseService.execute(
      async (pool) => {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
          await transaction
            .request()
            .input('pedidoId', sql.Int, input.pedidoId)
            .input('tiendaOrigenId', sql.Int, input.tiendaOrigenId)
            .input('estadoId', sql.Int, input.estadoId)
            .query(`
              UPDATE [oms].[Pedido]
              SET
                [TiendaOrigenId] = @tiendaOrigenId,
                [EstadoId] = @estadoId,
                [UpdatedAt] = SYSUTCDATETIME()
              WHERE [PedidoId] = @pedidoId
            `);

          await transaction
            .request()
            .input('pedidoId', sql.Int, input.pedidoId)
            .input('estadoId', sql.Int, input.estadoId)
            .input('estadoAnteriorId', sql.Int, input.estadoAnteriorId)
            .query(`
              DECLARE @historialObjectId INT = OBJECT_ID('[oms].[PedidoEstadoHistorial]');
              IF @historialObjectId IS NULL
              BEGIN
                THROW 51000, 'Tabla [oms].[PedidoEstadoHistorial] no existe', 1;
              END;

              IF COL_LENGTH('oms.PedidoEstadoHistorial', 'PedidoId') IS NULL
              BEGIN
                THROW 51000, 'Tabla [oms].[PedidoEstadoHistorial] no tiene columna PedidoId', 1;
              END;

              IF EXISTS (
                SELECT 1
                FROM sys.columns c
                LEFT JOIN sys.default_constraints dc
                  ON dc.parent_object_id = c.object_id
                 AND dc.parent_column_id = c.column_id
                WHERE c.object_id = @historialObjectId
                  AND c.is_identity = 0
                  AND c.is_computed = 0
                  AND c.is_nullable = 0
                  AND dc.object_id IS NULL
                  AND c.name NOT IN (
                    'PedidoId',
                    'EstadoId',
                    'EstadoAnteriorId',
                    'EstadoNuevoId',
                    'NuevoEstadoId',
                    'CreatedAt'
                  )
              )
              BEGIN
                THROW 51000, 'PedidoEstadoHistorial requiere columnas obligatorias no soportadas por Fase 2', 1;
              END;

              DECLARE @hasEstadoId BIT = CASE WHEN COL_LENGTH('oms.PedidoEstadoHistorial', 'EstadoId') IS NULL THEN 0 ELSE 1 END;
              DECLARE @hasEstadoAnteriorId BIT = CASE WHEN COL_LENGTH('oms.PedidoEstadoHistorial', 'EstadoAnteriorId') IS NULL THEN 0 ELSE 1 END;
              DECLARE @hasEstadoNuevoId BIT = CASE WHEN COL_LENGTH('oms.PedidoEstadoHistorial', 'EstadoNuevoId') IS NULL THEN 0 ELSE 1 END;
              DECLARE @hasNuevoEstadoId BIT = CASE WHEN COL_LENGTH('oms.PedidoEstadoHistorial', 'NuevoEstadoId') IS NULL THEN 0 ELSE 1 END;
              DECLARE @hasCreatedAt BIT = CASE WHEN COL_LENGTH('oms.PedidoEstadoHistorial', 'CreatedAt') IS NULL THEN 0 ELSE 1 END;

              DECLARE @estadoColumn SYSNAME = NULL;
              IF @hasEstadoId = 1
              BEGIN
                SET @estadoColumn = 'EstadoId';
              END
              ELSE IF @hasEstadoNuevoId = 1
              BEGIN
                SET @estadoColumn = 'EstadoNuevoId';
              END
              ELSE IF @hasNuevoEstadoId = 1
              BEGIN
                SET @estadoColumn = 'NuevoEstadoId';
              END
              ELSE
              BEGIN
                THROW 51000, 'Tabla [oms].[PedidoEstadoHistorial] no tiene columna de estado soportada', 1;
              END;

              DECLARE @columns NVARCHAR(MAX);
              DECLARE @values NVARCHAR(MAX);
              DECLARE @insertSql NVARCHAR(MAX);

              IF @hasEstadoAnteriorId = 1
              BEGIN
                SET @columns = N'[PedidoId], [EstadoAnteriorId], [' + @estadoColumn + N']';
                SET @values = N'@pedidoId, @estadoAnteriorId, @estadoId';
              END
              ELSE
              BEGIN
                SET @columns = N'[PedidoId], [' + @estadoColumn + N']';
                SET @values = N'@pedidoId, @estadoId';
              END;

              IF @hasCreatedAt = 1
              BEGIN
                SET @columns = @columns + N', [CreatedAt]';
                SET @values = @values + N', SYSUTCDATETIME()';
              END;

              SET @insertSql =
                N'INSERT INTO [oms].[PedidoEstadoHistorial] (' + @columns + N') VALUES (' + @values + N');';

              EXEC sp_executesql
                @insertSql,
                N'@pedidoId INT, @estadoId INT, @estadoAnteriorId INT',
                @pedidoId = @pedidoId,
                @estadoId = @estadoId,
                @estadoAnteriorId = @estadoAnteriorId;
            `);

          await transaction.commit();
        } catch (error) {
          try {
            await transaction.rollback();
          } catch {
            // Ignore rollback errors when transaction is already closed.
          }
          throw error;
        }
      },
      'orders.applyAssignmentUpdateAndHistory',
    );
  }

  async insertAssignmentCarrierLog(input: {
    pedidoId: number;
    empresaId: number | null;
    payloadJson: string;
    mensaje?: string | null;
  }): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, input.empresaId)
          .input('usuarioId', sql.Int, null)
          .input('nivel', sql.NVarChar(20), 'INFO')
          .input('entidad', sql.NVarChar(60), 'Pedido')
          .input('entidadId', sql.BigInt, input.pedidoId)
          .input('modulo', sql.NVarChar(60), 'orders')
          .input('accion', sql.NVarChar(120), 'assignment.confirm')
          .input(
            'mensaje',
            sql.NVarChar(510),
            input.mensaje ?? 'Confirmacion de asignacion logistica',
          )
          .input('dataJson', sql.NVarChar(sql.MAX), input.payloadJson)
          .input('ip', sql.NVarChar(90), null)
          .input('userAgent', sql.NVarChar(510), null)
          .query(`
            DECLARE @logObjectId INT = OBJECT_ID('[oms].[Log]');
            IF @logObjectId IS NULL
            BEGIN
              THROW 51000, 'Tabla [oms].[Log] no existe', 1;
            END;

            IF EXISTS (
              SELECT 1
              FROM sys.columns c
              LEFT JOIN sys.default_constraints dc
                ON dc.parent_object_id = c.object_id
               AND dc.parent_column_id = c.column_id
              WHERE c.object_id = @logObjectId
                AND c.is_identity = 0
                AND c.is_computed = 0
                AND c.is_nullable = 0
                AND dc.object_id IS NULL
                AND c.name NOT IN (
                  'EmpresaId',
                  'UsuarioId',
                  'Nivel',
                  'Modulo',
                  'Accion',
                  'Entidad',
                  'EntidadId',
                  'Mensaje',
                  'DataJson',
                  'Ip',
                  'UserAgent',
                  'CreatedAt'
                )
            )
            BEGIN
              THROW 51000, 'Tabla [oms].[Log] requiere columnas obligatorias no soportadas por Fase 2', 1;
            END;

            IF COL_LENGTH('oms.Log', 'Nivel') IS NULL
              OR COL_LENGTH('oms.Log', 'Modulo') IS NULL
              OR COL_LENGTH('oms.Log', 'Accion') IS NULL
            BEGIN
              THROW 51000, 'Tabla [oms].[Log] no tiene columnas minimas para registrar assignment.confirm', 1;
            END;

            DECLARE @logColumns NVARCHAR(MAX) = N'';
            DECLARE @logValues NVARCHAR(MAX) = N'';
            DECLARE @logInsertSql NVARCHAR(MAX);

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

            SET @logInsertSql =
              N'INSERT INTO [oms].[Log] (' + @logColumns + N') VALUES (' + @logValues + N');';

            EXEC sp_executesql
              @logInsertSql,
              N'@empresaId INT, @usuarioId INT, @nivel NVARCHAR(20), @entidad NVARCHAR(60), @entidadId BIGINT, @modulo NVARCHAR(60), @accion NVARCHAR(120), @mensaje NVARCHAR(510), @dataJson NVARCHAR(MAX), @ip NVARCHAR(90), @userAgent NVARCHAR(510)',
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
      'orders.insertAssignmentCarrierLog',
    );
  }

  private async getCitiesByPaisId(paisId: number | null): Promise<CiudadRow[]> {
    if (!paisId) {
      return [];
    }

    const result = await this.databaseService.execute<sql.IResult<CiudadRow>>(
      (pool) =>
        pool
          .request()
          .input('paisId', sql.Int, paisId)
          .query<CiudadRow>(`
            SELECT
              [CiudadId],
              [Nombre]
            FROM [oms].[Ciudad]
            WHERE [PaisId] = @paisId
            ORDER BY [Nombre] ASC, [CiudadId] ASC
          `),
      'orders.getCitiesByPaisId',
    );

    return result.recordset;
  }

  private normalizeBoolean(value: boolean | number | null): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    return Number(value) === 1;
  }
}
