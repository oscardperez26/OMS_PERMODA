import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  BodegaBootstrapData,
  BodegaCiudadListItem,
  BodegaEmpresaListItem,
  BodegaListItem,
  BodegaPaisListItem,
  BodegaTiendaListItem,
  CreateBodegaInput,
  UpdateBodegaInput,
} from './bodega.types';

type BodegaRow = {
  BodegaId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  Tipo: string;
  TiendaId: number | null;
  PaisId: number | null;
  CiudadId: number | null;
  Direccion: string | null;
  Activo: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type BodegaIdentityRow = {
  BodegaId: number;
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
export class BodegaRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<BodegaListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<BodegaRow>>(
      (pool) =>
        pool.request().query<BodegaRow>(`
          SELECT
            [BodegaId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Tipo],
            [TiendaId],
            [PaisId],
            [CiudadId],
            [Direccion],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Bodega]
          ORDER BY [Nombre] ASC, [BodegaId] ASC
        `),
      'bodega.list',
    );

    return result.recordset.map((row) => this.mapBodegaRow(row));
  }

  async listBootstrapData(): Promise<BodegaBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [BodegaId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Tipo],
            [TiendaId],
            [PaisId],
            [CiudadId],
            [Direccion],
            [Activo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Bodega]
          ORDER BY [Nombre] ASC, [BodegaId] ASC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [TiendaId],
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Tienda]
          ORDER BY [Nombre] ASC, [TiendaId] ASC;

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
      'bodega.listBootstrapData',
    );

    const bodegaRows = (result.recordsets?.[0] ?? []) as BodegaRow[];
    const empresaRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const tiendaRows = (result.recordsets?.[2] ?? []) as TiendaRow[];
    const paisRows = (result.recordsets?.[3] ?? []) as PaisRow[];
    const ciudadRows = (result.recordsets?.[4] ?? []) as CiudadRow[];

    return {
      bodegas: bodegaRows.map((row) => this.mapBodegaRow(row)),
      empresas: empresaRows.map((row) => this.mapEmpresaRow(row)),
      tiendas: tiendaRows.map((row) => this.mapTiendaRow(row)),
      paises: paisRows.map((row) => this.mapPaisRow(row)),
      ciudades: ciudadRows.map((row) => this.mapCiudadRow(row)),
    };
  }

  async findById(bodegaId: number): Promise<BodegaListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<BodegaRow>>(
      (pool) =>
        pool
          .request()
          .input('bodegaId', sql.Int, bodegaId)
          .query<BodegaRow>(`
            SELECT
              [BodegaId],
              [EmpresaId],
              [Codigo],
              [Nombre],
              [Tipo],
              [TiendaId],
              [PaisId],
              [CiudadId],
              [Direccion],
              [Activo],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[Bodega]
            WHERE [BodegaId] = @bodegaId
          `),
      'bodega.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapBodegaRow(row);
  }

  async existsByEmpresaAndCodigo(
    empresaId: number,
    codigo: string,
    excludeBodegaId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('codigo', sql.NVarChar(60), codigo)
          .input('excludeBodegaId', sql.Int, excludeBodegaId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Bodega]
            WHERE [EmpresaId] = @empresaId
              AND [Codigo] = @codigo
              AND (@excludeBodegaId IS NULL OR [BodegaId] <> @excludeBodegaId)
          `),
      'bodega.existsByEmpresaAndCodigo',
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
      'bodega.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsTiendaByIdAndEmpresaId(tiendaId: number, empresaId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('tiendaId', sql.Int, tiendaId)
          .input('empresaId', sql.Int, empresaId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Tienda]
            WHERE [TiendaId] = @tiendaId
              AND [EmpresaId] = @empresaId
          `),
      'bodega.existsTiendaByIdAndEmpresaId',
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
      'bodega.existsPaisById',
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
      'bodega.existsCiudadById',
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
      'bodega.existsCiudadByIdAndPaisId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateBodegaInput): Promise<{ bodegaId: number }> {
    const result = await this.databaseService.execute<sql.IResult<BodegaIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('Codigo', sql.NVarChar(60), input.codigo)
          .input('Nombre', sql.NVarChar(180), input.nombre)
          .input('Tipo', sql.NVarChar(30), input.tipo)
          .input('TiendaId', sql.Int, input.tiendaId)
          .input('PaisId', sql.Int, input.paisId)
          .input('CiudadId', sql.Int, input.ciudadId)
          .input('Direccion', sql.NVarChar(255), input.direccion)
          .input('Activo', sql.Bit, input.activo)
          .query<BodegaIdentityRow>(`
            INSERT INTO [oms].[Bodega]
            (
              [EmpresaId],
              [Codigo],
              [Nombre],
              [Tipo],
              [TiendaId],
              [PaisId],
              [CiudadId],
              [Direccion],
              [Activo],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[BodegaId]
            VALUES
            (
              @EmpresaId,
              @Codigo,
              @Nombre,
              @Tipo,
              @TiendaId,
              @PaisId,
              @CiudadId,
              @Direccion,
              @Activo,
              NULL
            )
          `),
      'bodega.create',
    );

    return { bodegaId: result.recordset[0].BodegaId };
  }

  async update(bodegaId: number, input: UpdateBodegaInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('bodegaId', sql.Int, bodegaId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('codigo', sql.NVarChar(60), input.codigo)
          .input('nombre', sql.NVarChar(180), input.nombre)
          .input('tipo', sql.NVarChar(30), input.tipo)
          .input('tiendaId', sql.Int, input.tiendaId)
          .input('paisId', sql.Int, input.paisId)
          .input('ciudadId', sql.Int, input.ciudadId)
          .input('direccion', sql.NVarChar(255), input.direccion)
          .input('activo', sql.Bit, input.activo)
          .query(`
            UPDATE [oms].[Bodega]
            SET
              [EmpresaId] = @empresaId,
              [Codigo] = @codigo,
              [Nombre] = @nombre,
              [Tipo] = @tipo,
              [TiendaId] = @tiendaId,
              [PaisId] = @paisId,
              [CiudadId] = @ciudadId,
              [Direccion] = @direccion,
              [Activo] = @activo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [BodegaId] = @bodegaId
          `),
      'bodega.update',
    );
  }

  private mapBodegaRow(row: BodegaRow): BodegaListItem {
    return {
      bodegaId: row.BodegaId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      tipo: row.Tipo,
      tiendaId: row.TiendaId ?? undefined,
      paisId: row.PaisId ?? undefined,
      ciudadId: row.CiudadId ?? undefined,
      direccion: row.Direccion ?? undefined,
      activo: row.Activo,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): BodegaEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapTiendaRow(row: TiendaRow): BodegaTiendaListItem {
    return {
      tiendaId: row.TiendaId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapPaisRow(row: PaisRow): BodegaPaisListItem {
    return {
      paisId: row.PaisId,
      codigoISO2: row.CodigoISO2,
      nombre: row.Nombre,
    };
  }

  private mapCiudadRow(row: CiudadRow): BodegaCiudadListItem {
    return {
      ciudadId: row.CiudadId,
      paisId: row.PaisId,
      nombre: row.Nombre,
    };
  }
}
