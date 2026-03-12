import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateZonaCiudadInput,
  UpdateZonaCiudadInput,
  ZonaCiudadBootstrapData,
  ZonaCiudadCiudadListItem,
  ZonaCiudadListItem,
  ZonaCiudadZonaListItem,
} from './zona-ciudad.types';

type ZonaCiudadRow = {
  ZonaTransporteId: number;
  CiudadId: number;
};

type ZonaRow = {
  ZonaTransporteId: number;
  EmpresaId: number;
  Codigo: string;
  Nombre: string;
};

type CiudadRow = {
  CiudadId: number;
  PaisId: number;
  Nombre: string;
};

@Injectable()
export class ZonaCiudadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<ZonaCiudadListItem[]> {
    const result = await this.databaseService.execute<
      sql.IResult<ZonaCiudadRow>
    >(
      (pool) =>
        pool.request().query<ZonaCiudadRow>(`
          SELECT
            [ZonaTransporteId],
            [CiudadId]
          FROM [oms].[ZonaCiudad]
          ORDER BY [ZonaTransporteId] ASC, [CiudadId] ASC
        `),
      'zona-ciudad.list',
    );

    return result.recordset.map((row) => this.mapZonaCiudadRow(row));
  }

  async listBootstrapData(): Promise<ZonaCiudadBootstrapData> {
    const result = await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool.request().query(`
          SELECT
            [ZonaTransporteId],
            [CiudadId]
          FROM [oms].[ZonaCiudad]
          ORDER BY [ZonaTransporteId] ASC, [CiudadId] ASC;

          SELECT
            [ZonaTransporteId],
            [EmpresaId],
            [Codigo],
            [Nombre]
          FROM [oms].[ZonaTransporte]
          ORDER BY [Nombre] ASC, [ZonaTransporteId] ASC;

          SELECT
            [CiudadId],
            [PaisId],
            [Nombre]
          FROM [oms].[Ciudad]
          ORDER BY [Nombre] ASC, [CiudadId] ASC;
        `),
      'zona-ciudad.listBootstrapData',
    );

    const zonasCiudadRows = (result.recordsets?.[0] ?? []) as ZonaCiudadRow[];
    const zonasRows = (result.recordsets?.[1] ?? []) as ZonaRow[];
    const ciudadesRows = (result.recordsets?.[2] ?? []) as CiudadRow[];

    return {
      zonasCiudad: zonasCiudadRows.map((row) => this.mapZonaCiudadRow(row)),
      zonasTransporte: zonasRows.map((row) => this.mapZonaRow(row)),
      ciudades: ciudadesRows.map((row) => this.mapCiudadRow(row)),
    };
  }

  async findById(
    zonaTransporteId: number,
    ciudadId: number,
  ): Promise<ZonaCiudadListItem | null> {
    const result = await this.databaseService.execute<
      sql.IResult<ZonaCiudadRow>
    >(
      (pool) =>
        pool
          .request()
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .input('ciudadId', sql.Int, ciudadId).query<ZonaCiudadRow>(`
            SELECT
              [ZonaTransporteId],
              [CiudadId]
            FROM [oms].[ZonaCiudad]
            WHERE [ZonaTransporteId] = @zonaTransporteId
              AND [CiudadId] = @ciudadId
          `),
      'zona-ciudad.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return this.mapZonaCiudadRow(row);
  }

  async existsByPk(
    zonaTransporteId: number,
    ciudadId: number,
    exclude?: { zonaTransporteId: number; ciudadId: number },
  ): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool
          .request()
          .input('zonaTransporteId', sql.Int, zonaTransporteId)
          .input('ciudadId', sql.Int, ciudadId)
          .input(
            'excludeZonaTransporteId',
            sql.Int,
            exclude?.zonaTransporteId ?? null,
          )
          .input('excludeCiudadId', sql.Int, exclude?.ciudadId ?? null).query<{
          count: number;
        }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[ZonaCiudad]
            WHERE [ZonaTransporteId] = @zonaTransporteId
              AND [CiudadId] = @ciudadId
              AND (
                @excludeZonaTransporteId IS NULL
                OR @excludeCiudadId IS NULL
                OR [ZonaTransporteId] <> @excludeZonaTransporteId
                OR [CiudadId] <> @excludeCiudadId
              )
          `),
      'zona-ciudad.existsByPk',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async existsZonaTransporteById(zonaTransporteId: number): Promise<boolean> {
    const result = await this.databaseService.execute<
      sql.IResult<{ count: number }>
    >(
      (pool) =>
        pool.request().input('zonaTransporteId', sql.Int, zonaTransporteId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[ZonaTransporte]
            WHERE [ZonaTransporteId] = @zonaTransporteId
          `),
      'zona-ciudad.existsZonaTransporteById',
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
      'zona-ciudad.existsCiudadById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateZonaCiudadInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('ZonaTransporteId', sql.Int, input.zonaTransporteId)
          .input('CiudadId', sql.Int, input.ciudadId).query(`
            INSERT INTO [oms].[ZonaCiudad]
            (
              [ZonaTransporteId],
              [CiudadId]
            )
            VALUES
            (
              @ZonaTransporteId,
              @CiudadId
            )
          `),
      'zona-ciudad.create',
    );
  }

  async update(
    currentZonaTransporteId: number,
    currentCiudadId: number,
    input: UpdateZonaCiudadInput,
  ): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('currentZonaTransporteId', sql.Int, currentZonaTransporteId)
          .input('currentCiudadId', sql.Int, currentCiudadId)
          .input('zonaTransporteId', sql.Int, input.zonaTransporteId)
          .input('ciudadId', sql.Int, input.ciudadId).query(`
            UPDATE [oms].[ZonaCiudad]
            SET
              [ZonaTransporteId] = @zonaTransporteId,
              [CiudadId] = @ciudadId
            WHERE [ZonaTransporteId] = @currentZonaTransporteId
              AND [CiudadId] = @currentCiudadId
          `),
      'zona-ciudad.update',
    );
  }

  private mapZonaCiudadRow(row: ZonaCiudadRow): ZonaCiudadListItem {
    return {
      id: `${row.ZonaTransporteId}:${row.CiudadId}`,
      zonaTransporteId: row.ZonaTransporteId,
      ciudadId: row.CiudadId,
    };
  }

  private mapZonaRow(row: ZonaRow): ZonaCiudadZonaListItem {
    return {
      zonaTransporteId: row.ZonaTransporteId,
      empresaId: row.EmpresaId,
      codigo: row.Codigo,
      nombre: row.Nombre,
    };
  }

  private mapCiudadRow(row: CiudadRow): ZonaCiudadCiudadListItem {
    return {
      ciudadId: row.CiudadId,
      paisId: row.PaisId,
      nombre: row.Nombre,
    };
  }
}
