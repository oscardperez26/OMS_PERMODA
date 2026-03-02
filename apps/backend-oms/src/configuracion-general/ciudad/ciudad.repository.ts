import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import type {
  CiudadListItem,
  CreateCiudadInput,
  UpdateCiudadInput,
} from './ciudad.types';

type CiudadRow = {
  CiudadId: number;
  PaisId: number;
  Nombre: string;
  Departamento: string | null;
  Codigo: string | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
};

type CiudadIdentityRow = {
  CiudadId: number;
};

@Injectable()
export class CiudadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // Listado principal para gestion de catalogo de ciudades.
  async list(): Promise<CiudadListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<CiudadRow>>(
      (pool) =>
        pool.request().query<CiudadRow>(`
          SELECT
            [CiudadId],
            [PaisId],
            [Nombre],
            [Departamento],
            [Codigo],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Ciudad]
          ORDER BY [Nombre] ASC, [CiudadId] ASC
        `),
      'ciudad.list',
    );

    return result.recordset.map((row) => ({
      ciudadId: row.CiudadId,
      paisId: row.PaisId,
      nombre: row.Nombre,
      departamento: row.Departamento ?? undefined,
      codigo: row.Codigo ?? undefined,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    }));
  }

  async findById(ciudadId: number): Promise<CiudadListItem | null> {
    const result = await this.databaseService.execute<sql.IResult<CiudadRow>>(
      (pool) =>
        pool
          .request()
          .input('ciudadId', sql.Int, ciudadId)
          .query<CiudadRow>(`
            SELECT
              [CiudadId],
              [PaisId],
              [Nombre],
              [Departamento],
              [Codigo],
              [CreatedAt],
              [UpdatedAt]
            FROM [oms].[Ciudad]
            WHERE [CiudadId] = @ciudadId
          `),
      'ciudad.findById',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    return {
      ciudadId: row.CiudadId,
      paisId: row.PaisId,
      nombre: row.Nombre,
      departamento: row.Departamento ?? undefined,
      codigo: row.Codigo ?? undefined,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  // Verifica integridad FK: oms.Ciudad.PaisId -> oms.Pais.PaisId.
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
      'ciudad.existsPaisById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  // Evita duplicados funcionales por Pais + Nombre aunque no exista unico fisico.
  async existsByPaisAndNombre(
    paisId: number,
    nombre: string,
    excludeCiudadId?: number,
  ): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) => {
        const request = pool
          .request()
          .input('paisId', sql.Int, paisId)
          .input('nombre', sql.NVarChar(160), nombre)
          .input('excludeCiudadId', sql.Int, excludeCiudadId ?? null);

        return request.query<{ count: number }>(`
          SELECT COUNT(1) AS [count]
          FROM [oms].[Ciudad]
          WHERE [PaisId] = @paisId
            AND [Nombre] = @nombre
            AND (@excludeCiudadId IS NULL OR [CiudadId] <> @excludeCiudadId)
        `);
      },
      'ciudad.existsByPaisAndNombre',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  // Inserta ciudad respetando tipos reales en oms.Ciudad.
  async create(input: CreateCiudadInput): Promise<{ ciudadId: number }> {
    const result = await this.databaseService.execute<sql.IResult<CiudadIdentityRow>>(
      (pool) =>
        pool
          .request()
          .input('PaisId', sql.Int, input.paisId)
          .input('Nombre', sql.NVarChar(160), input.nombre)
          .input('Departamento', sql.NVarChar(160), input.departamento)
          .input('Codigo', sql.NVarChar(50), input.codigo)
          .query<CiudadIdentityRow>(`
            INSERT INTO [oms].[Ciudad]
            (
              [PaisId],
              [Nombre],
              [Departamento],
              [Codigo],
              [CreatedAt],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[CiudadId]
            VALUES
            (
              @PaisId,
              @Nombre,
              @Departamento,
              @Codigo,
              SYSUTCDATETIME(),
              NULL
            )
          `),
      'ciudad.create',
    );

    return { ciudadId: result.recordset[0].CiudadId };
  }

  async update(ciudadId: number, input: UpdateCiudadInput): Promise<void> {
    await this.databaseService.execute<sql.IResult<unknown>>(
      (pool) =>
        pool
          .request()
          .input('ciudadId', sql.Int, ciudadId)
          .input('paisId', sql.Int, input.paisId)
          .input('nombre', sql.NVarChar(160), input.nombre)
          .input('departamento', sql.NVarChar(160), input.departamento)
          .input('codigo', sql.NVarChar(50), input.codigo)
          .query(`
            UPDATE [oms].[Ciudad]
            SET
              [PaisId] = @paisId,
              [Nombre] = @nombre,
              [Departamento] = @departamento,
              [Codigo] = @codigo,
              [UpdatedAt] = SYSUTCDATETIME()
            WHERE [CiudadId] = @ciudadId
          `),
      'ciudad.update',
    );
  }
}
