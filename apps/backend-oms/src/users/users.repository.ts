import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type { CreateUserInput, UserListItem } from './users.types';

type UsuarioRow = {
  UsuarioId: number;
  EmpresaId: number | null;
  PerfilId: number;
  Nombre: string | null;
  Email: string;
  Telefono: string | null;
  Estado: unknown;
  LastLoginAt: Date | null;
  CreatedAt: Date | null;
  UpdatedAt: Date | null;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // Listado base de usuarios para gestion administrativa.
  async list(): Promise<UserListItem[]> {
    const result = await this.databaseService.execute<sql.IResult<UsuarioRow>>(
      (pool) =>
        pool.request().query<UsuarioRow>(`
          SELECT
            [UsuarioId],
            [EmpresaId],
            [PerfilId],
            [Nombre],
            [Email],
            [Telefono],
            [Estado],
            [LastLoginAt],
            [CreatedAt],
            [UpdatedAt]
          FROM [oms].[Usuario]
          ORDER BY [CreatedAt] DESC
        `),
      'users.list',
    );

    return result.recordset.map((row) => ({
      id: String(row.UsuarioId),
      empresaId: row.EmpresaId ?? 0,
      perfilId: Number(row.PerfilId),
      nombre: row.Nombre ?? '',
      email: row.Email,
      telefono: row.Telefono ?? undefined,
      estado: row.Estado as number | string | boolean,
      lastLoginAt: row.LastLoginAt?.toISOString() ?? null,
      createdAt: row.CreatedAt?.toISOString() ?? null,
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    }));
  }

  // Verifica email existente usando longitud real de columna (nvarchar(180)).
  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('email', sql.NVarChar(180), email)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Usuario]
            WHERE [Email] = @email
          `),
      'users.existsByEmail',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  // Integracion con catalogo de empresas para validar FK antes del INSERT.
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
      'users.existsEmpresaById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  // Integracion con catalogo de perfiles segun tabla oms.Perfil.
  async existsPerfilById(perfilId: number): Promise<boolean> {
    const result = await this.databaseService.execute<sql.IResult<{ count: number }>>(
      (pool) =>
        pool
          .request()
          .input('perfilId', sql.Int, perfilId)
          .query<{ count: number }>(`
            SELECT COUNT(1) AS [count]
            FROM [oms].[Perfil]
            WHERE [PerfilId] = @perfilId
          `),
      'users.existsPerfilById',
    );

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  // Inserta usuario ajustando tipos/longitudes reales de oms.Usuario.
  async create(input: CreateUserInput): Promise<{ userId: string }> {
    const estado = input.estado === 1 ? 'ACTIVO' : 'INACTIVO';

    const result = await this.databaseService.execute<
      sql.IResult<{ UsuarioId: number | string }>
    >(
      (pool) =>
        pool
          .request()
          .input('EmpresaId', sql.Int, input.empresaId)
          .input('PerfilId', sql.Int, input.perfilId)
          .input('Nombre', sql.NVarChar(140), input.nombre)
          .input('Email', sql.NVarChar(180), input.email)
          .input('Telefono', sql.NVarChar(50), input.telefono ?? null)
          .input('PasswordHash', sql.NVarChar(255), input.passwordHash)
          .input('Estado', sql.NVarChar(20), estado)
          .query<{ UsuarioId: number | string }>(`
            INSERT INTO [oms].[Usuario]
            (
              [EmpresaId],
              [PerfilId],
              [Nombre],
              [Email],
              [Telefono],
              [PasswordHash],
              [Estado],
              [LastLoginAt],
              [CreatedAt],
              [UpdatedAt]
            )
            OUTPUT INSERTED.[UsuarioId]
            VALUES
            (
              @EmpresaId,
              @PerfilId,
              @Nombre,
              @Email,
              @Telefono,
              @PasswordHash,
              @Estado,
              NULL,
              GETDATE(),
              GETDATE()
            )
          `),
      'users.create',
    );

    return { userId: String(result.recordset[0].UsuarioId) };
  }

  // Mantiene firma actual (string) pero evita CAST sobre la columna indexada.
  async updateStatus(userId: string, estado: 0 | 1): Promise<void> {
    const estadoTexto = estado === 1 ? 'ACTIVO' : 'INACTIVO';

    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('userId', sql.NVarChar(50), userId)
          .input('estado', sql.NVarChar(20), estadoTexto)
          .query(`
            UPDATE [oms].[Usuario]
            SET [Estado] = @estado,
                [UpdatedAt] = GETDATE()
            WHERE [UsuarioId] = TRY_CONVERT(INT, @userId)
          `),
      'users.updateStatus',
    );
  }

  // Mantiene firma actual (string) pero evita CAST sobre la columna indexada.
  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.databaseService.execute(
      (pool) =>
        pool
          .request()
          .input('userId', sql.NVarChar(50), userId)
          .input('passwordHash', sql.NVarChar(255), passwordHash)
          .query(`
            UPDATE [oms].[Usuario]
            SET [PasswordHash] = @passwordHash,
                [UpdatedAt] = GETDATE()
            WHERE [UsuarioId] = TRY_CONVERT(INT, @userId)
          `),
      'users.updatePasswordHash',
    );
  }
}
