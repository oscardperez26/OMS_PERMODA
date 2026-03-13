import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: sql.ConnectionPool | null = null;
  private poolPromise: Promise<sql.ConnectionPool> | null = null;
  private readonly stalePools = new Set<sql.ConnectionPool>();
  private readonly stalePoolCloseTimers = new Map<
    sql.ConnectionPool,
    NodeJS.Timeout
  >();
  private readonly poolBorrowCount = new Map<sql.ConnectionPool, number>();

  constructor(private readonly config: ConfigService) {}

  async execute<T>(
    operation: (pool: sql.ConnectionPool) => Promise<T>,
    operationName = 'db.operation',
  ): Promise<T> {
    const maxAttempts = Math.max(
      1,
      this.getNumberConfig('DB_RETRY_ATTEMPTS', 5),
    );
    const baseDelayMs = Math.max(
      50,
      this.getNumberConfig('DB_RETRY_BASE_DELAY_MS', 200),
    );
    const maxDelayMs = Math.max(
      baseDelayMs,
      this.getNumberConfig('DB_RETRY_MAX_DELAY_MS', 2_000),
    );
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let pool: sql.ConnectionPool | null = null;

      try {
        pool = await this.getPool();
        this.markPoolAsBorrowed(pool);
        try {
          return await operation(pool);
        } finally {
          this.releaseBorrowedPool(pool);
        }
      } catch (error) {
        lastError = error;
        if (
          !this.isRecoverableConnectionError(error) ||
          attempt === maxAttempts
        ) {
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

        await this.resetPool(pool ?? undefined);
        const delayMs = Math.min(baseDelayMs * attempt, maxDelayMs);
        await this.delay(delayMs);
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

      this.poolPromise = pool
        .connect()
        .then((connectedPool) => {
          this.pool = connectedPool;
          return connectedPool;
        })
        .catch(async (error) => {
          try {
            await pool.close();
          } catch {
            // Ignore close errors on failed connection bootstrap.
          }
          throw error;
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
    const requestTimeout = this.getNumberConfig(
      'DB_REQUEST_TIMEOUT_MS',
      20_000,
    );
    const connectionTimeout = this.getNumberConfig(
      'DB_CONNECTION_TIMEOUT_MS',
      15_000,
    );
    const poolMax = this.getNumberConfig('DB_POOL_MAX', 10);
    const poolMin = this.getNumberConfig('DB_POOL_MIN', 1);
    const poolIdleTimeoutMillis = this.getNumberConfig(
      'DB_POOL_IDLE_MS',
      60_000,
    );

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

  private async resetPool(
    expectedPool?: sql.ConnectionPool,
    forceClose = false,
  ): Promise<void> {
    const currentPool = this.pool;

    if (currentPool && (!expectedPool || currentPool === expectedPool)) {
      this.pool = null;
      if (!forceClose) {
        // Under transient errors, avoid hard-closing immediately to prevent
        // aborting concurrent in-flight requests that still reference this pool.
        this.queueStalePoolClose(currentPool);
      } else {
        await this.forceClosePool(currentPool);
      }
    }

    if (forceClose) {
      const stale = [...this.stalePools];
      this.stalePools.clear();
      await Promise.allSettled(
        stale.map(async (pool) => this.forceClosePool(pool)),
      );
      return;
    }

    if (!expectedPool) {
      // If a reconnect attempt failed before obtaining a pool reference, avoid
      // force-closing stale pools immediately because other requests could still
      // be using them in-flight.
      [...this.stalePools].forEach((pool) => this.queueStalePoolClose(pool));
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

    this.queueStalePoolClose(pool);
  }

  private queueStalePoolClose(pool: sql.ConnectionPool): void {
    this.queueStalePoolCloseWithDelay(pool, this.getStalePoolCloseDelayMs());
  }

  private queueStalePoolCloseWithDelay(
    pool: sql.ConnectionPool,
    delayMs: number,
  ): void {
    this.stalePools.add(pool);
    if (this.stalePoolCloseTimers.has(pool)) {
      return;
    }

    // Deferred close avoids aborting in-flight concurrent queries.
    const timer = setTimeout(() => {
      this.stalePoolCloseTimers.delete(pool);
      void this.closeStalePool(pool);
    }, delayMs);
    timer.unref?.();
    this.stalePoolCloseTimers.set(pool, timer);
  }

  private async closeStalePool(pool: sql.ConnectionPool): Promise<void> {
    if (!this.stalePools.has(pool)) {
      return;
    }

    const borrowedCount = this.poolBorrowCount.get(pool) ?? 0;
    if (borrowedCount > 0) {
      // Retry later while this stale pool is still serving in-flight work.
      this.queueStalePoolCloseWithDelay(pool, 5_000);
      return;
    }

    await this.forceClosePool(pool);
  }

  private clearStalePoolCloseTimer(pool: sql.ConnectionPool): void {
    const timer = this.stalePoolCloseTimers.get(pool);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.stalePoolCloseTimers.delete(pool);
  }

  private markPoolAsBorrowed(pool: sql.ConnectionPool): void {
    this.poolBorrowCount.set(pool, (this.poolBorrowCount.get(pool) ?? 0) + 1);
  }

  private releaseBorrowedPool(pool: sql.ConnectionPool): void {
    const currentCount = this.poolBorrowCount.get(pool) ?? 0;
    if (currentCount <= 1) {
      this.poolBorrowCount.delete(pool);
    } else {
      this.poolBorrowCount.set(pool, currentCount - 1);
    }

    if (this.stalePools.has(pool)) {
      this.queueStalePoolCloseWithDelay(pool, 0);
    }
  }

  private getStalePoolCloseDelayMs(): number {
    return this.getNumberConfig('DB_STALE_POOL_CLOSE_MS', 90_000);
  }

  private async forceClosePool(pool: sql.ConnectionPool): Promise<void> {
    this.clearStalePoolCloseTimer(pool);
    this.stalePools.delete(pool);
    this.poolBorrowCount.delete(pool);
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

    if (
      codes.includes('ESOCKET') ||
      codes.includes('ECONNRESET') ||
      codes.includes('ETIMEOUT')
    ) {
      return true;
    }

    const message =
      `${maybeError.message ?? ''} ${maybeError.originalError?.message ?? ''}`.toUpperCase();
    return (
      message.includes('ECONNRESET') ||
      message.includes('CONNECTION LOST') ||
      message.includes('ABORTED') ||
      message.includes('CONNECTION IS CLOSED') ||
      message.includes('TIMEOUT')
    );
  }

  async healthCheck() {
    const result = await this.execute<
      sql.IResult<{ ok: number; databaseName: string }>
    >(
      (pool) =>
        pool.request().query(`
          SELECT 1 AS ok, DB_NAME() AS databaseName
        `),
      'health.db',
    );
    return result.recordset[0];
  }

  async onModuleDestroy() {
    await this.resetPool(undefined, true);
  }
}
