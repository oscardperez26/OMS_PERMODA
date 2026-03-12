import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TransportadoraRepository } from './transportadora.repository';
import { TransportadoraApiCryptoService } from './transportadora-api-crypto.service';
import type {
  TransportadoraApiConfigDetail,
  TransportadoraApiAuthType,
  TransportadoraBootstrapData,
  TransportadoraConfiguracionDetail,
  TransportadoraListItem,
  UpsertTransportadoraApiConfigInput,
  UpdateTransportadoraConfiguracionInput,
  UpdateTransportadoraTarifaZonaInput,
} from './transportadora.types';

type CreateTransportadoraParams = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate?: string;
  activo?: boolean;
};

type UpdateTransportadoraParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  trackingUrlTemplate?: string | null;
  activo?: boolean;
};

type UpdateTransportadoraTarifaZonaParams = {
  costo: number;
  diasMin?: number | null;
  diasMax?: number | null;
  activo?: boolean;
};

type UpdateTransportadoraConfiguracionParams = {
  empresaId?: number;
  codigo?: string;
  nombre?: string;
  trackingUrlTemplate?: string | null;
  activo?: boolean;
  servicio?: string | null;
  permiteExpress?: boolean;
  moduloCode?: string | null;
  zonaSeleccionadaId?: number;
  tarifaZona?: UpdateTransportadoraTarifaZonaParams;
  tiendaIds?: number[];
};

type UpdateTransportadoraApiConfigParams = {
  baseUrl?: string | null;
  authType?: TransportadoraApiAuthType;
  timeoutMs?: number;
  createShipmentEndpoint?: string | null;
  trackingEndpointTemplate?: string | null;
  trackingNumberField?: string | null;
  statusField?: string | null;
  apiKeyPlaintext?: string | null;
};

const SERVICIO_PERMITIDO_MAP = new Map<string, string>([
  ['domicilio', 'Domicilio'],
  ['tienda', 'Tienda'],
  ['interno', 'Interno'],
  ['manual', 'Manual'],
]);

@Injectable()
export class TransportadoraService {
  private readonly logger = new Logger(TransportadoraService.name);

  constructor(
    private readonly transportadoraRepository: TransportadoraRepository,
    private readonly transportadoraApiCryptoService: TransportadoraApiCryptoService,
  ) {}

  async listTransportadoras(): Promise<TransportadoraListItem[]> {
    return this.transportadoraRepository.list();
  }

  async getBootstrapData(): Promise<TransportadoraBootstrapData> {
    return this.transportadoraRepository.listBootstrapData();
  }

  async getTransportadoraById(
    transportadoraId: number,
  ): Promise<TransportadoraListItem> {
    const transportadora =
      await this.transportadoraRepository.findById(transportadoraId);
    if (!transportadora) {
      throw new NotFoundException('Transportadora no existe');
    }
    return transportadora;
  }

  async getTransportadoraApiConfigById(
    transportadoraId: number,
  ): Promise<TransportadoraApiConfigDetail> {
    const transportadora =
      await this.transportadoraRepository.findById(transportadoraId);
    if (!transportadora) {
      throw new NotFoundException('Transportadora no existe');
    }

    const apiConfig =
      await this.transportadoraRepository.findApiConfigByTransportadoraId(
        transportadoraId,
      );

    return {
      transportadora,
      apiConfig: apiConfig ?? {
        authType: 'API_KEY',
        timeoutMs: 15000,
        hasApiKey: false,
        apiKeyLastRotatedAt: null,
        updatedAt: null,
      },
    };
  }

  async getTransportadoraConfiguracionById(
    transportadoraId: number,
    zonaSeleccionadaId?: number,
  ): Promise<TransportadoraConfiguracionDetail> {
    const detail =
      await this.transportadoraRepository.findConfiguracionBaseById(
        transportadoraId,
      );
    if (!detail) {
      throw new NotFoundException('Transportadora no existe');
    }

    const nextZonaSeleccionadaId = this.resolveZonaSeleccionadaId(
      detail.zonasDisponibles.map((zona) => zona.zonaTransporteId),
      zonaSeleccionadaId,
    );

    const tarifaZona =
      nextZonaSeleccionadaId === null
        ? null
        : await this.transportadoraRepository.findTarifaZonaBase(
            detail.transportadora.empresaId,
            transportadoraId,
            nextZonaSeleccionadaId,
            detail.empresaMonedaId,
          );

    return {
      transportadora: detail.transportadora,
      config: detail.config,
      tiendasSeleccionadas: detail.tiendasSeleccionadas,
      tiendasDisponibles: detail.tiendasDisponibles,
      zonasDisponibles: detail.zonasDisponibles,
      zonaSeleccionadaId: nextZonaSeleccionadaId,
      tarifaZona,
    };
  }

