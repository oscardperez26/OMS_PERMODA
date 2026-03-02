import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type { CreatePaisInput, PaisListItem, UpdatePaisInput } from './pais.types';

type PaisRow = {
  PaisId: number;
  CodigoISO2: string;
  CodigoISO3: string | null;
  Nombre: string;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type PaisIdentityRow = {
  PaisId: number;
};

@Injectable()
export class PaisRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // Listado base de paises para configuracion general.
  async list(): Promise<PaisListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<PaisRow>>(
      (pool) =>
        pool.request().query<PaisRow>(`
          SELECT
            [PaisId],
            [CodigoISO2],
            [CodigoISO3],
            [Nombre],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Pais]
          ORDER BY [Nombre] ASC, [PaisId] ASC
        `),
      'pais.list',
    );

    return result.recordset.map((row) => ({
      paisId: row.PaisId,
      codigoISO2: row.CodigoISO2,
      codigoISO3: row.CodigoISO3 ?? undefined,
      nombre: row.Nombre,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    }));
  }

  async findById(paisId: number): Promise<PaisListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<PaisRow>>(
      (pool) =>
        pool
          .request()
          .input('paisId', sql.Int, paisId)
          .query<PaisRow>(`
            SELECT
              [PaisId],
              [CodigoISO2],
              [CodigoISO3],
              [Nombre],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[Pais]
            WHERE [PaisId] = @paisId
          `),
      'pais.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      paisId: row.PaisId,
      codigoISO2: row.CodigoISO2,
      codigoISO3: row.CodigoISO3 ?? undefined,
      nombre: row.Nombre,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  // Soporte a unique UX_Pais_CodigoISO2.
  async existsByCodigoISO2(
    codigoISO2: string,
    excludePaisId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('codigoISO2', sql.Char(2), codigoISO2)
          .input('excludePaisId', sql.Int, excludePaisId ?? null)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Pais]
            WHERE [CodigoISO2] = @codigoISO2
              AND (@excludePaisId IS NULL OR [PaisId] <> @excludePaisId)
          `),
      'pais.existsByCodigoISO2',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  // Inserta respetando tipos reales: char(2), char(3), nvarchar(240).
  async create(input: CreatePaisInput): Promise<{ paisId: number }> {
    const result = await this.databaseService.execute<sql.IResult<PaisIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('CodigoISO2', sql.Char(2), input.codigoISO2)
          .input('CodigoISO3', sql.Char(3), input.codigoISO3)
          .input('Nombre', sql.NVarChar(240), input.nombre)
          .query<PaisIdentityRow>(`
            INSERT INTO [oms].[Pais]
            (
              [CodigoISO2],
              [CodigoISO3],
              [Nombre],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[PaisId]
            VALUES
            (
              @CodigoISO2,
              @CodigoISO3,
              @Nombre,
              NULL
            )
          `),
      'pais.create',
    );

    return { paisId: result.recordset[0].PaisId };
  }

  async update(paisId: number, input: UpdatePaisInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('paisId', sql.Int, paisId)
          .input('codigoISO2', sql.Char(2), input.codigoISO2)
          .input('codigoISO3', sql.Char(3), input.codigoISO3)
          .input('nombre', sql.NVarChar(240), input.nombre)
          .query(`
            UPDATE [oms].[Pais]
            SET
              [CodigoISO2] = @codigoISO2,
              [CodigoISO3] = @codigoISO3,
              [Nombre] = @nombre,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [PaisId] = @paisId
          `),
      'pais.update',
    );
  }
}
