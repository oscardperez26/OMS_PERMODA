import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';

type PerfilRow = {
  PerfilId: number;
  Nombre: string;
  Descripcion: string | null;
};

type PermisoRow = {
  PermisoId: number;
  Codigo: string;
  Nombre: string;
  Modulo: string;
  Accion: string;
  Activo: boolean;
};

type PerfilPermisoRow = {
  PerfilId: number;
  Codigo: string;
};

type CountRow = {
  count: number;
};

type PermissionLookupItem = {
  permisoId: number;
  codigo: string;
};

@Injectable()
export class SecurityPermissionsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listProfiles(): Promise<PerfilRow[]> {
    const result = await this.databaseService.execute<sql.IResult<PerfilRow>>(
      (pool) =>
        pool.request().query<PerfilRow>(`
          SELECT
            [PerfilId],
            [Nombre],
            CAST(NULL AS NVARCHAR(510)) AS [Descripcion]
          FROM [oms].[Perfil]
          ORDER BY [PerfilId] ASC
        `),
      'securityPermissions.listProfiles',
    );

    return result.recordset;
  }

  async listPermissionCatalog(): Promise<PermisoRow[]> {
    // Solo se exponen permisos activos para evitar asignaciones accidentales
    // sobre permisos deshabilitados en el catálogo.
    const result = await this.databaseService.execute<sql.IResult<PermisoRow>>(
      (pool) =>
        pool.request().query<PermisoRow>(`
          SELECT
            [PermisoId],
            [Codigo],
            [Nombre],
            [Modulo],
            [Accion],
            [Activo]
          FROM [oms].[Permiso]
          WHERE [Activo] = 1
          ORDER BY [Modulo] ASC, [Accion] ASC, [Codigo] ASC
        `),
      'securityPermissions.listPermissionCatalog',
    );

    return result.recordset;
  }

  async listProfilePermissionCodes(): Promise<PerfilPermisoRow[]> {
    const result = await this.databaseService.execute<
      sql.IResult<PerfilPermisoRow>
    >(
      (pool) =>
        pool.request().query<PerfilPermisoRow>(`
          SELECT
            pp.[PerfilId],
            p.[Codigo]
          FROM [oms].[PerfilPermiso] pp
          INNER JOIN [oms].[Permiso] p
            ON p.[PermisoId] = pp.[PermisoId]
          WHERE p.[Activo] = 1
          ORDER BY pp.[PerfilId] ASC, p.[Codigo] ASC
        `),
      'securityPermissions.listProfilePermissionCodes',
    );

    return result.recordset;
  }

  async listPermissionCodesByProfileId(perfilId: number): Promise<string[]> {
    try {
      const result = await this.databaseService.execute<
        sql.IResult<{ Codigo: string }>
      >(
        (pool) =>
          pool.request().input('perfilId', sql.Int, perfilId).query<{
            Codigo: string;
          }>(`
              SELECT p.[Codigo]
              FROM [oms].[PerfilPermiso] pp
              INNER JOIN [oms].[Permiso] p
                ON p.[PermisoId] = pp.[PermisoId]
              WHERE pp.[PerfilId] = @perfilId
                AND p.[Activo] = 1
              ORDER BY p.[Codigo] ASC
            `),
        'securityPermissions.listPermissionCodesByProfileId',
      );

      return result.recordset.map((row) => row.Codigo);
    } catch (error) {
      if (this.isMissingObjectError(error)) {
        // Compatibilidad durante despliegue gradual: sin tablas RBAC, se usa fallback.
        return [];
      }
      throw error;
    }
  }

  async existsProfileById(perfilId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<CountRow>>(
      (pool) =>
        pool.request().input('perfilId', sql.Int, perfilId).query<CountRow>(`
          SELECT COUNT(1) AS [count]
          FROM [oms].[Perfil]
          WHERE [PerfilId] = @perfilId
        `),
      'securityPermissions.existsProfileById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async findPermissionIdsByCodes(
    codes: string[],
  ): Promise<PermissionLookupItem[]> {
    const normalizedCodes = [
      ...new Set(codes.map((item) => item.trim())),
    ].filter((item) => item.length > 0);

    if (normalizedCodes.length === 0) {
      return [];
    }

    const result = await this.databaseService.execute<sql.IResult<PermisoRow>>(
      (pool) => {
        const request = pool.request();
        const paramNames = this.bindValues(request, 'codigo', normalizedCodes);
        const inClause = paramNames.map((name) => `@${name}`).join(', ');

        return request.query<PermisoRow>(`
          SELECT
            [PermisoId],
            [Codigo],
            [Nombre],
            [Modulo],
            [Accion],
            [Activo]
          FROM [oms].[Permiso]
          WHERE [Codigo] IN (${inClause})
            AND [Activo] = 1
        `);
      },
      'securityPermissions.findPermissionIdsByCodes',
    );

    return result.recordset.map((row) => ({
      permisoId: row.PermisoId,
      codigo: row.Codigo,
    }));
  }

  async replaceProfilePermissions(
    perfilId: number,
    permisoIds: number[],
  ): Promise<void> {
    const normalizedIds = [...new Set(permisoIds)].filter(
      (item) => Number.isInteger(item) && item > 0,
    );

    await this.databaseService.execute(async (pool) => {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        await new sql.Request(transaction).input('perfilId', sql.Int, perfilId)
          .query(`
            DELETE FROM [oms].[PerfilPermiso]
            WHERE [PerfilId] = @perfilId
          `);

        if (normalizedIds.length > 0) {
          const request = new sql.Request(transaction).input(
            'perfilId',
            sql.Int,
            perfilId,
          );
          const valueParams = this.bindValues(
            request,
            'permisoId',
            normalizedIds,
          );
          const valuesClause = valueParams
            .map((paramName) => `(@perfilId, @${paramName}, SYSUTCDATETIME())`)
            .join(', ');

          await request.query(`
            INSERT INTO [oms].[PerfilPermiso]
            (
              [PerfilId],
              [PermisoId],
              [CreatedAt]
            )
            VALUES
            ${valuesClause}
          `);
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }, 'securityPermissions.replaceProfilePermissions');
  }

  private bindValues(
    request: sql.Request,
    paramPrefix: string,
    values: ReadonlyArray<string | number>,
  ): string[] {
    const paramNames: string[] = [];

    values.forEach((value, index) => {
      const paramName = `${paramPrefix}${index}`;
      if (typeof value === 'number') {
        request.input(paramName, sql.Int, value);
      } else {
        request.input(paramName, sql.NVarChar(120), value);
      }
      paramNames.push(paramName);
    });

    return paramNames;
  }

  private isMissingObjectError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as {
      number?: number;
      originalError?: { info?: { number?: number }; number?: number };
      precedingErrors?: Array<{ number?: number }>;
    };

    const numbers = [
      maybeError.number,
      maybeError.originalError?.number,
      maybeError.originalError?.info?.number,
      ...(maybeError.precedingErrors?.map((item) => item.number) ?? []),
    ].filter((value): value is number => typeof value === 'number');

    return numbers.includes(208);
  }
}