  async createTransportadora(
    params: CreateTransportadoraParams,
  ): Promise<{ transportadoraId: number }> {
    const empresaId = this.normalizeRequiredId(params.empresaId, 'empresaId');
    const codigo = this.normalizeCodigo(params.codigo);
    const nombre = this.normalizeRequiredText(params.nombre, 'nombre', 180);
    const trackingUrlTemplate = this.normalizeOptionalText(
      params.trackingUrlTemplate,
      'trackingUrlTemplate',
      255,
    );
    const activo = this.normalizeBoolean(params.activo, true);

    const duplicated =
      await this.transportadoraRepository.existsByEmpresaAndCodigo(
        empresaId,
        codigo,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una transportadora con ese codigo en la empresa',
      );
    }

    await this.validateEmpresa(empresaId);

    try {
      return await this.transportadoraRepository.create({
        empresaId,
        codigo,
        nombre,
        trackingUrlTemplate,
        activo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una transportadora con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async updateTransportadora(
    transportadoraId: number,
    params: UpdateTransportadoraParams,
  ): Promise<void> {
    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.trackingUrlTemplate !== undefined ||
      params.activo !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    const current =
      await this.transportadoraRepository.findById(transportadoraId);
    if (!current) {
      throw new NotFoundException('Transportadora no existe');
    }

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : current.empresaId;
    const nextCodigo =
      params.codigo !== undefined
        ? this.normalizeCodigo(params.codigo)
        : current.codigo;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 180)
        : current.nombre;
    const nextTrackingUrlTemplate =
      params.trackingUrlTemplate !== undefined
        ? this.normalizeOptionalText(
            params.trackingUrlTemplate,
            'trackingUrlTemplate',
            255,
          )
        : (current.trackingUrlTemplate ?? null);
    const nextActivo =
      params.activo !== undefined
        ? this.normalizeBoolean(params.activo)
        : current.activo;

    const duplicated =
      await this.transportadoraRepository.existsByEmpresaAndCodigo(
        nextEmpresaId,
        nextCodigo,
        transportadoraId,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una transportadora con ese codigo en la empresa',
      );
    }

    await this.validateEmpresa(nextEmpresaId);

    try {
      await this.transportadoraRepository.update(transportadoraId, {
        empresaId: nextEmpresaId,
        codigo: nextCodigo,
        nombre: nextNombre,
        trackingUrlTemplate: nextTrackingUrlTemplate,
        activo: nextActivo,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una transportadora con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async updateTransportadoraConfiguracion(
    transportadoraId: number,
    params: UpdateTransportadoraConfiguracionParams,
  ): Promise<void> {
    const tiendaIdsFromRequest = params.tiendaIds;
    const hasTiendaIdsField = params.tiendaIds !== undefined;
    const hasZonaSeleccionadaIdField = params.zonaSeleccionadaId !== undefined;
    const hasTarifaZonaField = params.tarifaZona !== undefined;
    if (hasTiendaIdsField && !Array.isArray(tiendaIdsFromRequest)) {
      throw new BadRequestException('tiendaIds debe ser una lista de enteros');
    }

    const hasAnyField =
      params.empresaId !== undefined ||
      params.codigo !== undefined ||
      params.nombre !== undefined ||
      params.trackingUrlTemplate !== undefined ||
      params.activo !== undefined ||
      params.servicio !== undefined ||
      params.permiteExpress !== undefined ||
      params.moduloCode !== undefined ||
      params.zonaSeleccionadaId !== undefined ||
      params.tarifaZona !== undefined ||
      hasTiendaIdsField;

    if (!hasAnyField) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    if (hasZonaSeleccionadaIdField !== hasTarifaZonaField) {
      throw new BadRequestException(
        'zonaSeleccionadaId y tarifaZona deben enviarse juntos',
      );
    }

    const detail =
      await this.transportadoraRepository.findConfiguracionBaseById(
        transportadoraId,
      );
    if (!detail) {
      throw new NotFoundException('Transportadora no existe');
    }

    const base = detail.transportadora;
    const config = detail.config;

    const nextEmpresaId =
      params.empresaId !== undefined
        ? this.normalizeRequiredId(params.empresaId, 'empresaId')
        : base.empresaId;
    const nextCodigo =
      params.codigo !== undefined
        ? this.normalizeCodigo(params.codigo)
        : base.codigo;
    const nextNombre =
      params.nombre !== undefined
        ? this.normalizeRequiredText(params.nombre, 'nombre', 180)
        : base.nombre;
    const nextTrackingUrlTemplate =
      params.trackingUrlTemplate !== undefined
        ? this.normalizeOptionalText(
            params.trackingUrlTemplate,
            'trackingUrlTemplate',
            255,
          )
        : (base.trackingUrlTemplate ?? null);
    const nextActivo =
      params.activo !== undefined
        ? this.normalizeBoolean(params.activo)
        : base.activo;

    const nextServicio =
      params.servicio !== undefined
        ? this.normalizeServicio(params.servicio)
        : (config.servicio ?? null);
    const nextPermiteExpress =
      params.permiteExpress !== undefined
        ? this.normalizeBoolean(params.permiteExpress)
        : config.permiteExpress;
    const nextModuloCode =
      params.moduloCode !== undefined
        ? this.normalizeOptionalText(params.moduloCode, 'moduloCode', 120)
        : (config.moduloCode ?? null);

    let nextZonaSeleccionadaId: number | undefined;
    let nextTarifaZona: UpdateTransportadoraTarifaZonaInput | undefined;
    if (hasZonaSeleccionadaIdField && hasTarifaZonaField) {
      nextZonaSeleccionadaId = this.normalizeRequiredId(
        params.zonaSeleccionadaId as number,
        'zonaSeleccionadaId',
      );
      nextTarifaZona = this.normalizeTarifaZona(
        params.tarifaZona as UpdateTransportadoraTarifaZonaParams,
      );

      if (
        nextTarifaZona.diasMin !== null &&
        nextTarifaZona.diasMax !== null &&
        nextTarifaZona.diasMin > nextTarifaZona.diasMax
      ) {
        throw new BadRequestException(
          'El campo tarifaZona.diasMin no puede ser mayor que tarifaZona.diasMax',
        );
      }
    }

    const nextTiendaIds = hasTiendaIdsField
      ? this.normalizeTiendaIds(tiendaIdsFromRequest as number[])
      : detail.tiendasSeleccionadas.map((item) => item.tiendaId);

    const duplicated =
      await this.transportadoraRepository.existsByEmpresaAndCodigo(
        nextEmpresaId,
        nextCodigo,
        transportadoraId,
      );
    if (duplicated) {
      throw new ConflictException(
        'Ya existe una transportadora con ese codigo en la empresa',
      );
    }

    await this.validateEmpresa(nextEmpresaId);
    await this.validateTiendas(nextTiendaIds, nextEmpresaId);
    if (nextZonaSeleccionadaId !== undefined && nextTarifaZona !== undefined) {
      await this.validateEmpresaMoneda(nextEmpresaId);
      await this.validateZona(nextZonaSeleccionadaId, nextEmpresaId);
    }

    const input: UpdateTransportadoraConfiguracionInput = {
      empresaId: nextEmpresaId,
      codigo: nextCodigo,
      nombre: nextNombre,
      trackingUrlTemplate: nextTrackingUrlTemplate,
      activo: nextActivo,
      servicio: nextServicio,
      permiteExpress: nextPermiteExpress,
      moduloCode: nextModuloCode,
      tiendaIds: nextTiendaIds,
      ...(nextZonaSeleccionadaId !== undefined
        ? { zonaSeleccionadaId: nextZonaSeleccionadaId }
        : {}),
      ...(nextTarifaZona !== undefined ? { tarifaZona: nextTarifaZona } : {}),
    };

    try {
      await this.transportadoraRepository.updateConfiguracion(
        transportadoraId,
        input,
      );
      this.logger.log(
        `Transportadora ${transportadoraId} actualizada: empresa=${nextEmpresaId}, zona=${nextZonaSeleccionadaId ?? 'sin-cambio'}, tiendas=${nextTiendaIds.length}`,
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ya existe una transportadora con ese codigo en la empresa',
        );
      }
      throw error;
    }
  }

  async updateTransportadoraApiConfig(
    transportadoraId: number,
    params: UpdateTransportadoraApiConfigParams,
  ): Promise<void> {
    const hasAnyField =
      params.baseUrl !== undefined ||
      params.authType !== undefined ||
      params.timeoutMs !== undefined ||
      params.createShipmentEndpoint !== undefined ||
      params.trackingEndpointTemplate !== undefined ||
      params.trackingNumberField !== undefined ||
      params.statusField !== undefined ||
      params.apiKeyPlaintext !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    const transportadora =
      await this.transportadoraRepository.findById(transportadoraId);
    if (!transportadora) {
      throw new NotFoundException('Transportadora no existe');
    }

    const current =
      await this.transportadoraRepository.findApiConfigByTransportadoraId(
        transportadoraId,
      );

    const nextBaseUrl =
      params.baseUrl !== undefined
        ? this.normalizeOptionalHttpsUrl(params.baseUrl, 'baseUrl', 500)
        : (current?.baseUrl ?? null);
    const nextAuthType =
      params.authType !== undefined
        ? this.normalizeAuthType(params.authType)
        : (current?.authType ?? 'API_KEY');
    const nextTimeoutMs =
      params.timeoutMs !== undefined
        ? this.normalizeTimeoutMs(params.timeoutMs)
        : (current?.timeoutMs ?? 15000);
    const nextCreateShipmentEndpoint =
      params.createShipmentEndpoint !== undefined
        ? this.normalizeOptionalEndpoint(
            params.createShipmentEndpoint,
            'createShipmentEndpoint',
            300,
          )
        : (current?.createShipmentEndpoint ?? null);
    const nextTrackingEndpointTemplate =
      params.trackingEndpointTemplate !== undefined
        ? this.normalizeOptionalEndpoint(
            params.trackingEndpointTemplate,
            'trackingEndpointTemplate',
            300,
          )
        : (current?.trackingEndpointTemplate ?? null);
    const nextTrackingNumberField =
      params.trackingNumberField !== undefined
        ? this.normalizeOptionalNonEmptyText(
            params.trackingNumberField,
            'trackingNumberField',
            120,
          )
        : (current?.trackingNumberField ?? null);
    const nextStatusField =
      params.statusField !== undefined
        ? this.normalizeOptionalNonEmptyText(
            params.statusField,
            'statusField',
            120,
          )
        : (current?.statusField ?? null);

    const nextApiKeyPlaintext = params.apiKeyPlaintext?.trim();
    const shouldRotateApiKey = Boolean(nextApiKeyPlaintext);
    const nowIso = new Date().toISOString();

    let input: UpsertTransportadoraApiConfigInput = {
      baseUrl: nextBaseUrl,
      authType: nextAuthType,
      timeoutMs: nextTimeoutMs,
      createShipmentEndpoint: nextCreateShipmentEndpoint,
      trackingEndpointTemplate: nextTrackingEndpointTemplate,
      trackingNumberField: nextTrackingNumberField,
      statusField: nextStatusField,
      rotateApiKey: shouldRotateApiKey,
    };

    if (shouldRotateApiKey && nextApiKeyPlaintext) {
      const encrypted =
        this.transportadoraApiCryptoService.encryptApiKey(nextApiKeyPlaintext);

      input = {
        ...input,
        apiKeyCiphertext: encrypted.ciphertext,
        apiKeyIv: encrypted.iv,
        apiKeyTag: encrypted.tag,
        apiKeyLastRotatedAt: nowIso,
      };
    }

    await this.transportadoraRepository.upsertApiConfig(transportadoraId, input);
    this.logger.log(
      `API config actualizada para transportadora ${transportadora.transportadoraId}`,
    );
  }

  private resolveZonaSeleccionadaId(
    zonaIdsDisponibles: number[],
    requestedZonaSeleccionadaId?: number,
  ): number | null {
    if (zonaIdsDisponibles.length === 0) {
      return null;
    }

    if (requestedZonaSeleccionadaId === undefined) {
      return zonaIdsDisponibles[0];
    }

    const normalized = this.normalizeRequiredId(
      requestedZonaSeleccionadaId,
      'zonaSeleccionadaId',
    );

    if (!zonaIdsDisponibles.includes(normalized)) {
      throw new BadRequestException(
        'zonaSeleccionadaId no pertenece a la empresa o no esta activa',
      );
    }

    return normalized;
  }

  private normalizeTarifaZona(
    tarifaZona: UpdateTransportadoraTarifaZonaParams,
  ): UpdateTransportadoraTarifaZonaInput {
    return {
      costo: this.normalizeRequiredDecimal(
        tarifaZona.costo,
        'tarifaZona.costo',
      ),
      diasMin: this.normalizeOptionalInteger(
        tarifaZona.diasMin,
        'tarifaZona.diasMin',
      ),
      diasMax: this.normalizeOptionalInteger(
        tarifaZona.diasMax,
        'tarifaZona.diasMax',
      ),
      activo:
        tarifaZona.activo !== undefined
          ? this.normalizeBoolean(tarifaZona.activo)
          : true,
    };
  }

  private async validateEmpresa(empresaId: number): Promise<void> {
    const empresaExists =
      await this.transportadoraRepository.existsEmpresaById(empresaId);
    if (!empresaExists) {
      throw new BadRequestException('EmpresaId no existe en la base de datos');
    }
  }

  private async validateEmpresaMoneda(empresaId: number): Promise<void> {
    const monedaId =
      await this.transportadoraRepository.findEmpresaMonedaId(empresaId);
    if (!monedaId) {
      throw new BadRequestException('La empresa no tiene MonedaId configurada');
    }
  }

  private async validateZona(
    zonaSeleccionadaId: number,
    empresaId: number,
  ): Promise<void> {
    const zona = await this.transportadoraRepository.findZonaByIdAndEmpresaId(
      zonaSeleccionadaId,
      empresaId,
    );

    if (!zona) {
      throw new BadRequestException(
        'zonaSeleccionadaId no pertenece a la empresa de la transportadora',
      );
    }

    if (!zona.activa) {
      throw new BadRequestException('zonaSeleccionadaId no esta activa');
    }
  }

  private async validateTiendas(
    tiendaIds: number[],
    empresaId: number,
  ): Promise<void> {
    if (tiendaIds.length === 0) {
      return;
    }

    const tiendas =
      await this.transportadoraRepository.findTiendasByIds(tiendaIds);
    if (tiendas.length !== tiendaIds.length) {
      throw new BadRequestException('Una o mas tiendas no existen');
    }

    const mismatched = tiendas.find((item) => item.empresaId !== empresaId);
    if (mismatched) {
      throw new BadRequestException(
        'Todas las tiendas deben pertenecer a la misma empresa de la transportadora',
      );
    }
  }

  private normalizeCodigo(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('El campo codigo no puede estar vacio');
    }
    if (normalized.length > 60) {
      throw new BadRequestException(
        'El campo codigo no puede exceder 60 caracteres',
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
    const normalized = value?.trim();
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

  private normalizeOptionalHttpsUrl(
    value: string | null | undefined,
    fieldName: string,
    maxLength: number,
  ): string | null {
    const normalized = this.normalizeOptionalText(value, fieldName, maxLength);
    if (!normalized) {
      return null;
    }

    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      throw new BadRequestException(`El campo ${fieldName} no es una URL valida`);
    }

    if (url.protocol !== 'https:') {
      throw new BadRequestException(
        `El campo ${fieldName} debe usar protocolo https`,
      );
    }

    return normalized;
  }

  private normalizeOptionalEndpoint(
    value: string | null | undefined,
    fieldName: string,
    maxLength: number,
  ): string | null {
    const normalized = this.normalizeOptionalText(value, fieldName, maxLength);
    if (!normalized) {
      return null;
    }
    if (!normalized.startsWith('/')) {
      throw new BadRequestException(
        `El campo ${fieldName} debe iniciar con "/"`,
      );
    }
    return normalized;
  }

  private normalizeOptionalNonEmptyText(
    value: string | null | undefined,
    fieldName: string,
    maxLength: number,
  ): string | null {
    const normalized = this.normalizeOptionalText(value, fieldName, maxLength);
    if (!normalized) {
      return null;
    }
    if (normalized.length === 0) {
      throw new BadRequestException(`El campo ${fieldName} no puede estar vacio`);
    }
    return normalized;
  }

  private normalizeAuthType(value: string): TransportadoraApiAuthType {
    if (value !== 'API_KEY') {
      throw new BadRequestException(
        'El campo authType solo permite el valor API_KEY',
      );
    }
    return value;
  }

  private normalizeTimeoutMs(value: number): number {
    if (!Number.isInteger(value) || value < 1000 || value > 60000) {
      throw new BadRequestException(
        'El campo timeoutMs debe estar entre 1000 y 60000',
      );
    }
    return value;
  }

  private normalizeServicio(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const canonical = SERVICIO_PERMITIDO_MAP.get(normalized.toLowerCase());
    if (!canonical) {
      throw new BadRequestException(
        'El campo servicio solo permite: Domicilio, Tienda, Interno o Manual',
      );
    }

    return canonical;
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
        throw new BadRequestException('Valor booleano no enviado');
      }
      return fallback;
    }
    return value;
  }

  private normalizeRequiredDecimal(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `El campo ${fieldName} debe ser un numero >= 0`,
      );
    }
    return value;
  }

  private normalizeOptionalInteger(
    value: number | null | undefined,
    fieldName: string,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(
        `El campo ${fieldName} debe ser un entero >= 0`,
      );
    }
    return value;
  }

  private normalizeTiendaIds(values: number[]): number[] {
    const ids = [...new Set(values)];
    const invalid = ids.find((value) => !Number.isInteger(value) || value <= 0);
    if (invalid !== undefined) {
      throw new BadRequestException(
        'Cada tiendaId debe ser un entero mayor a 0',
      );
    }
    return ids;
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
