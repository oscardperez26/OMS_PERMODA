import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: sql.ConnectionPool | null = null;
  private poolPromise: Promise<sql.ConnectionPool> | null = null;
  private readonly stalePools = new Set<sql.ConnectionPool>();

  constructor(private readonly config: ConfigService) {}

  async execute<T>(
    operation: (pool: sql.ConnectionPool) => Promise<T>,
    operationName = 'db.operation',
  ): Promise<T> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let pool: sql.ConnectionPool | null = null;

      try {
        pool = await this.getPool();
        return await operation(pool);
      } catch (error) {
        lastError = error;
        if (!this.isRecoverableConnectionError(error) || attempt === maxAttempts) {
          throw error;
        }

        const stack = error instanceof Error ? error.stack : undefined;
        if (pool) {
          this.markPoolAsStale(
            pool,
            `Fallo transitorio en ${operationName}. Reintentando consulta SQL.`,
            stack,
          );
        } else {
          if (stack) {
            this.logger.error(
              `Fallo transitorio conectando en ${operationName}. Reintentando.`,
              stack,
            );
          } else {
            this.logger.warn(
              `Fallo transitorio conectando en ${operationName}. Reintentando.`,
            );
          }
        }

        await this.resetPool();
        await this.delay(100 * attempt);
      }
    }

    throw lastError;
  }

  async getPool(): Promise<sql.ConnectionPool> {
    const existingPool = this.pool;

    if (!existingPool) {
      return this.connectPool();
    }

    if (!existingPool.connected && !existingPool.connecting) {
      this.markPoolAsStale(existingPool, 'Pool SQL desconectado');
      return this.connectPool();
    }

    try {
      await existingPool.request().query('SELECT 1 AS ok');
      return existingPool;
    } catch (error) {
      if (!this.isRecoverableConnectionError(error)) {
        throw error;
      }

      this.markPoolAsStale(
        existingPool,
        'Conexion SQL inestable detectada. Se recrea el pool.',
      );
      return this.connectPool();
    }
  }

  private async connectPool(): Promise<sql.ConnectionPool> {
    if (!this.poolPromise) {
      const dbConfig = this.buildConfig();
      const pool = new sql.ConnectionPool(dbConfig);

      pool.on('error', (error) => {
        const stack = error instanceof Error ? error.stack : undefined;
        this.markPoolAsStale(pool, 'Error en pool SQL', stack);
      });

      this.poolPromise = pool.connect().then((connectedPool) => {
        this.pool = connectedPool;
        return connectedPool;
      });
    }

    try {
      return await this.poolPromise;
    } finally {
      this.poolPromise = null;
    }
  }

  private buildConfig(): sql.config {
    const instanceName = this.config.get<string>('DB_INSTANCE');
    const dbPort = this.config.get<string>('DB_PORT');
    const requestTimeout = this.getNumberConfig('DB_REQUEST_TIMEOUT_MS', 20_000);
    const connectionTimeout = this.getNumberConfig(
      'DB_CONNECTION_TIMEOUT_MS',
      15_000,
    );
    const poolMax = this.getNumberConfig('DB_POOL_MAX', 10);
    const poolMin = this.getNumberConfig('DB_POOL_MIN', 1);
    const poolIdleTimeoutMillis = this.getNumberConfig('DB_POOL_IDLE_MS', 60_000);

    const dbConfig: sql.config = {
      user: this.config.get<string>('DB_USER'),
      password: this.config.get<string>('DB_PASSWORD'),
      server: this.config.get<string>('DB_HOST') ?? 'localhost',
      database: this.config.get<string>('DB_NAME'),
      requestTimeout,
      connectionTimeout,
      pool: {
        max: poolMax,
        min: poolMin,
        idleTimeoutMillis: poolIdleTimeoutMillis,
      },
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

    return dbConfig;
  }

  private getNumberConfig(key: string, fallback: number): number {
    const rawValue = this.config.get<string>(key);
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private async resetPool(expectedPool?: sql.ConnectionPool): Promise<void> {
    const currentPool = this.pool;

    if (currentPool && (!expectedPool || currentPool === expectedPool)) {
      this.pool = null;
      try {
        await currentPool.close();
      } catch {
        // Ignore close failures for already broken pools.
      }
    }

    if (!expectedPool) {
      const stale = [...this.stalePools];
      this.stalePools.clear();
      await Promise.allSettled(
        stale.map(async (pool) => {
          try {
            await pool.close();
          } catch {
            // Ignore close failures for already broken pools.
          }
        }),
      );
    }
  }

  private markPoolAsStale(
    pool: sql.ConnectionPool,
    message: string,
    stack?: string,
  ): void {
    if (stack) {
      this.logger.error(message, stack);
    } else {
      this.logger.warn(message);
    }

    if (this.pool === pool) {
      this.pool = null;
    }

    if (this.stalePools.has(pool)) {
      return;
    }

    this.stalePools.add(pool);

    // Deferred close avoids aborting in-flight concurrent queries.
    setTimeout(() => {
      void this.closeStalePool(pool);
    }, 30_000);
  }

  private async closeStalePool(pool: sql.ConnectionPool): Promise<void> {
    if (!this.stalePools.has(pool)) {
      return;
    }

    this.stalePools.delete(pool);
    try {
      await pool.close();
    } catch {
      // Ignore close failures for already broken pools.
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRecoverableConnectionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as {
      code?: string;
      message?: string;
      originalError?: { code?: string; message?: string };
    };

    const codes = [maybeError.code, maybeError.originalError?.code].filter(
      (value): value is string => Boolean(value),
    );

    if (codes.includes('ESOCKET') || codes.includes('ECONNRESET')) {
      return true;
    }

    const message =
      `${maybeError.message ?? ''} ${maybeError.originalError?.message ?? ''}`.toUpperCase();
    return (
      message.includes('ECONNRESET') ||
      message.includes('CONNECTION LOST') ||
      message.includes('ABORTED') ||
      message.includes('CONNECTION IS CLOSED')
    );
  }

  async healthCheck() {
    const result = await this.execute<sql.IResult<{ ok: number; databaseName: string }>>(
      (pool) =>
        pool.request().query(`
          SELECT 1 AS ok, DB_NAME() AS databaseName
        `),
      'health.db',
    );
    return result.recordset[0];
  }

  async onModuleDestroy() {
    await this.resetPool();
  }
}
