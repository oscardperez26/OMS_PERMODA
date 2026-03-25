import { Injectable, Logger } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../database/database.service';
import type {
  ShopifyIntegracionSalienteRow,
  ShopifyOutboundConfigJson,
} from './shopify-sync.types';

type IntegracionSalienteDbRow = {
  IntegracionSalienteId: number;
  EmpresaId: number;
  ProviderCode: string;
  Nombre: string;
  Estado: string;
  ConfigJson: string | null;
};

/**
 * Accede a oms.IntegracionSaliente exclusivamente para el módulo Shopify.
 * No toca oms.Integracion (inbound) ni ningún módulo de integraciones entrantes.
 */
@Injectable()
export class ShopifyIntegracionSalienteRepository {
  private readonly logger = new Logger(
    ShopifyIntegracionSalienteRepository.name,
  );

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Devuelve la primera integración Shopify outbound activa para la empresa.
   * Parsea y valida el ConfigJson. Devuelve null si no existe registro activo
   * o si el ConfigJson es inválido.
   */
  async findActiveForEmpresa(
    empresaId: number,
  ): Promise<ShopifyIntegracionSalienteRow | null> {
    const result = await this.databaseService.execute<
      sql.IResult<IntegracionSalienteDbRow>
    >(
      (pool) =>
        pool
          .request()
          .input('empresaId', sql.Int, empresaId)
          .input('providerCode', sql.NVarChar(40), 'SHOPIFY')
          .input('estado', sql.NVarChar(20), 'ACTIVO')
          .query<IntegracionSalienteDbRow>(`
            SELECT TOP (1)
              [IntegracionSalienteId],
              [EmpresaId],
              [ProviderCode],
              [Nombre],
              [Estado],
              [ConfigJson]
            FROM [oms].[IntegracionSaliente]
            WHERE [EmpresaId]    = @empresaId
              AND [ProviderCode] = @providerCode
              AND [Estado]       = @estado
            ORDER BY [IntegracionSalienteId] ASC
          `),
      'shopifyIntegracion.findActiveForEmpresa',
    );

    const row = result.recordset[0];
    if (!row) {
      return null;
    }

    const config = this.parseConfigJson(row.IntegracionSalienteId, row.ConfigJson);
    if (!config) {
      return null;
    }

    return {
      integracionSalienteId: row.IntegracionSalienteId,
      empresaId: row.EmpresaId,
      providerCode: row.ProviderCode,
      nombre: row.Nombre,
      estado: row.Estado,
      config,
    };
  }

  /**
   * Parsea el ConfigJson y valida que cumpla el contrato mínimo.
   * Devuelve null si el JSON es inválido o incompleto.
   */
  private parseConfigJson(
    integracionSalienteId: number,
    raw: string | null,
  ): ShopifyOutboundConfigJson | null {
    if (!raw) {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson es null`,
      );
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson no es JSON válido`,
      );
      return null;
    }

    if (!parsed || typeof parsed !== 'object') {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson no es un objeto`,
      );
      return null;
    }

    const config = parsed as Record<string, unknown>;

    if (config['flowType'] !== 'OUTBOUND') {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson.flowType debe ser 'OUTBOUND'`,
      );
      return null;
    }

    if (config['providerCode'] !== 'SHOPIFY') {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson.providerCode debe ser 'SHOPIFY'`,
      );
      return null;
    }

    const catalog = config['catalog'];
    if (!catalog || typeof catalog !== 'object') {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson.catalog faltante o inválido`,
      );
      return null;
    }

    const catalogObj = catalog as Record<string, unknown>;

    if (
      catalogObj['publishStatus'] !== 'DRAFT' &&
      catalogObj['publishStatus'] !== 'ACTIVE'
    ) {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson.catalog.publishStatus debe ser 'DRAFT' o 'ACTIVE'`,
      );
      return null;
    }

    if (!Array.isArray(catalogObj['pricePriority'])) {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson.catalog.pricePriority debe ser un array`,
      );
      return null;
    }

    // Validar que cada entrada del pricePriority tenga los campos requeridos
    const validPriority = (catalogObj['pricePriority'] as unknown[]).filter(
      (entry): entry is { comercialChannel: string; monedaCodigo: string } =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Record<string, unknown>)['comercialChannel'] ===
          'string' &&
        typeof (entry as Record<string, unknown>)['monedaCodigo'] === 'string',
    );

    if (validPriority.length === 0) {
      this.logger.warn(
        `IntegracionSaliente ${integracionSalienteId}: ConfigJson.catalog.pricePriority no tiene entradas válidas`,
      );
      return null;
    }

    return parsed as ShopifyOutboundConfigJson;
  }
}
