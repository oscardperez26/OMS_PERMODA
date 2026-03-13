import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SyncPendingResult } from '../../orders/orders.types';
import { GenericBlockedInboundAdapter } from './adapters/generic-blocked-inbound.adapter';
import type {
  IntegracionEntranteAdapterExecutionResult,
  IntegracionEntranteSyncAdapter,
} from './adapters/integracion-entrante-sync.adapter';
import { KoajPilotInboundAdapter } from './adapters/koaj-pilot-inbound.adapter';
import type { CreateIntegracionEntranteDto } from './dto/create-integracion-entrante.dto';
import type { UpdateIntegracionEntranteDto } from './dto/update-integracion-entrante.dto';
import { IntegracionesEntrantesRepository } from './integraciones-entrantes.repository';
import type {
  IntegracionEntranteAutoSyncBatchResult,
  IntegracionEntranteConfig,
  IntegracionEntranteDedupeSummary,
  IntegracionEntranteDiagnosticsSummary,
  IntegracionEntranteLastSync,
  IntegracionEntranteListItem,
  IntegracionEntranteMode,
  IntegracionEntranteOperationStatus,
  IntegracionEntrantePersistenceRow,
  IntegracionEntranteRunLog,
  IntegracionEntranteSyncResult,
  IntegracionEntranteTemplate,
  IntegracionEntranteValidationResult,
  IntegracionesEntrantesBootstrap,
} from './integraciones-entrantes.types';

type SyncNowParams = {
  limit?: number;
};

type OperationActor = {
  userId: number | null;
  username: string | null;
};

type InboundConfigPayload = Partial<{
  providerCode: string;
  mode: IntegracionEntranteMode;
  baseUrl: string | null;
  authType: 'API_KEY';
  timeoutMs: number;
  listConfirmedOrdersEndpoint: string | null;
  orderDetailEndpoint: string | null;
  confirmedStatuses: string[];
  externalOrderIdField: string | null;
  externalReferenceField: string | null;
  customerNameField: string | null;
  totalField: string | null;
  statusField: string | null;
}>;

@Injectable()
export class IntegracionesEntrantesService {
  private readonly connectorSyncLocks = new Set<number>();
  private readonly syncAdapters: IntegracionEntranteSyncAdapter[];

  constructor(
    private readonly integracionesEntrantesRepository: IntegracionesEntrantesRepository,
    koajPilotInboundAdapter: KoajPilotInboundAdapter,
    genericBlockedInboundAdapter: GenericBlockedInboundAdapter,
  ) {
    this.syncAdapters = [koajPilotInboundAdapter, genericBlockedInboundAdapter];
  }

  async listBootstrap(): Promise<IntegracionesEntrantesBootstrap> {
    const data = await this.integracionesEntrantesRepository.listWithCatalog();

    const integracionesEntrantes = data.rows
      .map((row) => this.mapRowToInboundItem(row))
      .filter((item): item is IntegracionEntranteListItem => item !== null)
      .sort((a, b) => a.integracionId - b.integracionId);

    return {
      integracionesEntrantes,
      empresas: data.empresas,
      canalesVenta: data.canalesVenta,
      templates: this.getTemplates(),
      zonaIntegracion: {
        enabled: false,
        status: 'PENDIENTE',
        message:
          'Zona de Integracion aun no implementada. Se mantiene como placeholder en V1.',
      },
    };
  }

  async getById(integracionId: number): Promise<IntegracionEntranteListItem> {
    const row = await this.integracionesEntrantesRepository.findById(
      integracionId,
    );
    if (!row) {
      throw new NotFoundException('Integracion no existe');
    }

    const inbound = this.mapRowToInboundItem(row);
    if (!inbound) {
      throw new NotFoundException(
        'La integracion solicitada no pertenece al flujo entrante',
      );
    }

    inbound.dedupe =
      await this.integracionesEntrantesRepository.getDedupeSummaryByIntegracion(
        inbound.integracionId,
      );

    return inbound;
  }

  async listRuns(
    integracionId: number,
    limit?: number,
  ): Promise<IntegracionEntranteRunLog[]> {
    const row = await this.integracionesEntrantesRepository.findById(
      integracionId,
    );
    if (!row) {
      throw new NotFoundException('Integracion no existe');
    }

    const inbound = this.mapRowToInboundItem(row);
    if (!inbound) {
      throw new NotFoundException(
        'La integracion solicitada no pertenece al flujo entrante',
      );
    }

    const normalizedLimit = this.normalizePositiveInteger(limit, 20);
    return this.integracionesEntrantesRepository.listRecentSyncRuns(
      inbound.integracionId,
      normalizedLimit,
    );
  }

  async create(
    params: CreateIntegracionEntranteDto,
  ): Promise<{ integracionId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const canalVentaId = this.normalizeRequiredId(
      params.canalVentaId,
      'canalVentaId',
    );
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 240);
    const estado = this.mapActivoToEstado(this.normalizeBoolean(params.activo, true));
    const config = this.buildConfigFromPayload({
      providerCode: params.providerCode,
      mode: params.mode,
      baseUrl: params.baseUrl,
      authType: params.authType,
      timeoutMs: params.timeoutMs,
      listConfirmedOrdersEndpoint: params.listConfirmedOrdersEndpoint,
      orderDetailEndpoint: params.orderDetailEndpoint,
      confirmedStatuses: params.confirmedStatuses,
      externalOrderIdField: params.externalOrderIdField,
      externalReferenceField: params.externalReferenceField,
      customerNameField: params.customerNameField,
      totalField: params.totalField,
      statusField: params.statusField,
    });

    await this.validateEmpresaCanal(empresaId, canalVentaId);

    const duplicatedCode =
      await this.integracionesEntrantesRepository.existsByEmpresaAndCodigo(
        empresaId,
        codigo,
      );
    if (duplicatedCode) {
      throw new ConflictException(
        'Ya existe una integracion con ese codigo en la empresa',
      );
    }

