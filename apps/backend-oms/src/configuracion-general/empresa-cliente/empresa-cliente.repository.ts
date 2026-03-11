import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateEmpresaClienteInput,
  EmpresaClienteBootstrapData,
  EmpresaClienteCiudadListItem,
  EmpresaClienteEmpresaListItem,
  EmpresaClienteListItem,
  EmpresaClientePaisListItem,
  UpdateEmpresaClienteInput,
} from './empresa-cliente.types';

type EmpresaClienteRow = {
  EmpresaClienteId: number;
  EmpresaId: number;
  Nombre: string;
  DisplayName: string | null;
  LogoUrl: string | null;
  FaviconUrl: string | null;
  Documento: string | null;
  Email: string | null;
  Telefono: string | null;
  PaisId: number | null;
  CiudadId: number | null;
  Direccion: string | null;
  Estado: string;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type EmpresaClienteIdentityRow = {
  EmpresaClienteId: number;
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
export class EmpresaClienteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<EmpresaClienteListItem[]> {
    const result = await this.databaseService.execute<
      sql.IResult<EmpresaClienteRow>
    >(
      (pool) =>
        pool.request().query<EmpresaClienteRow>(`
          SELECT
            [EmpresaClienteId],
            [EmpresaId],
            [Nombre],
            [DisplayName],
            [LogoUrl],
            [FaviconUrl],
            [Documento],
            [Email],
            [Telefono],
            [PaisId],
            [CiudadId],
            [Direccion],
            [Estado],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[EmpresaCliente]
          ORDER BY [Nombre] ASC, [EmpresaClienteId] ASC
        `),
      'empresa-cliente.list',
    );

    return result.recordset.map((row) => this.mapEmpresaClienteRow(row));
  }

  async listBootstrapData(): Promise<EmpresaClienteBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [EmpresaClienteId],
            [EmpresaId],
            [Nombre],
            [DisplayName],
            [LogoUrl],
            [FaviconUrl],
            [Documento],
            [Email],
            [Telefono],
            [PaisId],
            [CiudadId],
            [Direccion],
            [Estado],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[EmpresaCliente]
          ORDER BY [Nombre] ASC, [EmpresaClienteId] ASC;

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
      'empresa-cliente.listBootstrapData',
    );

    const empresaClientesRows = (result.recordsets?.[0] ??
      []) as EmpresaClienteRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];
    const paisesRows = (result.recordsets?.[2] ?? []) as PaisRow[];
    const ciudadesRows = (result.recordsets?.[3] ?? []) as CiudadRow[];

    return {
      empresaClientes: empresaClientesRows.map((row) =>
        this.mapEmpresaClienteRow(row),
      ),
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
      paises: paisesRows.map((row) => this.mapPaisRow(row)),
      ciudades: ciudadesRows.map((row) => this.mapCiudadRow(row)),
    };
  }

  async findById(
    empresaClienteId: number,
  ): Promise<EmpresaClienteListItem | null> {
    const result = await this.databaseService.execute<
      sql.IResult<EmpresaClienteRow>
    >(
      (pool) =>
        pool.request().input('empresaClienteId', sql.Int, empresaClienteId)
          .query<EmpresaClienteRow>(`
            SELECT
              [EmpresaClienteId],
              [EmpresaId],
              [Nombre],
              [DisplayName],
              [LogoUrl],
              [FaviconUrl],
              [Documento],
              [Email],
              [Telefono],
              [PaisId],
              [CiudadId],
              [Direccion],
              [Estado],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[EmpresaCliente]
            WHERE [EmpresaClienteId] = @empresaClienteId
          `),
      'empresa-cliente.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapEmpresaClienteRow(row);
  }

  async existsByEmpresaAndDocumento(
    empresaId: number,
    documento: string,
    excludeEmpresaClienteId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('documento', sql.NVarChar(60), documento)
          .input(
            'excludeEmpresaClienteId',
            sql.Int,
            excludeEmpresaClienteId ?? null,
          ).query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[EmpresaCliente]
            WHERE [EmpresaId] = @empresaId
              AND [Documento] = @documento
              AND (@excludeEmpresaClienteId IS NULL OR [EmpresaClienteId] <> @excludeEmpresaClienteId)
          `),
      'empresa-cliente.existsByEmpresaAndDocumento',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsByEmpresaAndEmail(
    empresaId: number,
    email: string,
    excludeEmpresaClienteId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('email', sql.NVarChar(180), email)
          .input(
            'excludeEmpresaClienteId',
            sql.Int,
            excludeEmpresaClienteId ?? null,
          ).query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[EmpresaCliente]
            WHERE [EmpresaId] = @empresaId
              AND [Email] = @email
              AND (@excludeEmpresaClienteId IS NULL OR [EmpresaClienteId] <> @excludeEmpresaClienteId)
          `),
      'empresa-cliente.existsByEmpresaAndEmail',
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
      'empresa-cliente.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsPaisById(paisId: number): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool.request().input('paisId', sql.Int, paisId).query<{
          count: number;
        }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Pais]
            WHERE [PaisId] = @paisId
          `),
      'empresa-cliente.existsPaisById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsCiudadById(ciudadId: number): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool.request().input('ciudadId', sql.Int, ciudadId).query<{
          count: number;
        }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Ciudad]
            WHERE [CiudadId] = @ciudadId
          `),
      'empresa-cliente.existsCiudadById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsCiudadByIdAndPaisId(
    ciudadId: number,
    paisId: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool
          .request()
          .input('ciudadId', sql.Int, ciudadId)
          .input('paisId', sql.Int, paisId).query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Ciudad]
            WHERE [CiudadId] = @ciudadId
              AND [PaisId] = @paisId
          `),
      'empresa-cliente.existsCiudadByIdAndPaisId',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(
    input: CreateEmpresaClienteInput,
  ): Promise<{ empresaClienteId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<EmpresaClienteIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('Nombre', sql.NVarChar(180), input.nombre)
          .input('DisplayName', sql.NVarChar(180), input.displayName)
          .input('LogoUrl', sql.NVarChar(800), input.logoUrl)
          .input('FaviconUrl', sql.NVarChar(800), input.faviconUrl)
          .input('Documento', sql.NVarChar(60), input.documento)
          .input('Email', sql.NVarChar(180), input.email)
          .input('Telefono', sql.NVarChar(50), input.telefono)
          .input('PaisId', sql.Int, input.paisId)
          .input('CiudadId', sql.Int, input.ciudadId)
          .input('Direccion', sql.NVarChar(255), input.direccion)
          .input('Estado', sql.NVarChar(20), input.estado)
          .query<EmpresaClienteIdentityRow>(`
            INSERT INTO [oms].[EmpresaCliente]
            (
              [EmpresaId],
              [Nombre],
              [DisplayName],
              [LogoUrl],
              [FaviconUrl],
              [Documento],
              [Email],
              [Telefono],
              [PaisId],
              [CiudadId],
              [Direccion],
              [Estado],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[EmpresaClienteId]
            VALUES
            (
              @EmpresaId,
              @Nombre,
              @DisplayName,
              @LogoUrl,
              @FaviconUrl,
              @Documento,
              @Email,
              @Telefono,
              @PaisId,
              @CiudadId,
              @Direccion,
              @Estado,
              NULL
            )
          `),
      'empresa-cliente.create',
    );

    return { empresaClienteId: result.recordset[0].EmpresaClienteId };
  }

  async update(
    empresaClienteId: number,
    input: UpdateEmpresaClienteInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('empresaClienteId', sql.Int, empresaClienteId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('nombre', sql.NVarChar(180), input.nombre)
          .input('displayName', sql.NVarChar(180), input.displayName)
          .input('logoUrl', sql.NVarChar(800), input.logoUrl)
          .input('faviconUrl', sql.NVarChar(800), input.faviconUrl)
          .input('documento', sql.NVarChar(60), input.documento)
          .input('email', sql.NVarChar(180), input.email)
          .input('telefono', sql.NVarChar(50), input.telefono)
          .input('paisId', sql.Int, input.paisId)
          .input('ciudadId', sql.Int, input.ciudadId)
          .input('direccion', sql.NVarChar(255), input.direccion)
          .input('estado', sql.NVarChar(20), input.estado).query(`
            UPDATE [oms].[EmpresaCliente]
            SET
              [EmpresaId] = @empresaId,
              [Nombre] = @nombre,
              [DisplayName] = @displayName,
              [LogoUrl] = @logoUrl,
              [FaviconUrl] = @faviconUrl,
              [Documento] = @documento,
              [Email] = @email,
              [Telefono] = @telefono,
              [PaisId] = @paisId,
              [CiudadId] = @ciudadId,
              [Direccion] = @direccion,
              [Estado] = @estado,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [EmpresaClienteId] = @empresaClienteId
          `),
      'empresa-cliente.update',
    );
  }

  private mapEmpresaClienteRow(row: EmpresaClienteRow): EmpresaClienteListItem {
    return {
      empresaClienteId: row.EmpresaClienteId,
      empresaId: row.EmpresaId,
      nombre: row.Nombre,
      displayName: row.DisplayName ?? undefined,
      logoUrl: row.LogoUrl ?? undefined,
      faviconUrl: row.FaviconUrl ?? undefined,
      documento: row.Documento ?? undefined,
      email: row.Email ?? undefined,
      telefono: row.Telefono ?? undefined,
      paisId: row.PaisId ?? undefined,
      ciudadId: row.CiudadId ?? undefined,
      direccion: row.Direccion ?? undefined,
      estado: row.Estado,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): EmpresaClienteEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapPaisRow(row: PaisRow): EmpresaClientePaisListItem {
    return {
      paisId: row.PaisId,
      codigoISO2: row.CodigoISO2,
      nombre: row.Nombre,
    };
  }

  private mapCiudadRow(row: CiudadRow): EmpresaClienteCiudadListItem {
    return {
      ciudadId: row.CiudadId,
      paisId: row.PaisId,
      nombre: row.Nombre,
    };
  }
}
