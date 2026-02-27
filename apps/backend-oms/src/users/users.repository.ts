import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type { CreateUserInput, UserListItem } from './users.types';

type UsuarioRow = {
  UsuarioId: number | string;
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

  async list(): Promise<UserListItem[]> {
    const pool = await this.databaseService.getPool();

    const result = await pool.request().query<UsuarioRow>(`
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
      FROM [OMS].[oms].[Usuario]
      ORDER BY [CreatedAt] DESC
    `);

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

  async existsByEmail(email: string): Promise<boolean> {
    const pool = await this.databaseService.getPool();

    const result = await pool
      .request()
      .input('email', sql.NVarChar(255), email)
      .query<{ count: number }>(`
        SELECT COUNT(1) AS [count]
        FROM [OMS].[oms].[Usuario]
        WHERE LOWER([Email]) = LOWER(@email)
      `);

    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async create(input: CreateUserInput): Promise<{ userId: string }> {
    const pool = await this.databaseService.getPool();

    const result = await pool
      .request()
      .input('EmpresaId', sql.Int, input.empresaId)
      .input('PerfilId', sql.Int, input.perfilId)
      .input('Nombre', sql.NVarChar(255), input.nombre)
      .input('Email', sql.NVarChar(255), input.email)
      .input('Telefono', sql.NVarChar(100), input.telefono ?? '')
      .input('PasswordHash', sql.NVarChar(255), input.passwordHash)
      .input('Estado', sql.Int, input.estado)
      .query<{ UsuarioId: number | string }>(`
        INSERT INTO [OMS].[oms].[Usuario]
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
      `);

    return { userId: String(result.recordset[0].UsuarioId) };
  }

  async updateStatus(userId: string, estado: 0 | 1): Promise<void> {
    const pool = await this.databaseService.getPool();

    await pool
      .request()
      .input('userId', sql.NVarChar(50), userId)
      .input('estado', sql.Int, estado)
      .query(`
        UPDATE [OMS].[oms].[Usuario]
        SET [Estado] = @estado,
            [UpdatedAt] = GETDATE()
        WHERE CAST([UsuarioId] AS NVARCHAR(50)) = @userId
      `);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const pool = await this.databaseService.getPool();

    await pool
      .request()
      .input('userId', sql.NVarChar(50), userId)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE [OMS].[oms].[Usuario]
        SET [PasswordHash] = @passwordHash,
            [UpdatedAt] = GETDATE()
        WHERE CAST([UsuarioId] AS NVARCHAR(50)) = @userId
      `);
  }
}
