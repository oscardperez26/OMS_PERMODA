import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateMonedaInput,
  MonedaListItem,
  UpdateMonedaInput,
} from './moneda.types';

type MonedaRow = {
  MonedaId: number;
  Codigo: string;
  Simbolo: string | null;
  Nombre: string;
  Decimales: number;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type MonedaIdentityRow = {
  MonedaId: number;
};

@Injectable()
export class MonedaRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<MonedaListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<MonedaRow>>(
      (pool) =>
        pool.request().query<MonedaRow>(`
          SELECT
            [MonedaId],
            [Codigo],
            [Simbolo],
            [Nombre],
            [Decimales],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Moneda]
          ORDER BY [Nombre] ASC, [MonedaId] ASC
        `),
      'moneda.list',
    );

    return result.recordset.map((row) => ({
      monedaId: row.MonedaId,
      codigo: row.Codigo,
      simbolo: row.Simbolo ?? undefined,
      nombre: row.Nombre,
      decimales: row.Decimales,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    }));
  }

  async findById(monedaId: number): Promise<MonedaListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<MonedaRow>>(
      (pool) =>
        pool.request().input('monedaId', sql.Int, monedaId).query<MonedaRow>(`
            SELECT
              [MonedaId],
              [Codigo],
              [Simbolo],
              [Nombre],
              [Decimales],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[Moneda]
            WHERE [MonedaId] = @monedaId
          `),
      'moneda.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

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

  async existsByCodigo(
    codigo: string,
    excludeMonedaId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool
          .request()
          .input('codigo', sql.Char(3), codigo)
          .input('excludeMonedaId', sql.Int, excludeMonedaId ?? null).query<{
          count: number;
        }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Moneda]
            WHERE [Codigo] = @codigo
              AND (@excludeMonedaId IS NULL OR [MonedaId] <> @excludeMonedaId)
          `),
      'moneda.existsByCodigo',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateMonedaInput): Promise<{ monedaId: number }> {
    const result = await this.databaseService.execute<
      sql.IResult<MonedaIdentityRow>
    >(
      (pool) =>
        pool
          .request()
          .input('Codigo', sql.Char(3), input.codigo)
          .input('Simbolo', sql.NVarChar(10), input.simbolo)
          .input('Nombre', sql.NVarChar(60), input.nombre)
          .input('Decimales', sql.TinyInt, input.decimales)
          .query<MonedaIdentityRow>(`
            INSERT INTO [oms].[Moneda]
            (
              [Codigo],
              [Simbolo],
              [Nombre],
              [Decimales],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[MonedaId]
            VALUES
            (
              @Codigo,
              @Simbolo,
              @Nombre,
              @Decimales,
              NULL
            )
          `),
      'moneda.create',
    );

    return { monedaId: result.recordset[0].MonedaId };
  }

  async update(monedaId: number, input: UpdateMonedaInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('monedaId', sql.Int, monedaId)
          .input('codigo', sql.Char(3), input.codigo)
          .input('simbolo', sql.NVarChar(10), input.simbolo)
          .input('nombre', sql.NVarChar(60), input.nombre)
          .input('decimales', sql.TinyInt, input.decimales).query(`
            UPDATE [oms].[Moneda]
            SET
              [Codigo] = @codigo,
              [Simbolo] = @simbolo,
              [Nombre] = @nombre,
              [Decimales] = @decimales,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [MonedaId] = @monedaId
          `),
      'moneda.update',
    );
  }
}
