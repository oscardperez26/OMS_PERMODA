import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  EmpresaBootstrapData,
  CreateEmpresaInput,
  EmpresaMonedaListItem,
  EmpresaPaisListItem,
  EmpresaListItem,
  UpdateEmpresaInput,
} from './empresa.types';

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  Nit: string | null;
  Email: string | null;
  Telefono: string | null;
  PaisId: number;
  CiudadId: number | null;
  Direccion: string | null;
  MonedaId: number;
  Estado: unknown;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type EmpresaIdentityRow = {
  EmpresaId: number;
};

type PaisRow = {
  PaisId: number;
  CodigoISO2: string;
  CodigoISO3: string | null;
  Nombre: string;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type MonedaRow = {
  MonedaId: number;
  Codigo: string;
  Simbolo: string | null;
  Nombre: string;
  Decimales: number;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

@Injectable()
export class EmpresaRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<EmpresaListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<EmpresaRow>>(
      (pool) =>
        pool.request().query<EmpresaRow>(`
          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Nit],
            [Email],
            [Telefono],
            [PaisId],
            [CiudadId],
            [Direccion],
            [MonedaId],
            [Estado],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC
        `),
      'empresa.list',
    );

    return result.recordset.map((row) => this.mapEmpresaRow(row));
  }

  // Reduce roundtrips SQL para la pantalla de empresas.
  async listBootstrapData(): Promise<EmpresaBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Nit],
            [Email],
            [Telefono],
            [PaisId],
            [CiudadId],
            [Direccion],
            [MonedaId],
            [Estado],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;

          SELECT
            [PaisId],
            [CodigoISO2],
            [CodigoISO3],
            [Nombre],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Pais]
          ORDER BY [Nombre] ASC, [PaisId] ASC;

          SELECT
            [MonedaId],
            [Codigo],
            [Simbolo],
            [Nombre],
            [Decimales],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Moneda]
          ORDER BY [Nombre] ASC, [MonedaId] ASC;
        `),
      'empresa.listBootstrapData',
    );

    const empresasRows = (result.recordsets?.[0] ?? []) as EmpresaRow[];
    const paisesRows = (result.recordsets?.[1] ?? []) as PaisRow[];
    const monedasRows = (result.recordsets?.[2] ?? []) as MonedaRow[];

    return {
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
      paises: paisesRows.map((row) => this.mapPaisRow(row)),
      monedas: monedasRows.map((row) => this.mapMonedaRow(row)),
    };
  }

  async findById(empresaId: number): Promise<EmpresaListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<EmpresaRow>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .query<EmpresaRow>(`
            SELECT
              [EmpresaId],
              [Codigo],
              [Nombre],
              [Nit],
              [Email],
              [Telefono],
              [PaisId],
              [CiudadId],
              [Direccion],
              [MonedaId],
              [Estado],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[Empresa]
            WHERE [EmpresaId] = @empresaId
          `),
      'empresa.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapEmpresaRow(row);
  }

  async existsByCodigo(codigo: string, excludeEmpresaId?: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('codigo', sql.NVarChar(50), codigo)
          .input('excludeEmpresaId', sql.Int, excludeEmpresaId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Empresa]
            WHERE [Codigo] = @codigo
              AND (@excludeEmpresaId IS NULL OR [EmpresaId] <> @excludeEmpresaId)
          `),
      'empresa.existsByCodigo',
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
      'empresa.existsPaisById',
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
      'empresa.existsMonedaById',
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
      'empresa.existsCiudadByIdAndPaisId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateEmpresaInput): Promise<{ empresaId: number }> {
    const result = await this.databaseService.execute<sql.IResult<EmpresaIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('Codigo', sql.NVarChar(50), input.codigo)
          .input('Nombre', sql.NVarChar(240), input.nombre)
          .input('Nit', sql.NVarChar(50), input.nit)
          .input('Email', sql.NVarChar(180), input.email)
          .input('Telefono', sql.NVarChar(50), input.telefono)
          .input('PaisId', sql.Int, input.paisId)
          .input('CiudadId', sql.Int, input.ciudadId)
          .input('Direccion', sql.NVarChar(300), input.direccion)
          .input('MonedaId', sql.Int, input.monedaId)
          .query<EmpresaIdentityRow>(`
            INSERT INTO [oms].[Empresa]
            (
              [Codigo],
              [Nombre],
              [Nit],
              [Email],
              [Telefono],
              [PaisId],
              [CiudadId],
              [Direccion],
              [MonedaId],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[EmpresaId]
            VALUES
            (
              @Codigo,
              @Nombre,
              @Nit,
              @Email,
              @Telefono,
              @PaisId,
              @CiudadId,
              @Direccion,
              @MonedaId,
              NULL
            )
          `),
      'empresa.create',
    );

    return { empresaId: result.recordset[0].EmpresaId };
  }

  async update(empresaId: number, input: UpdateEmpresaInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('codigo', sql.NVarChar(50), input.codigo)
          .input('nombre', sql.NVarChar(240), input.nombre)
          .input('nit', sql.NVarChar(50), input.nit)
          .input('email', sql.NVarChar(180), input.email)
          .input('telefono', sql.NVarChar(50), input.telefono)
          .input('paisId', sql.Int, input.paisId)
          .input('ciudadId', sql.Int, input.ciudadId)
          .input('direccion', sql.NVarChar(300), input.direccion)
          .input('monedaId', sql.Int, input.monedaId)
          .query(`
            UPDATE [oms].[Empresa]
            SET
              [Codigo] = @codigo,
              [Nombre] = @nombre,
              [Nit] = @nit,
              [Email] = @email,
              [Telefono] = @telefono,
              [PaisId] = @paisId,
              [CiudadId] = @ciudadId,
              [Direccion] = @direccion,
              [MonedaId] = @monedaId,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [EmpresaId] = @empresaId
          `),
      'empresa.update',
    );
  }

  private mapEmpresaRow(row: EmpresaRow): EmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      nit: row.Nit ?? undefined,
      email: row.Email ?? undefined,
      telefono: row.Telefono ?? undefined,
      paisId: row.PaisId,
      ciudadId: row.CiudadId ?? undefined,
      direccion: row.Direccion ?? undefined,
      monedaId: row.MonedaId,
      estado: row.Estado,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapPaisRow(row: PaisRow): EmpresaPaisListItem {
    return {
      paisId: row.PaisId,
      codigoISO2: row.CodigoISO2,
      codigoISO3: row.CodigoISO3 ?? undefined,
      nombre: row.Nombre,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapMonedaRow(row: MonedaRow): EmpresaMonedaListItem {
    return {
      monedaId: row.MonedaId,
      codigo: row.Codigo,
      simbolo: row.Simbolo ?? undefined,
      nombre: row.Nombre,
      decimales: row.Decimales,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }
}
