import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreatePasarelaPagoInput,
  PasarelaPagoBootstrapData,
  PasarelaPagoEmpresaListItem,
  PasarelaPagoListItem,
  UpdatePasarelaPagoInput,
} from './pasarela-pago.types';

type PasarelaPagoRow = {
  PasarelaPagoId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
  Activo: boolean;
  ConfigJson: string | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type PasarelaPagoIdentityRow = {
  PasarelaPagoId: number;
};

type EmpresaRow = {
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

@Injectable()
export class PasarelaPagoRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<PasarelaPagoListItem[]> {
    const result = await this.databaseService.execute<
      sql.IResult<PasarelaPagoRow>
    >(
      (pool) =>
        pool.request().query<PasarelaPagoRow>(`
          SELECT
            [PasarelaPagoId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Activo],
            [ConfigJson],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[PasarelaPago]
          ORDER BY [Nombre] ASC, [PasarelaPagoId] ASC
        `),
      'pasarela-pago.list',
    );

    return result.recordset.map((row) => this.mapPasarelaPagoRow(row));
  }

  async listBootstrapData(): Promise<PasarelaPagoBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [PasarelaPagoId],
            [EmpresaId],
            [Codigo],
            [Nombre],
            [Activo],
            [ConfigJson],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[PasarelaPago]
          ORDER BY [Nombre] ASC, [PasarelaPagoId] ASC;

          SELECT
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[Empresa]
          ORDER BY [Nombre] ASC, [EmpresaId] ASC;
        `),
      'pasarela-pago.listBootstrapData',
    );

    const pasarelasRows = (result.recordsets?.[0] ?? []) as PasarelaPagoRow[];
    const empresasRows = (result.recordsets?.[1] ?? []) as EmpresaRow[];

    return {
      pasarelasPago: pasarelasRows.map((row) => this.mapPasarelaPagoRow(row)),
      empresas: empresasRows.map((row) => this.mapEmpresaRow(row)),
    };
  }

  async findById(pasarelaPagoId: number): Promise<PasarelaPagoListItem | null> {
    const result = await this.databaseService.execute<
      sql.IResult<PasarelaPagoRow>
    >(
      (pool) =>
        pool.request().input('pasarelaPagoId', sql.Int, pasarelaPagoId)
          .query<PasarelaPagoRow>(`
            SELECT
              [PasarelaPagoId],
              [EmpresaId],
              [Codigo],
              [Nombre],
              [Activo],
              [ConfigJson],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[PasarelaPago]
            WHERE [PasarelaPagoId] = @pasarelaPagoId
          `),
      'pasarela-pago.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapPasarelaPagoRow(row);
  }

  async existsByEmpresaAndCodigo(
    empresaId: number,
    codigo: string,
    excludePasarelaPagoId?: number,
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
            'excludePasarelaPagoId',
            sql.Int,
            excludePasarelaPagoId ?? null,
          ).query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[PasarelaPago]
            WHERE [EmpresaId] = @empresaId
              AND [Codigo] = @codigo
              AND (@excludePasarelaPagoId IS NULL OR [PasarelaPagoId] <> @excludePasarelaPagoId)
          `),
      'pasarela-pago.existsByEmpresaAndCodigo',
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
      'pasarela-pago.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(
    input: CreatePasarelaPagoInput,
  ): Promise<{ pasarelaPagoId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<PasarelaPagoIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('Codigo', sql.NVarChar(60), input.codigo)
          .input('Nombre', sql.NVarChar(180), input.nombre)
          .input('Activo', sql.Bit, input.activo)
          .input('ConfigJson', sql.NVarChar(sql.MAX), input.configJson)
          .query<PasarelaPagoIdentityRow>(`
            INSERT INTO [oms].[PasarelaPago]
            (
              [EmpresaId],
              [Codigo],
              [Nombre],
              [Activo],
              [ConfigJson],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[PasarelaPagoId]
            VALUES
            (
              @EmpresaId,
              @Codigo,
              @Nombre,
              @Activo,
              @ConfigJson,
              NULL
            )
          `),
      'pasarela-pago.create',
    );

    return { pasarelaPagoId: result.recordset[0].PasarelaPagoId };
  }

  async update(
    pasarelaPagoId: number,
    input: UpdatePasarelaPagoInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('pasarelaPagoId', sql.Int, pasarelaPagoId)
          .input('empresaId', sql.Int, input.empresaId)
          .input('codigo', sql.NVarChar(60), input.codigo)
          .input('nombre', sql.NVarChar(180), input.nombre)
          .input('activo', sql.Bit, input.activo)
          .input('configJson', sql.NVarChar(sql.MAX), input.configJson).query(`
            UPDATE [oms].[PasarelaPago]
            SET
              [EmpresaId] = @empresaId,
              [Codigo] = @codigo,
              [Nombre] = @nombre,
              [Activo] = @activo,
              [ConfigJson] = @configJson,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [PasarelaPagoId] = @pasarelaPagoId
          `),
      'pasarela-pago.update',
    );
  }

  private mapPasarelaPagoRow(row: PasarelaPagoRow): PasarelaPagoListItem {
    return {
      pasarelaPagoId: row.PasarelaPagoId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
      activo: row.Activo,
      configJson: row.ConfigJson ?? undefined,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private mapEmpresaRow(row: EmpresaRow): PasarelaPagoEmpresaListItem {
    return {
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }
}