    try {
      return await this.integracionesEntrantesRepository.create({
        empresaId,
        canalVentaId,
        codigo,
        nombre,
        estado,
        configJson: JSON.stringify(config),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una integracion con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async update(
    integracionId: number,
    params: UpdateIntegracionEntranteDto,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.canalVentaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.activo !== undefined ||
      params.providerCode !== undefined ||
      params.mode !== undefined ||
      params.baseUrl !== undefined ||
      params.authType !== undefined ||
      params.timeoutMs !== undefined ||
      params.listConfirmedOrdersEndpoint !== undefined ||
      params.orderDetailEndpoint !== undefined ||
      params.confirmedStatuses !== undefined ||
      params.externalOrderIdField !== undefined ||
      params.externalReferenceField !== undefined ||
      params.customerNameField !== undefined ||
      params.totalField !== undefined ||
      params.statusField !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    const currentRow = await this.integracionesEntrantesRepository.findById(
      integracionId,
    );
    if (!currentRow) {
      throw new NotFoundException('Integracion no existe');
    }

    const current = this.mapRowToInboundItem(currentRow);
    if (!current) {
      throw new BadRequestException(
        'Solo se pueden editar integraciones del flujo entrante',
      );
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextCanalVentaId =
      params.canalVentaId !== undefined
        ? this.normalizeRequiredId(params.canalVentaId, 'canalVentaId')
        : current.canalVentaId;
    const nextCodigo =
      params.codigo !== undefined
        ? this.normalizeCodigo(params.codigo)
        : current.codigo;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 240)
        : current.nombre;
    const nextEstado =
      params.activo !== undefined
        ? this.mapActivoToEstado(this.normalizeBoolean(params.activo))
        : this.mapActivoToEstado(current.activo);

    await this.validateEmpresaCanal(nextEmpresaId, nextCanalVentaId);

    const duplicatedCode =
      await this.integracionesEntrantesRepository.existsByEmpresaAndCodigo(
        nextEmpresaId,
        nextCodigo,
        integracionId,
      );
    if (duplicatedCode) {
      throw new ConflictException(
        'Ya existe una integracion con ese codigo en la empresa',
      );
    }

    const nextConfig = this.buildConfigFromPayload(
      {
        providerCode: params.providerCode,
        mode: params.mode,
        baseUrl: params.baseUrl,
        authType: params.authType,
        timeoutMs: params.timeoutMs,
        listConfirmedOrdersEndpoint: params.listConfirmedOrdersEndpoint,
        orderDetailEndpoint: params.orderDetailEndpoint,
        confirmedStatuses: params.confirmedStatuses,
        externalOrderIdField: params.externalOrderIdField,
        externalReferenceField: params.externalReferenceField,
        customerNameField: params.customerNameField,
        totalField: params.totalField,
        statusField: params.statusField,
      },
      current.config,
    );

    // Si la configuracion funcional cambia, se exige revalidacion y se limpia ultimo sync.
    if (this.hasFunctionalConfigChanged(current.config, nextConfig)) {
      nextConfig.validation = {
        isValid: false,
        status: 'FAILED',
        message: 'Configuracion modificada, ejecutar validacion nuevamente',
        errors: ['Configuracion modificada, ejecutar validacion nuevamente'],
        validatedAt: null,
        runId: null,
        durationMs: null,
        executedBy: null,
        errorCode: 'CONFIG_CHANGED',
        errorMessage: 'Configuracion modificada, ejecutar validacion nuevamente',
        diagnosticsSummary: null,
      };
      nextConfig.lastSync = null;
    }

    try {
      await this.integracionesEntrantesRepository.update(integracionId, {
        empresaId: nextEmpresaId,
        canalVentaId: nextCanalVentaId,
        codigo: nextCodigo,
        nombre: nextNombre,
        estado: nextEstado,
        configJson: JSON.stringify(nextConfig),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una integracion con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async validate(
    integracionId: number,
    actor?: OperationActor,
  ): Promise<IntegracionEntranteValidationResult> {
    const startedAt = Date.now();
    const runId = this.generateRunId('VAL');
    const row = await this.integracionesEntrantesRepository.findById(
      integracionId,
    );
    if (!row) {
      throw new NotFoundException('Integracion no existe');
    }

    const inbound = this.mapRowToInboundItem(row);
    if (!inbound) {
      throw new BadRequestException(
        'Solo se pueden validar integraciones del flujo entrante',
      );
    }

    const nowIso = new Date().toISOString();
    const validationErrors = this.computeValidationErrors(inbound.config);
    const status: IntegracionEntranteOperationStatus =
      validationErrors.length === 0 ? 'OK' : 'FAILED';
    const message =
      validationErrors.length === 0
        ? 'Configuracion valida'
        : `Configuracion invalida: ${validationErrors.join(' | ')}`;
    const durationMs = this.getDurationMs(startedAt);
    const executedBy = this.resolveActorLabel(actor);

    const nextConfig: IntegracionEntranteConfig = {
      ...inbound.config,
      validation: {
        isValid: validationErrors.length === 0,
        status,
        message,
        errors: validationErrors,
        validatedAt: nowIso,
        runId,
        durationMs,
        executedBy,
        errorCode: validationErrors.length === 0 ? null : 'VALIDATION_ERROR',
        errorMessage: validationErrors.length === 0 ? null : message,
        diagnosticsSummary: null,
      },
    };

    await this.integracionesEntrantesRepository.update(inbound.integracionId, {
      empresaId: inbound.empresaId,
      canalVentaId: inbound.canalVentaId,
      codigo: inbound.codigo,
      nombre: inbound.nombre,
      estado: this.mapActivoToEstado(inbound.activo),
      configJson: JSON.stringify(nextConfig),
    });

    await this.tryInsertOperationalLog({
      empresaId: inbound.empresaId,
      usuarioId: this.resolveActorUserId(actor),
      integracionId: inbound.integracionId,
      accion: 'validate',
      nivel: status === 'OK' ? 'INFO' : 'WARN',
      mensaje: message,
      dataJson: JSON.stringify({
        runId,
        integracionId: inbound.integracionId,
        status,
        message,
        durationMs,
        executedBy,
        errors: validationErrors,
      }),
    });

    return {
      integracionId: inbound.integracionId,
      status,
      message,
      runId,
      isValid: nextConfig.validation.isValid,
      errors: nextConfig.validation.errors,
      validatedAt: nowIso,
    };
  }

  async syncNow(
    integracionId: number,
    params: SyncNowParams,
    actor?: OperationActor,
  ): Promise<IntegracionEntranteSyncResult> {
    const startedAt = Date.now();
    const runId = this.generateRunId('SYNC');
    const executedBy = this.resolveActorLabel(actor);
    const row = await this.integracionesEntrantesRepository.findById(
      integracionId,
    );
    if (!row) {
      throw new NotFoundException('Integracion no existe');
    }

    const inbound = this.mapRowToInboundItem(row);
    if (!inbound) {
      throw new BadRequestException(
        'Solo se pueden sincronizar integraciones del flujo entrante',
      );
    }

    if (!this.tryAcquireConnectorSyncLock(inbound.integracionId)) {
      const blockedResult = this.buildBlockedSyncResult({
        inbound,
        runId,
        startedAt,
        message:
          'Ya existe una sincronizacion en curso para este conector. Intenta nuevamente en unos segundos.',
        errorCode: 'SYNC_IN_PROGRESS',
      });
      await this.persistSyncOutcome(inbound, blockedResult, executedBy);
      await this.tryInsertSyncOperationalLog(inbound, blockedResult, actor);
      return blockedResult;
    }

    try {
      const validationErrors = this.computeValidationErrors(inbound.config);
      if (validationErrors.length > 0) {
        const message = `Configuracion invalida: ${validationErrors.join(' | ')}`;
        const blockedResult = this.buildBlockedSyncResult({
          inbound,
          runId,
          startedAt,
          message,
          errorCode: 'CONFIG_INVALID',
        });
        const nowIso = new Date().toISOString();
        const nextConfig: IntegracionEntranteConfig = {
          ...inbound.config,
          validation: {
            ...inbound.config.validation,
            isValid: false,
            status: 'FAILED',
            message,
            errors: validationErrors,
            validatedAt: nowIso,
            runId,
            durationMs: blockedResult.durationMs,
            executedBy,
            errorCode: 'CONFIG_INVALID',
            errorMessage: message,
            diagnosticsSummary: null,
          },
          lastSync: this.buildLastSyncFromResult(blockedResult, executedBy),
        };
        await this.persistInboundConfig(inbound, nextConfig);
        await this.tryInsertSyncOperationalLog(inbound, blockedResult, actor);
        return blockedResult;
      }

      try {
        const adapter = this.resolveSyncAdapter(inbound);
        const execution = await adapter.execute({
          inbound,
          limit: params.limit,
        });

        if (execution.kind === 'BLOCKED') {
          const blockedResult = this.buildBlockedSyncResult({
            inbound,
            runId,
            startedAt,
            message: execution.message,
            errorCode: execution.errorCode,
          });
          await this.persistSyncOutcome(inbound, blockedResult, executedBy);
          await this.tryInsertSyncOperationalLog(inbound, blockedResult, actor);
          return blockedResult;
        }

        const result = this.buildSyncResultFromOrdersSync(
          inbound,
          execution.syncResult,
          runId,
          startedAt,
        );
        await this.persistSyncOutcome(inbound, result, executedBy);
        await this.tryInsertSyncOperationalLog(inbound, result, actor);
        return result;
      } catch (error) {
        const normalizedError = this.normalizeSyncError(error);
        const failedResult = this.buildFailedSyncResult({
          inbound,
          runId,
          startedAt,
          errorCode: normalizedError.errorCode,
          errorMessage: normalizedError.errorMessage,
        });
        await this.persistSyncOutcome(inbound, failedResult, executedBy);
        await this.tryInsertSyncOperationalLog(inbound, failedResult, actor);
        return failedResult;
      }
    } finally {
      this.releaseConnectorSyncLock(inbound.integracionId);
    }
  }

  async runAutoSyncBatch(options?: {
    limit?: number;
    maxConnectors?: number;
    executedBy?: string;
  }): Promise<IntegracionEntranteAutoSyncBatchResult> {
    const maxConnectors = this.normalizePositiveInteger(
      options?.maxConnectors,
      10,
    );
    const actor: OperationActor = {
      userId: null,
      username:
        this.trimOrNull(options?.executedBy, 180) ?? 'system:auto-sync',
    };

    const rows = await this.integracionesEntrantesRepository.listActive();
    const inboundConnectors = rows
      .map((row) => this.mapRowToInboundItem(row))
      .filter((item): item is IntegracionEntranteListItem => item !== null)
      .filter((item) => item.activo)
      .slice(0, maxConnectors);

    const result: IntegracionEntranteAutoSyncBatchResult = {
      processed: inboundConnectors.length,
      ok: 0,
      blocked: 0,
      failed: 0,
      connectors: [],
    };

    for (const inbound of inboundConnectors) {
      const syncResult = await this.syncNow(
        inbound.integracionId,
        { limit: options?.limit },
        actor,
      );

      if (syncResult.status === 'OK') {
        result.ok += 1;
      } else if (syncResult.status === 'BLOCKED') {
        result.blocked += 1;
      } else {
        result.failed += 1;
      }

      result.connectors.push({
        integracionId: inbound.integracionId,
        codigo: inbound.codigo,
        status: syncResult.status,
        runId: syncResult.runId,
        message: syncResult.message,
      });
    }

    return result;
  }

  private mapRowToInboundItem(
    row: IntegracionEntrantePersistenceRow,
  ): IntegracionEntranteListItem | null {
    if (!row.ConfigJson) {
      return null;
    }

    const parsedConfig = this.parseConfigJson(row.ConfigJson, row.Codigo);
    if (!parsedConfig) {
      return null;
    }

    return {
      integracionId: row.IntegracionId,
      empresaId: row.EmpresaId,
      empresaCodigo: row.EmpresaCodigo,
      empresaNombre: row.EmpresaNombre,
      canalVentaId: row.CanalVentaId,
      canalVentaCodigo: row.CanalVentaCodigo,
      canalVentaNombre: row.CanalVentaNombre,
      codigo: row.Codigo,
      nombre: row.Nombre,
      activo: this.mapEstadoToActivo(row.Estado),
      config: parsedConfig,
      dedupe: null,
      createdAt: row.CreatedAt.toISOString(),
      updatedAt: row.UpdatedAt?.toISOString() ?? null,
    };
  }

  private parseConfigJson(
    configJson: string | null,
    fallbackCodigo: string,
  ): IntegracionEntranteConfig | null {
    const baseConfig = this.getDefaultConfig(
      fallbackCodigo.toUpperCase().includes('KOAJ') ? 'KOAJ' : 'GENERIC',
    );

    if (!configJson) {
      return null;
    }

    try {
      const payload = JSON.parse(configJson) as InboundConfigPayload & {
        flowType?: string;
        connection?: Partial<IntegracionEntranteConfig['connection']>;
        endpoints?: Partial<IntegracionEntranteConfig['endpoints']>;
        filters?: Partial<IntegracionEntranteConfig['filters']>;
        mapping?: Partial<IntegracionEntranteConfig['mapping']>;
        validation?: IntegracionEntranteConfig['validation'];
        lastSync?: IntegracionEntranteConfig['lastSync'];
      };

      if (payload.flowType !== 'INBOUND') {
        return null;
      }

      const normalized = this.buildConfigFromPayload(
        {
          providerCode: payload.providerCode,
          mode: payload.mode,
          baseUrl: payload.baseUrl ?? payload.connection?.baseUrl,
          authType: payload.authType ?? payload.connection?.authType,
          timeoutMs: payload.timeoutMs ?? payload.connection?.timeoutMs,
          listConfirmedOrdersEndpoint:
            payload.listConfirmedOrdersEndpoint ??
            payload.endpoints?.listConfirmedOrdersEndpoint,
          orderDetailEndpoint:
            payload.orderDetailEndpoint ?? payload.endpoints?.orderDetailEndpoint,
          confirmedStatuses:
            payload.confirmedStatuses ?? payload.filters?.confirmedStatuses,
          externalOrderIdField:
            payload.externalOrderIdField ?? payload.mapping?.externalOrderIdField,
          externalReferenceField:
            payload.externalReferenceField ?? payload.mapping?.externalReferenceField,
          customerNameField:
            payload.customerNameField ?? payload.mapping?.customerNameField,
          totalField: payload.totalField ?? payload.mapping?.totalField,
          statusField: payload.statusField ?? payload.mapping?.statusField,
        },
        baseConfig,
      );

      return {
        ...normalized,
        validation: this.normalizeValidationState(
          payload.validation,
          normalized.validation,
        ),
        lastSync: this.normalizeLastSyncState(
          payload.lastSync,
          normalized.lastSync,
        ),
      };
    } catch {
      return null;
    }
  }

  private buildConfigFromPayload(
    payload: InboundConfigPayload,
    current?: IntegracionEntranteConfig,
  ): IntegracionEntranteConfig {
    const base =
      current ??
      this.getDefaultConfig(
        payload.providerCode ? payload.providerCode.toUpperCase() : 'GENERIC',
      );

    const providerCode =
      payload.providerCode !== undefined
        ? this.normalizeProviderCode(payload.providerCode)
        : base.providerCode;
    const mode =
      payload.mode !== undefined
        ? this.normalizeMode(payload.mode)
        : base.mode;

    const next: IntegracionEntranteConfig = {
      ...base,
      flowType: 'INBOUND',
      providerCode,
      mode,
      connection: {
        baseUrl:
          payload.baseUrl !== undefined
            ? this.normalizeOptionalText(payload.baseUrl, 'baseUrl', 500)
            : base.connection.baseUrl,
        authType: payload.authType ?? base.connection.authType,
        timeoutMs:
          payload.timeoutMs !== undefined
            ? this.normalizeTimeout(payload.timeoutMs)
            : base.connection.timeoutMs,
      },
      endpoints: {
        listConfirmedOrdersEndpoint:
          payload.listConfirmedOrdersEndpoint !== undefined
            ? this.normalizeOptionalText(
                payload.listConfirmedOrdersEndpoint,
                'listConfirmedOrdersEndpoint',
                300,
              )
            : base.endpoints.listConfirmedOrdersEndpoint,
        orderDetailEndpoint:
          payload.orderDetailEndpoint !== undefined
            ? this.normalizeOptionalText(
                payload.orderDetailEndpoint,
                'orderDetailEndpoint',
                300,
              )
            : base.endpoints.orderDetailEndpoint,
      },
      filters: {
        confirmedStatuses:
          payload.confirmedStatuses !== undefined
            ? this.normalizeStatusList(payload.confirmedStatuses)
            : base.filters.confirmedStatuses,
      },
      mapping: {
        externalOrderIdField:
          payload.externalOrderIdField !== undefined
            ? this.normalizeOptionalText(
                payload.externalOrderIdField,
                'externalOrderIdField',
                120,
              )
            : base.mapping.externalOrderIdField,
        externalReferenceField:
          payload.externalReferenceField !== undefined
            ? this.normalizeOptionalText(
                payload.externalReferenceField,
                'externalReferenceField',
                120,
              )
            : base.mapping.externalReferenceField,
        customerNameField:
          payload.customerNameField !== undefined
            ? this.normalizeOptionalText(
                payload.customerNameField,
                'customerNameField',
                120,
              )
            : base.mapping.customerNameField,
        totalField:
          payload.totalField !== undefined
            ? this.normalizeOptionalText(payload.totalField, 'totalField', 120)
            : base.mapping.totalField,
        statusField:
          payload.statusField !== undefined
            ? this.normalizeOptionalText(payload.statusField, 'statusField', 120)
            : base.mapping.statusField,
      },
    };

    return next;
  }

  private async validateEmpresaCanal(
    empresaId: number,
    canalVentaId: number,
  ): Promise<void> {
    const empresaExists =
      await this.integracionesEntrantesRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }

    const canalExists =
      await this.integracionesEntrantesRepository.existsCanalByIdAndEmpresa(
        canalVentaId,
        empresaId,
      );
    if (!canalExists) {
      throw new BadRequestException(
        'CanalVentaId no pertenece a la empresa indicada',
      );
    }
  }

  private computeValidationErrors(config: IntegracionEntranteConfig): string[] {
    const errors: string[] = [];

    if (!config.providerCode.trim()) {
      errors.push('providerCode es obligatorio');
    }

    // KOAJ piloto usa la logica existente de sync por variables de entorno.
    // En V1 no bloqueamos por campos de conexion/mapeo para este modo.
    if (
      config.mode === 'KOAJ_PILOT' &&
      config.providerCode.trim().toUpperCase() === 'KOAJ'
    ) {
      return errors;
    }

    if (!config.connection.baseUrl) {
      errors.push('connection.baseUrl es obligatorio');
    } else {
      try {
        const url = new URL(config.connection.baseUrl);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          errors.push('connection.baseUrl debe iniciar con http o https');
        }
      } catch {
        errors.push('connection.baseUrl no es una URL valida');
      }
    }

    if (
      !Number.isInteger(config.connection.timeoutMs) ||
      config.connection.timeoutMs < 1000 ||
      config.connection.timeoutMs > 60000
    ) {
      errors.push('connection.timeoutMs debe estar entre 1000 y 60000');
    }

    if (
      !config.endpoints.listConfirmedOrdersEndpoint ||
      !config.endpoints.listConfirmedOrdersEndpoint.startsWith('/')
    ) {
      errors.push('endpoints.listConfirmedOrdersEndpoint debe iniciar con "/"');
    }

    if (
      !config.endpoints.orderDetailEndpoint ||
      !config.endpoints.orderDetailEndpoint.startsWith('/')
    ) {
      errors.push('endpoints.orderDetailEndpoint debe iniciar con "/"');
    }

    if (config.filters.confirmedStatuses.length === 0) {
      errors.push('filters.confirmedStatuses requiere al menos un estado');
    }

    if (!config.mapping.externalOrderIdField) {
      errors.push('mapping.externalOrderIdField es obligatorio');
    }

    if (!config.mapping.statusField) {
      errors.push('mapping.statusField es obligatorio');
    }

    return errors;
  }

  private hasFunctionalConfigChanged(
    current: IntegracionEntranteConfig,
    next: IntegracionEntranteConfig,
  ): boolean {
    const normalize = (value: IntegracionEntranteConfig) =>
      JSON.stringify({
        flowType: value.flowType,
        providerCode: value.providerCode,
        mode: value.mode,
        connection: value.connection,
        endpoints: value.endpoints,
        filters: value.filters,
        mapping: value.mapping,
      });

    return normalize(current) !== normalize(next);
  }

  private resolveSyncAdapter(
    inbound: IntegracionEntranteListItem,
  ): IntegracionEntranteSyncAdapter {
    const adapter = this.syncAdapters.find((item) => item.supports(inbound));
    if (!adapter) {
      throw new BadRequestException(
        `No existe adapter para ${inbound.config.providerCode}/${inbound.config.mode}`,
      );
    }
    return adapter;
  }

  private normalizeValidationState(
    value: IntegracionEntranteConfig['validation'] | undefined,
    fallback: IntegracionEntranteConfig['validation'],
  ): IntegracionEntranteConfig['validation'] {
    if (!value) {
      return fallback;
    }

    const status = this.parseOperationStatus(
      value.status,
      value.isValid ? 'OK' : 'FAILED',
    );
    const message = this.trimOrNull(value.message, 510) ?? fallback.message;
    const errors = Array.isArray(value.errors)
      ? value.errors
          .map((item) => this.trimOrNull(item, 240))
          .filter((item): item is string => Boolean(item))
      : fallback.errors;

    return {
      isValid: Boolean(value.isValid),
      status,
      message,
      errors,
      validatedAt:
        this.normalizeIsoDateOrNull(value.validatedAt) ?? fallback.validatedAt,
      runId: this.trimOrNull(value.runId, 80) ?? fallback.runId,
      durationMs:
        this.normalizeDurationOrNull(value.durationMs) ?? fallback.durationMs,
      executedBy: this.trimOrNull(value.executedBy, 180) ?? fallback.executedBy,
      errorCode: this.trimOrNull(value.errorCode, 120) ?? fallback.errorCode,
      errorMessage:
        this.trimOrNull(value.errorMessage, 510) ?? fallback.errorMessage,
      diagnosticsSummary: this.normalizeDiagnosticsSummary(
        value.diagnosticsSummary,
      ),
    };
  }

  private normalizeLastSyncState(
    value: IntegracionEntranteConfig['lastSync'] | undefined,
    fallback: IntegracionEntranteConfig['lastSync'],
  ): IntegracionEntranteConfig['lastSync'] {
    if (!value) {
      return fallback;
    }

    const runId = this.trimOrNull(value.runId, 80);
    const executedAt = this.normalizeIsoDateOrNull(value.executedAt);
    if (!runId || !executedAt) {
      return fallback;
    }

    return {
      runId,
      executedAt,
      status: this.parseOperationStatus(
        value.status,
        value.success ? 'OK' : 'FAILED',
      ),
      message: this.trimOrNull(value.message, 510) ?? 'Sin mensaje',
      success: Boolean(value.success),
      blockedByDiagnostics: Boolean(value.blockedByDiagnostics),
      pendingReceived: this.normalizeCounter(value.pendingReceived),
      ingested: this.normalizeCounter(value.ingested),
      duplicated: this.normalizeCounter(value.duplicated),
      skippedValidation: this.normalizeCounter(value.skippedValidation),
      failed: this.normalizeCounter(value.failed),
      durationMs: this.normalizeDurationOrNull(value.durationMs),
      executedBy: this.trimOrNull(value.executedBy, 180),
      errorCode: this.trimOrNull(value.errorCode, 120),
      errorMessage: this.trimOrNull(value.errorMessage, 510),
      diagnosticsSummary: this.normalizeDiagnosticsSummary(
        value.diagnosticsSummary,
      ),
    };
  }

  private normalizeDiagnosticsSummary(
    value: IntegracionEntranteDiagnosticsSummary | null | undefined,
  ): IntegracionEntranteDiagnosticsSummary | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const failedCodes = Array.isArray(value.failedCodes)
      ? value.failedCodes
          .map((item) => this.trimOrNull(item, 120))
          .filter((item): item is string => Boolean(item))
      : [];

    return {
      total: this.normalizeCounter(value.total),
      ok: this.normalizeCounter(value.ok),
      failed: this.normalizeCounter(value.failed),
      failedCodes,
    };
  }

  private parseOperationStatus(
    value: string | undefined,
    fallback: IntegracionEntranteOperationStatus,
  ): IntegracionEntranteOperationStatus {
    if (value === 'OK' || value === 'BLOCKED' || value === 'FAILED') {
      return value;
    }
    return fallback;
  }

  private tryAcquireConnectorSyncLock(integracionId: number): boolean {
    if (this.connectorSyncLocks.has(integracionId)) {
      return false;
    }
    this.connectorSyncLocks.add(integracionId);
    return true;
  }

  private releaseConnectorSyncLock(integracionId: number): void {
    this.connectorSyncLocks.delete(integracionId);
  }

  private normalizePositiveInteger(
    value: number | undefined,
    fallback: number,
  ): number {
    if (!Number.isInteger(value) || (value as number) <= 0) {
      return fallback;
    }
    return Number(value);
  }

  private generateRunId(prefix: 'VAL' | 'SYNC'): string {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${Date.now()}-${random}`;
  }

  private getDurationMs(startedAt: number): number {
    return Math.max(0, Date.now() - startedAt);
  }

  private resolveActorUserId(actor?: OperationActor): number | null {
    if (!actor) {
      return null;
    }
    return actor.userId ?? null;
  }

  private resolveActorLabel(actor?: OperationActor): string | null {
    if (!actor) {
      return null;
    }
    if (actor.username?.trim()) {
      return actor.username.trim();
    }
    if (actor.userId) {
      return `user:${actor.userId}`;
    }
    return null;
  }

  private buildDiagnosticsSummaryFromDiagnostics(
    diagnostics: Array<{ code: string; ok: boolean }> | undefined,
  ): IntegracionEntranteDiagnosticsSummary | null {
    if (!Array.isArray(diagnostics) || diagnostics.length === 0) {
      return null;
    }

    const failed = diagnostics.filter((item) => !item.ok);
    return {
      total: diagnostics.length,
      ok: diagnostics.length - failed.length,
      failed: failed.length,
      failedCodes: failed
        .map((item) => this.trimOrNull(item.code, 120))
        .filter((item): item is string => Boolean(item)),
    };
  }

  private buildBlockedSyncResult(input: {
    inbound: IntegracionEntranteListItem;
    runId: string;
    startedAt: number;
    message: string;
    errorCode: string;
  }): IntegracionEntranteSyncResult {
    return {
      integracionId: input.inbound.integracionId,
      providerCode: input.inbound.config.providerCode,
      mode: input.inbound.config.mode,
      status: 'BLOCKED',
      message: input.message,
      runId: input.runId,
      durationMs: this.getDurationMs(input.startedAt),
      errorCode: input.errorCode,
      errorMessage: input.message,
      blockedByDiagnostics: true,
      summary: {
        pendingReceived: 0,
        ingested: 0,
        duplicated: 0,
        skippedValidation: 0,
        failed: 0,
      },
      diagnostics: [],
    };
  }

  private buildFailedSyncResult(input: {
    inbound: IntegracionEntranteListItem;
    runId: string;
    startedAt: number;
    errorCode: string;
    errorMessage: string;
  }): IntegracionEntranteSyncResult {
    return {
      integracionId: input.inbound.integracionId,
      providerCode: input.inbound.config.providerCode,
      mode: input.inbound.config.mode,
      status: 'FAILED',
      message: input.errorMessage,
      runId: input.runId,
      durationMs: this.getDurationMs(input.startedAt),
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      blockedByDiagnostics: false,
      summary: {
        pendingReceived: 0,
        ingested: 0,
        duplicated: 0,
        skippedValidation: 0,
        failed: 1,
      },
      diagnostics: [],
    };
  }

  private buildSyncResultFromOrdersSync(
    inbound: IntegracionEntranteListItem,
    syncResult: SyncPendingResult,
    runId: string,
    startedAt: number,
  ): IntegracionEntranteSyncResult {
    const status: IntegracionEntranteOperationStatus =
      syncResult.blockedByDiagnostics ? 'BLOCKED' : 'OK';
    const message =
      status === 'OK'
        ? 'Sincronizacion completada'
        : 'Sincronizacion bloqueada por diagnosticos de entorno';

    return {
      integracionId: inbound.integracionId,
      providerCode: inbound.config.providerCode,
      mode: inbound.config.mode,
      status,
      message,
      runId,
      durationMs: this.getDurationMs(startedAt),
      errorCode: null,
      errorMessage: null,
      blockedByDiagnostics: syncResult.blockedByDiagnostics,
      summary: {
        pendingReceived: syncResult.summary.pendingReceived,
        ingested: syncResult.summary.inserted,
        duplicated: syncResult.summary.skippedExisting,
        skippedValidation: syncResult.summary.skippedValidation,
        failed: syncResult.summary.failed,
      },
      diagnostics: syncResult.diagnostics,
    };
  }

  private buildLastSyncFromResult(
    result: IntegracionEntranteSyncResult,
    executedBy: string | null,
  ): IntegracionEntranteLastSync {
    return {
      runId: result.runId,
      executedAt: new Date().toISOString(),
      status: result.status,
      message: result.message,
      success: result.status === 'OK',
      blockedByDiagnostics: result.blockedByDiagnostics,
      pendingReceived: result.summary.pendingReceived,
      ingested: result.summary.ingested,
      duplicated: result.summary.duplicated,
      skippedValidation: result.summary.skippedValidation,
      failed: result.summary.failed,
      durationMs: result.durationMs,
      executedBy,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      diagnosticsSummary: this.buildDiagnosticsSummaryFromDiagnostics(
        result.diagnostics,
      ),
    };
  }

  private async persistSyncOutcome(
    inbound: IntegracionEntranteListItem,
    result: IntegracionEntranteSyncResult,
    executedBy: string | null,
  ): Promise<void> {
    const lastSync = this.buildLastSyncFromResult(result, executedBy);
    const nextConfig: IntegracionEntranteConfig = {
      ...inbound.config,
      lastSync,
    };
    await this.persistInboundConfig(inbound, nextConfig);
  }

  private async persistInboundConfig(
    inbound: IntegracionEntranteListItem,
    nextConfig: IntegracionEntranteConfig,
  ): Promise<void> {
    await this.integracionesEntrantesRepository.update(inbound.integracionId, {
      empresaId: inbound.empresaId,
      canalVentaId: inbound.canalVentaId,
      codigo: inbound.codigo,
      nombre: inbound.nombre,
      estado: this.mapActivoToEstado(inbound.activo),
      configJson: JSON.stringify(nextConfig),
    });
  }

  private async tryInsertOperationalLog(input: {
    empresaId: number;
    usuarioId: number | null;
    integracionId: number;
    accion: 'validate' | 'sync-now';
    nivel: 'INFO' | 'WARN' | 'ERROR';
    mensaje: string;
    dataJson: string;
  }): Promise<void> {
    try {
      await this.integracionesEntrantesRepository.insertOperationalLog(input);
    } catch {
      // Logging no debe bloquear la operacion principal.
    }
  }

  private async tryInsertSyncOperationalLog(
    inbound: IntegracionEntranteListItem,
    result: IntegracionEntranteSyncResult,
    actor?: OperationActor,
  ): Promise<void> {
    const level =
      result.status === 'OK'
        ? 'INFO'
        : result.status === 'BLOCKED'
          ? 'WARN'
          : 'ERROR';
    await this.tryInsertOperationalLog({
      empresaId: inbound.empresaId,
      usuarioId: this.resolveActorUserId(actor),
      integracionId: inbound.integracionId,
      accion: 'sync-now',
      nivel: level,
      mensaje: result.message,
      dataJson: JSON.stringify({
        runId: result.runId,
        status: result.status,
        message: result.message,
        durationMs: result.durationMs,
        summary: result.summary,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        diagnosticsSummary: this.buildDiagnosticsSummaryFromDiagnostics(
          result.diagnostics,
        ),
        executedBy: this.resolveActorLabel(actor),
      }),
    });
  }

  private normalizeSyncError(error: unknown): {
    errorCode: string;
    errorMessage: string;
  } {
    const rawCode = this.extractErrorCode(error);
    const rawMessage = this.extractErrorMessage(error);

    if (
      rawCode === 'ESOCKET' ||
      rawCode === 'ECONNRESET' ||
      rawCode === 'ETIMEOUT' ||
      rawCode === 'ELOGIN'
    ) {
      return {
        errorCode: 'UPSTREAM_CONNECTION_ERROR',
        errorMessage: 'Fallo de conexion temporal al sincronizar. Intenta nuevamente.',
      };
    }

    if (rawMessage.toLowerCase().includes('timeout')) {
      return {
        errorCode: 'UPSTREAM_TIMEOUT',
        errorMessage: 'Tiempo de espera agotado durante la sincronizacion.',
      };
    }

    return {
      errorCode: rawCode ?? 'SYNC_RUNTIME_ERROR',
      errorMessage:
        this.trimOrNull(rawMessage, 510) ??
        'Fallo inesperado durante la sincronizacion.',
    };
  }

  private extractErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const maybe = error as {
      code?: string;
      originalError?: { code?: string };
    };
    return maybe.code ?? maybe.originalError?.code ?? null;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (!error || typeof error !== 'object') {
      return 'Error desconocido';
    }
    const maybe = error as { message?: string; originalError?: { message?: string } };
    return maybe.message ?? maybe.originalError?.message ?? 'Error desconocido';
  }

  private normalizeCounter(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : 0;
  }

  private normalizeDurationOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : null;
  }

  private normalizeIsoDateOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }

  private trimOrNull(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    return normalized.length > maxLength
      ? normalized.slice(0, maxLength)
      : normalized;
  }

  private getTemplates(): IntegracionEntranteTemplate[] {
    return [
      {
        id: 'KOAJ_DEMO',
        label: 'KOAJ Demo',
        description: 'Plantilla piloto para la API actual de KOAJ.',
        providerCode: 'KOAJ',
        mode: 'KOAJ_PILOT',
        connection: {
          baseUrl: 'https://api.koaj.test',
          authType: 'API_KEY',
          timeoutMs: 15000,
        },
        endpoints: {
          listConfirmedOrdersEndpoint: '/orders/confirmed',
          orderDetailEndpoint: '/orders/{id}',
        },
        filters: {
          confirmedStatuses: ['CONFIRMED'],
        },
        mapping: {
          externalOrderIdField: 'id',
          externalReferenceField: 'reference',
          customerNameField: 'customer_name',
          totalField: 'total_paid_tax_incl',
          statusField: 'status',
        },
      },
      {
        id: 'MARKETPLACE_DEMO',
        label: 'Marketplace Demo',
        description:
          'Plantilla de ejemplo para futuros conectores de marketplaces.',
        providerCode: 'MARKETPLACE',
        mode: 'GENERIC',
        connection: {
          baseUrl: 'https://api.marketplace.test',
          authType: 'API_KEY',
          timeoutMs: 15000,
        },
        endpoints: {
          listConfirmedOrdersEndpoint: '/v1/orders/confirmed',
          orderDetailEndpoint: '/v1/orders/{externalOrderId}',
        },
        filters: {
          confirmedStatuses: ['CONFIRMED', 'READY_FOR_FULFILLMENT'],
        },
        mapping: {
          externalOrderIdField: 'external_order_id',
          externalReferenceField: 'order_number',
          customerNameField: 'customer.full_name',
          totalField: 'payment.total',
          statusField: 'status',
        },
      },
    ];
  }

  private getDefaultConfig(providerCode: string): IntegracionEntranteConfig {
    const normalizedProvider = this.normalizeProviderCode(providerCode);

    return {
      flowType: 'INBOUND',
      providerCode: normalizedProvider,
      mode: normalizedProvider === 'KOAJ' ? 'KOAJ_PILOT' : 'GENERIC',
      connection: {
        baseUrl: null,
        authType: 'API_KEY',
        timeoutMs: 15000,
      },
      endpoints: {
        listConfirmedOrdersEndpoint: null,
        orderDetailEndpoint: null,
      },
      filters: {
        confirmedStatuses: [],
      },
      mapping: {
        externalOrderIdField: null,
        externalReferenceField: null,
        customerNameField: null,
        totalField: null,
        statusField: null,
      },
      validation: {
        isValid: false,
        status: 'FAILED',
        message: 'Configuracion pendiente de validacion',
        errors: ['Configuracion pendiente de validacion'],
        validatedAt: null,
        runId: null,
        durationMs: null,
        executedBy: null,
        errorCode: null,
        errorMessage: null,
        diagnosticsSummary: null,
      },
      lastSync: null,
    };
  }

  private normalizeProviderCode(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException(
        'El campo providerCode no puede estar vacio',
      );
    }
    if (normalized.length > 60) {
      throw new BadRequestException(
        'El campo providerCode no puede exceder 60 caracteres',
      );
    }
    return normalized;
  }

  private normalizeMode(value: IntegracionEntranteMode): IntegracionEntranteMode {
    if (value !== 'KOAJ_PILOT' && value !== 'GENERIC') {
      throw new BadRequestException('mode no es valido');
    }
    return value;
  }

  private normalizeCodigo(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('El campo codigo no puede estar vacio');
    }
    if (normalized.length > 120) {
      throw new BadRequestException(
        'El campo codigo no puede exceder 120 caracteres',
      );
    }
    return normalized;
  }

  private normalizeRequiredText(
    value: string,
    fieldName: string,
    maxLength: number,
  ): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede estar vacio`,
      );
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede exceder ${maxLength} caracteres`,
      );
    }
    return normalized;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
    fieldName: string,
    maxLength: number,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `El campo ${fieldName} no puede exceder ${maxLength} caracteres`,
      );
    }
    return normalized;
  }

  private normalizeStatusList(value: string[]): string[] {
    const unique = [
      ...new Set(
        value
          .map((item) => item.trim().toUpperCase())
          .filter((item) => item.length > 0),
      ),
    ];

    if (unique.some((item) => item.length > 80)) {
      throw new BadRequestException(
        'Cada estado confirmado no puede exceder 80 caracteres',
      );
    }

    return unique;
  }

  private normalizeTimeout(value: number): number {
    if (!Number.isInteger(value) || value < 1000 || value > 60000) {
      throw new BadRequestException(
        'El campo timeoutMs debe ser entero entre 1000 y 60000',
      );
    }
    return value;
  }

  private normalizeRequiredId(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(
        `El campo ${fieldName} debe ser un entero mayor a 0`,
      );
    }
    return value;
  }

  private normalizeBoolean(
    value: boolean | undefined,
    fallback?: boolean,
  ): boolean {
    if (value === undefined) {
      if (fallback === undefined) {
        throw new BadRequestException('El campo activo es requerido');
      }
      return fallback;
    }
    return value;
  }

  private mapActivoToEstado(value: boolean): string {
    return value ? 'ACTIVO' : 'INACTIVO';
  }

  private mapEstadoToActivo(value: string | null | undefined): boolean {
    return (value ?? '').trim().toUpperCase() === 'ACTIVO';
  }

  private isUniqueConstraintError(error: unknown): boolean {
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

    return numbers.includes(2601) || numbers.includes(2627);
  }
}
