import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';

type UsuarioRow = {
  UsuarioId: number | string;
  EmpresaId: number | string | null;
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
    // Inyectamos el servicio de base de datos para poder hacer consultas.
    /* Nota: Asegúrate de que DatabaseService esté correctamente implementado para manejar conexiones y consultas a tu base de datos SQL Server.
       Este servicio debería tener un método getPool() que devuelva una conexión o pool de conexiones listo para usar. */
    constructor(private readonly databaseService: DatabaseService) {}

  // Método para encontrar un usuario por su email, útil para el proceso de login.  
  async findByEmail(email: string): Promise<AuthDbUser | null> {
    const pool = await this.databaseService.getPool();

    const result = await pool
      .request()
      .input('email', sql.NVarChar(255), email)
      .query<UsuarioRow>(`
        SELECT TOP (1)
          [UsuarioId],
          [EmpresaId],
          [PerfilId],
          [Nombre],
          [Email],
          [PasswordHash],
          [Estado]
        FROM [OMS].[oms].[Usuario]
        WHERE [Email] = @email
      `);

    const row = result.recordset[0];
    if (!row || !row.PasswordHash) {
      return null;
    }

    return this.mapRow(row);
  }
  // Este método es útil para validar el token y cargar el usuario en cada petición autenticada.
  async findById(userId: string): Promise<AuthDbUser | null> {
    const pool = await this.databaseService.getPool();

    const result = await pool
      .request()
      .input('userId', sql.NVarChar(50), userId)
      .query<UsuarioRow>(`
        SELECT TOP (1)
          [UsuarioId],
          [EmpresaId],
          [PerfilId],
          [Nombre],
          [Email],
          [PasswordHash],
          [Estado]
        FROM [OMS].[oms].[Usuario]
        WHERE CAST([UsuarioId] AS NVARCHAR(50)) = @userId
      `);

    const row = result.recordset[0];
    if (!row || !row.PasswordHash) {
      return null;
    }

    return this.mapRow(row);
  }

  async getPasswordHashByUserId(userId: string): Promise<string | null> {
    const pool = await this.databaseService.getPool();

    const result = await pool
      .request()
      .input('userId', sql.NVarChar(50), userId)
      .query<{ PasswordHash: string | null }>(`
        SELECT TOP (1) [PasswordHash]
        FROM [OMS].[oms].[Usuario]
        WHERE CAST([UsuarioId] AS NVARCHAR(50)) = @userId
      `);

    return result.recordset[0]?.PasswordHash ?? null;
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
  // Método privado para mapear la fila de la base de datos al formato que usaremos en la aplicación.
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

  /**
   * Ajusta esta lógica si en tu tabla Estado usa otro formato.
   * Soporta varios casos comunes para evitar bloquearte al inicio.
   */
  // Puedes personalizar esta función según cómo representes el estado activo/inactivo en tu base de datos.
  private isActive(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      return normalized === '1' || normalized === 'ACTIVO' || normalized === 'ACTIVE';
    }
    return false;
  }
}
