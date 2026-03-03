import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateTiendaInput,
  TiendaBootstrapData,
  TiendaCiudadListItem,
  TiendaEmpresaListItem,
  TiendaListItem,
  TiendaPaisListItem,
  UpdateTiendaInput,
} from './tienda.types';

type TiendaRow = {
  TiendaId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  PaisId: number | null;
  CiudadId: number | null;
  Direccion: string | null;
  Telefono: string | null;
  FulfillmentHabilitado: boolean;
  Activo: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type TiendaIdentityRow = {
  TiendaId: number;
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

type CiudadRow = {
  CiudadId: number;
  PaisId: number;
  Nombre: string;
};

@Injectable()
export class TiendaRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<TiendaListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<TiendaRow>>(
      (pool) =>
        pool.request().query<TiendaRow>(`
          SELECT
            [TiendaId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [PaisId],
            [CiudadId],
            [Direccion],
            [Telefono],
            [FulfillmentHabilitado],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Tienda]
          ORDER BY [Nombre] ASC, [TiendaId] ASC
        `),
      'tienda.list',
    );

    return result.recordset.map((row) => this.mapTiendaRow(row));
  }

  async listBootstrapData(): Promise<TiendaBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [TiendaId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [PaisId],
            [CiudadId],
            [Direccion],
            [Telefono],
            [FulfillmentHabilitado],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Tienda]
          ORDER BY [Nombre] ASC, [TiendaId] ASC;

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

          SELECT
            [CiudadId],
            [PaisId],
            [Nombre]
          FROM [oms].[Ciudad]
          ORDER BY [Nombre] ASC, [CiudadId] ASC;
        `),
      'tienda.listBootstrapData',
    );

    const tiendasRows = (result.recordsets?.[0] ?? []) as TiendaRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const paisesRows = (result.recordsets?.[2] ?? []) as PaisRow[];
    const ciudadesRows = (result.recordsets?.[3] ?? []) as CiudadRow[];

    return {
      tiendas: tiendasRows.map((row) => this.mapTiendaRow(row)),
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
      paises: paisesRows.map((row) => this.mapPaisRow(row)),
      ciudades: ciudadesRows.map((row) => this.mapCiudadRow(row)),
    };
  }

  async findById(tiendaId: number): Promise<TiendaListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<TiendaRow>>(
      (pool) =>
        pool
          .request()
          .input('tiendaId', sql.Int, tiendaId)
          .query<TiendaRow>(`
            SELECT
              [TiendaId],
              [EmpresaId],
              [Codigo],
              [Nombre],
              [PaisId],
              [CiudadId],
              [Direccion],
              [Telefono],
              [FulfillmentHabilitado],
              [Activo],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[Tienda]
            WHERE [TiendaId] = @tiendaId
          `),
      'tienda.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapTiendaRow(row);
  }

  async existsByEmpresaAndCodigo(
    empresaId: number,
    codigo: string,
    excludeTiendaId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('codigo', sql.NVarChar(60), codigo)
          .input('excludeTiendaId', sql.Int, excludeTiendaId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Tienda]
            WHERE [EmpresaId] = @empresaId
              AND [Codigo] = @codigo
              AND (@excludeTiendaId IS NULL OR [TiendaId] <> @excludeTiendaId)
          `),
      'tienda.existsByEmpresaAndCodigo',
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
      'tienda.existsEmpresaById',
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
      'tienda.existsPaisById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsCiudadById(ciudadId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('ciudadId', sql.Int, ciudadId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Ciudad]
            WHERE [CiudadId] = @ciudadId
          `),
      'tienda.existsCiudadById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsCiudadByIdAndPaisId(ciudadId: number, paisId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('ciudadId', sql.Int, ciudadId)
          .input('paisId', sql.Int, paisId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Ciudad]
            WHERE [CiudadId] = @ciudadId
              AND [PaisId] = @paisId
          `),
      'tienda.existsCiudadByIdAndPaisId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateTiendaInput): Promise<{ tiendaId: number }> {
    const result = await this.databaseService.execute<sql.IResult<TiendaIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('Codigo', sql.NVarChar(60), input.codigo)
          .input('Nombre', sql.NVarChar(180), input.nombre)
          .input('PaisId', sql.Int, input.paisId)
          .input('CiudadId', sql.Int, input.ciudadId)
          .input('Direccion', sql.NVarChar(255), input.direccion)
          .input('Telefono', sql.NVarChar(50), input.telefono)
          .input('FulfillmentHabilitado', sql.Bit, input.fulfillmentHabilitado)
          .input('Activo', sql.Bit, input.activo)
          .query<TiendaIdentityRow>(`
            INSERT INTO [oms].[Tienda]
            (
              [EmpresaId],
              [Codigo],
              [Nombre],
              [PaisId],
              [CiudadId],
              [Direccion],
              [Telefono],
              [FulfillmentHabilitado],
              [Activo],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[TiendaId]
            VALUES
            (
              @EmpresaId,
              @Codigo,
              @Nombre,
              @PaisId,
              @CiudadId,
              @Direccion,
              @Telefono,
              @FulfillmentHabilitado,
              @Activo,
              NULL
            )
          `),
      'tienda.create',
    );

    return { tiendaId: result.recordset[0].TiendaId };
  }

  async update(tiendaId: number, input: UpdateTiendaInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('tiendaId', sql.Int, tiendaId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('codigo', sql.NVarChar(60), input.codigo)
          .input('nombre', sql.NVarChar(180), input.nombre)
          .input('paisId', sql.Int, input.paisId)
          .input('ciudadId', sql.Int, input.ciudadId)
          .input('direccion', sql.NVarChar(255), input.direccion)
          .input('telefono', sql.NVarChar(50), input.telefono)
          .input('fulfillmentHabilitado', sql.Bit, input.fulfillmentHabilitado)
          .input('activo', sql.Bit, input.activo)
          .query(`
            UPDATE [oms].[Tienda]
            SET
              [EmpresaId] = @empresaId,
              [Codigo] = @codigo,
              [Nombre] = @nombre,
              [PaisId] = @paisId,
              [CiudadId] = @ciudadId,
              [Direccion] = @direccion,
              [Telefono] = @telefono,
              [FulfillmentHabilitado] = @fulfillmentHabilitado,
              [Activo] = @activo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [TiendaId] = @tiendaId
          `),
      'tienda.update',
    );
  }

  private mapTiendaRow(row: TiendaRow): TiendaListItem {
    return {
      tiendaId: row.TiendaId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      paisId: row.PaisId ?? undefined,
      ciudadId: row.CiudadId ?? undefined,
      direccion: row.Direccion ?? undefined,
      telefono: row.Telefono ?? undefined,
      fulfillmentHabilitado: row.FulfillmentHabilitado,
      activo: row.Activo,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): TiendaEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapPaisRow(row: PaisRow): TiendaPaisListItem {
    return {
      paisId: row.PaisId,
      codigoISO2: row.CodigoISO2,
      nombre: row.Nombre,
    };
  }

  private mapCiudadRow(row: CiudadRow): TiendaCiudadListItem {
    return {
      ciudadId: row.CiudadId,
      paisId: row.PaisId,
      nombre: row.Nombre,
    };
  }
}
