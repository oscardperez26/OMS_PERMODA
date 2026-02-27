import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';

type UsuarioRow = {
  UsuarioId: number;
  EmpresaId: number | null;
  PerfilId: number;
  Nombre: string | null;
  Email: string;
  PasswordHash: string | null;
  Estado: unknown;
};

export type AuthDbUser = {
  id: string;
  email: string;
  name: string;
  perfilId: number;
  empresaId?: string;
  passwordHash: string;
  isActive: boolean;
};

@Injectable()
export class UserRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // Login lookup by email.
  async findByEmail(email: string): Promise<AuthDbUser | null> {
    const pool = await this.databaseService.getPool();

    const result = await pool
      .request()
      .input('email', sql.NVarChar(180), email)
      .query<UsuarioRow>(`
        SELECT TOP (1)
          [UsuarioId],
          [EmpresaId],
          [PerfilId],
          [Nombre],
          [Email],
          [PasswordHash],
          [Estado]
        FROM [oms].[Usuario]
        WHERE [Email] = @email
      `);

    const row = result.recordset[0];
    if (!row || !row.PasswordHash) {
      return null;
    }

    return this.mapRow(row);
  }

  // User lookup by numeric id from token subject.
  async findById(userId: string): Promise<AuthDbUser | null> {
    const parsedUserId = this.parseUserId(userId);
    if (parsedUserId == null) {
      return null;
    }

    const pool = await this.databaseService.getPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, parsedUserId)
      .query<UsuarioRow>(`
        SELECT TOP (1)
          [UsuarioId],
          [EmpresaId],
          [PerfilId],
          [Nombre],
          [Email],
          [PasswordHash],
          [Estado]
        FROM [oms].[Usuario]
        WHERE [UsuarioId] = @userId
      `);

    const row = result.recordset[0];
    if (!row || !row.PasswordHash) {
      return null;
    }

    return this.mapRow(row);
  }

  async getPasswordHashByUserId(userId: string): Promise<string | null> {
    const parsedUserId = this.parseUserId(userId);
    if (parsedUserId == null) {
      return null;
    }

    const pool = await this.databaseService.getPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, parsedUserId)
      .query<{ PasswordHash: string | null }>(`
        SELECT TOP (1) [PasswordHash]
        FROM [oms].[Usuario]
        WHERE [UsuarioId] = @userId
      `);

    return result.recordset[0]?.PasswordHash ?? null;
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const parsedUserId = this.parseUserId(userId);
    if (parsedUserId == null) {
      return;
    }

    const pool = await this.databaseService.getPool();
    await pool
      .request()
      .input('userId', sql.Int, parsedUserId)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE [oms].[Usuario]
        SET [PasswordHash] = @passwordHash,
            [UpdatedAt] = GETDATE()
        WHERE [UsuarioId] = @userId
      `);
  }

  private mapRow(row: UsuarioRow): AuthDbUser {
    return {
      id: String(row.UsuarioId),
      email: row.Email,
      name: row.Nombre?.trim() || row.Email,
      perfilId: Number(row.PerfilId),
      empresaId: row.EmpresaId == null ? undefined : String(row.EmpresaId),
      passwordHash: row.PasswordHash!,
      isActive: this.isActive(row.Estado),
    };
  }

  // Supports common active value variants used in legacy rows.
  private isActive(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      return normalized === '1' || normalized === 'ACTIVO' || normalized === 'ACTIVE';
    }
    return false;
  }

  private parseUserId(raw: string): number | null {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }
}
