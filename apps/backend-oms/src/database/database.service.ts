import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: sql.ConnectionPool | null = null;

  constructor(private readonly config: ConfigService) {}
  

  async getPool(): Promise<sql.ConnectionPool> {
    console.log('DB CONFIG', {
  host: this.config.get<string>('DB_HOST'),
  port: this.config.get<string>('DB_PORT'),
  instance: this.config.get<string>('DB_INSTANCE'),
  user: this.config.get<string>('DB_USER'),
  db: this.config.get<string>('DB_NAME'),
  encrypt: this.config.get<string>('DB_ENCRYPT'),
  trust: this.config.get<string>('DB_TRUST_CERT'),
  passwordLength: (this.config.get<string>('DB_PASSWORD') ?? '').length,
});

    if (!this.pool) {
      const instanceName = this.config.get<string>('DB_INSTANCE');
      const dbPort = this.config.get<string>('DB_PORT');

      const dbConfig: sql.config = {
        user: this.config.get<string>('DB_USER'),
        password: this.config.get<string>('DB_PASSWORD'),
        server: this.config.get<string>('DB_HOST') ?? 'localhost',
        database: this.config.get<string>('DB_NAME'),
        options: {
          encrypt: (this.config.get<string>('DB_ENCRYPT') ?? 'false') === 'true',
          trustServerCertificate:
            (this.config.get<string>('DB_TRUST_CERT') ?? 'true') === 'true',
          ...(instanceName ? { instanceName } : {}),
        },
      };

      if (!instanceName && dbPort) {
        dbConfig.port = Number(dbPort);
      }

      this.pool = await new sql.ConnectionPool(dbConfig).connect();
    }

    return this.pool;
  }

  async healthCheck() {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 1 AS ok, DB_NAME() AS databaseName
    `);
    return result.recordset[0];
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}
