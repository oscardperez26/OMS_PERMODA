import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersRepository } from './orders.repository';
import type {
  AssignmentConfirmResult,
  AssignmentPreview,
  AssignmentStrategy,
  KoajPendingOrder,
  KoajPendingResponse,
  OrderListItem,
  PedidoDetail,
  SyncDiagnostic,
  SyncPendingItemResult,
  SyncPendingResult,
} from './orders.types';

type AssignmentComputation = {
  detail: PedidoDetail;
  preview: AssignmentPreview;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly configService: ConfigService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async listOrders(): Promise<OrderListItem[]> {
    const rows = await this.ordersRepository.listPedidos();

    return rows.map((row) => ({
      pedidoId: row.pedidoId,
      id: row.numeroExterno?.trim() || String(row.pedidoId),
      reference: row.numeroPedido,
      newCustomer: 'No',
      delivery: row.paisNombre ?? '-',
      customer: row.clienteNombre,
      total: this.formatMoney(row.total),
      payment: '-',
      status: this.mapEstadoToUiStatus(row.estadoNombre),
      date: this.toUiDateTime(row.createdAt),
      alias: row.numeroPedido,
      koajOrderId: Number(row.numeroExterno ?? 0) || 0,
      origen: 0,
    }));
  }

  async getOrderDetail(pedidoId: number): Promise<PedidoDetail> {
    const detail = await this.ordersRepository.findPedidoDetailById(pedidoId);
    if (!detail) {
      throw new NotFoundException(`Pedido ${pedidoId} no existe`);
    }
    return detail;
  }

  async previewAssignment(
    pedidoId: number,
    options?: {
      storeCodesCandidate?: string[];
      strategy?: AssignmentStrategy;
    },
  ): Promise<AssignmentPreview> {
    const computation = await this.computeAssignmentPreview(pedidoId, options);
    return computation.preview;
  }

  async confirmAssignment(
    pedidoId: number,
    options?: {
      storeCodesCandidate?: string[];
      strategy?: AssignmentStrategy;
      estadoEntidad?: string;
      estadoCodigo?: string;
    },
  ): Promise<AssignmentConfirmResult> {
    const { detail, preview } = await this.computeAssignmentPreview(pedidoId, {
      storeCodesCandidate: options?.storeCodesCandidate,
      strategy: options?.strategy,
    });

    if (!preview.tiendaSugerida) {
      throw new UnprocessableEntityException(
        'No hay tienda sugerida activa para confirmar asignacion',
      );
    }
    if (!preview.zonaEnvio) {
      throw new UnprocessableEntityException(
        'No se pudo resolver zona de envio para confirmar asignacion',
      );
    }
    if (!preview.transportadoraSugerida || !preview.costoSugerido) {
      throw new UnprocessableEntityException(
        'No hay transportadora/costo sugeridos para confirmar asignacion',
      );
    }

    const estadoEntidad =
      this.normalizeOptionalText(options?.estadoEntidad) ??
      this.getStringConfig('KOAJ_ASSIGNMENT_ESTADO_ENTIDAD', 'PEDIDO');
    const estadoCodigo =
      this.normalizeOptionalText(options?.estadoCodigo) ??
      this.getStringConfig('KOAJ_ASSIGNMENT_ESTADO_CODIGO', 'ASIGNADO');
    const estadoResolution = await this.resolveEstadoOperativo(
      detail,
      estadoEntidad,
      estadoCodigo,
    );
    const estadoOperativo = estadoResolution.estado;

    const persistedStore = detail.tiendaOrigen.tiendaId !== preview.tiendaSugerida.tiendaId;
    const persistedStatus = detail.estado.estadoId !== estadoOperativo.estadoId;

    try {
      await this.ordersRepository.applyAssignmentUpdateAndHistory({
        pedidoId,
        tiendaOrigenId: preview.tiendaSugerida.tiendaId,
        estadoId: estadoOperativo.estadoId,
        estadoAnteriorId: detail.estado.estadoId,
      });
    } catch (error) {
      throw new UnprocessableEntityException(
        `No fue posible persistir tienda/estado/historial: ${this.getErrorMessage(error)}`,
      );
    }

    const advertencias = [...preview.advertencias, ...estadoResolution.warnings];
    let carrierLogged = false;

    try {
      await this.ordersRepository.insertAssignmentCarrierLog({
        pedidoId,
        empresaId: detail.empresaId,
        payloadJson: JSON.stringify({
          pedidoId,
          strategy: preview.strategy,
          tiendaSugerida: preview.tiendaSugerida,
          transportadoraSugerida: preview.transportadoraSugerida,
          costoSugerido: preview.costoSugerido,
          zonaEnvio: preview.zonaEnvio,
          estadoAplicado: {
            estadoId: estadoOperativo.estadoId,
            codigo: estadoOperativo.codigo,
            nombre: estadoOperativo.nombre,
          },
          timestamp: new Date().toISOString(),
        }),
        mensaje: 'Confirmacion de asignacion logistica',
      });
      carrierLogged = true;
    } catch (error) {
      advertencias.push(
        `No fue posible registrar log de transportadora: ${this.getErrorMessage(error)}`,
      );
    }

    return {
      success: true,
      pedidoId,
      persisted: {
        store: persistedStore,
        status: persistedStatus,
        carrier: false,
        carrierLogged,
      },
      detalle: {
        tiendaAnteriorId: detail.tiendaOrigen.tiendaId,
        tiendaAplicadaId: preview.tiendaSugerida.tiendaId,
        estadoAnteriorId: detail.estado.estadoId,
        estadoAplicadoId: estadoOperativo.estadoId,
        transportadoraSugeridaId: preview.transportadoraSugerida.transportadoraId,
        costoSugerido: preview.costoSugerido.costo,
      },
      advertencias,
    };
  }

  async syncPendingOrders(limit?: number): Promise<SyncPendingResult> {
    try {
      const token = await this.loginKoaj();
      const pending = await this.fetchPendingOrders(token);
      const allOrders = pending.Pedidos ?? [];
      const orders = allOrders.slice(0, limit ?? allOrders.length);

      const empresaId = this.getNumberConfig('KOAJ_EMPRESA_ID', 1);
      const tiendaCodigo = this.getStringConfig('KOAJ_DEFAULT_TIENDA_CODIGO', '081');
      const monedaCodigo = this.getStringConfig('KOAJ_DEFAULT_MONEDA_CODIGO', 'COP');
      const paisNombre = this.getStringConfig('KOAJ_DEFAULT_PAIS_NOMBRE', 'Colombia');
      const estadoEntidad = this.getStringConfig('KOAJ_ESTADO_ENTIDAD', 'PEDIDO');
      const estadoCodigo = this.getStringConfig('KOAJ_ESTADO_CODIGO', 'NUEVO');

      const context = await this.ordersRepository.getSyncContext(
        empresaId,
        tiendaCodigo,
        monedaCodigo,
        estadoEntidad,
        estadoCodigo,
        paisNombre,
      );

    const diagnostics: SyncDiagnostic[] = [
      {
        code: 'EMPRESA_EXISTS',
        ok: Boolean(context.empresaId),
        message: context.empresaId
          ? `Empresa ${empresaId} disponible`
          : `Empresa ${empresaId} no existe`,
      },
      {
        code: `STORE_${tiendaCodigo}_EXISTS`,
        ok: Boolean(context.tiendaId),
        message: context.tiendaId
          ? `Tienda ${tiendaCodigo} disponible`
          : `Tienda ${tiendaCodigo} no existe o no esta activa`,
      },
      {
        code: `${monedaCodigo}_EXISTS`,
        ok: Boolean(context.monedaId),
        message: context.monedaId
          ? `Moneda ${monedaCodigo} disponible`
          : `Moneda ${monedaCodigo} no existe`,
      },
      {
        code: `ESTADO_${estadoEntidad}_${estadoCodigo}_EXISTS`,
        ok: Boolean(context.estadoId),
        message: context.estadoId
          ? `Estado ${estadoEntidad}/${estadoCodigo} disponible`
          : `Estado ${estadoEntidad}/${estadoCodigo} no existe`,
      },
      {
        code: 'PAIS_COLOMBIA_EXISTS',
        ok: Boolean(context.paisId),
        message: context.paisId ? 'Pais Colombia disponible' : 'Pais Colombia no existe',
      },
    ];

    const origenMap = this.getOrigenCanalMap();
    const canalesByCode = new Map(
      context.canales.map((canal) => [canal.codigo.toUpperCase(), canal.canalVentaId]),
    );

    const usedOrigenes = new Set<number>(orders.map((order) => order.ORIGEN));
    for (const origen of usedOrigenes) {
      const mappedCode = origenMap.get(origen);
      if (!mappedCode) {
        diagnostics.push({
          code: `ORIGEN_${origen}_MAP`,
          ok: false,
          message: `No hay mapeo de canal para ORIGEN ${origen}`,
        });
        continue;
      }

      const canalId = canalesByCode.get(mappedCode.toUpperCase());
      diagnostics.push({
        code: `CANAL_${mappedCode}_FOR_ORIGEN_${origen}`,
        ok: Boolean(canalId),
        message: canalId
          ? `ORIGEN ${origen} mapea a canal ${mappedCode}`
          : `Canal ${mappedCode} no existe para empresa ${empresaId}`,
      });
    }

    const blockedByDiagnostics = diagnostics.some((diagnostic) => !diagnostic.ok);

    if (
      blockedByDiagnostics ||
      !context.empresaId ||
      !context.tiendaId ||
      !context.monedaId ||
      !context.estadoId ||
      !context.paisId
    ) {
      return {
        success: true,
        blockedByDiagnostics: true,
        summary: {
          pendingReceived: orders.length,
          inserted: 0,
          skippedExisting: 0,
          skippedValidation: 0,
          failed: 0,
        },
        diagnostics,
        items: [],
      };
    }

    const items: SyncPendingItemResult[] = [];
    let inserted = 0;
    let skippedExisting = 0;
    let skippedValidation = 0;
    let failed = 0;

    for (const order of orders) {
      const numeroPedido = order.ALIAS?.trim();
      const koajOrderId = Number(order.ID_PEDIDO) || 0;

      if (!numeroPedido) {
        skippedValidation += 1;
        items.push({
          koajOrderId,
          numeroPedido: '',
          status: 'skipped_validation',
          pedidoId: null,
          reason: 'ALIAS vacio',
        });
        continue;
      }

      const exists = await this.ordersRepository.existsByNumeroPedido(numeroPedido);
      if (exists) {
        skippedExisting += 1;
        items.push({
          koajOrderId,
          numeroPedido,
          status: 'skipped_existing',
          pedidoId: null,
          reason: 'NumeroPedido ya existe',
        });
        continue;
      }

      const canalCode = origenMap.get(order.ORIGEN);
      const canalVentaId = canalCode ? canalesByCode.get(canalCode.toUpperCase()) ?? null : null;

      if (!canalVentaId) {
        skippedValidation += 1;
        items.push({
          koajOrderId,
          numeroPedido,
          status: 'skipped_validation',
          pedidoId: null,
          reason: `No existe canal para ORIGEN ${order.ORIGEN}`,
        });
        continue;
      }

      const clienteNombre = this.buildClienteNombre(order);
      if (!clienteNombre) {
        skippedValidation += 1;
        items.push({
          koajOrderId,
          numeroPedido,
          status: 'skipped_validation',
          pedidoId: null,
          reason: 'Nombre de cliente vacio',
        });
        continue;
      }

      const shippingCity = this.findCityByKoajName(context.ciudades, order.CLIENTE?.CIUDAD);
      if (!shippingCity) {
        skippedValidation += 1;
        items.push({
          koajOrderId,
          numeroPedido,
          status: 'skipped_validation',
          pedidoId: null,
          reason: `Ciudad no mapeada: ${order.CLIENTE?.CIUDAD ?? 'SIN_CIUDAD'}`,
        });
        continue;
      }

      const createdAt = this.parseKoajDate(order.FECHA) ?? new Date();

      try {
        const result = await this.ordersRepository.createPedido({
          empresaId: context.empresaId,
          empresaClienteId: null,
          canalVentaId,
          tiendaOrigenId: context.tiendaId,
          monedaId: context.monedaId,
          numeroPedido,
          numeroExterno: String(order.ID_PEDIDO),
          estadoId: context.estadoId,
          clienteNombre,
          clienteDocumento: null,
          clienteEmail: null,
          clienteTelefono: null,
          shippingPaisId: context.paisId,
          shippingCiudadId: shippingCity.ciudadId,
          shippingDireccion: null,
          shippingBarrio: null,
          shippingZip: null,
          subtotal: 0,
          descuento: 0,
          impuestos: 0,
          costoEnvio: 0,
          total: 0,
          pasarelaPagoId: null,
          pagoReferencia: null,
          pagoEstadoId: null,
          createdAt,
        });

        inserted += 1;
        items.push({
          koajOrderId,
          numeroPedido,
          status: 'inserted',
          pedidoId: result.pedidoId,
          reason: null,
        });
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          skippedExisting += 1;
          items.push({
            koajOrderId,
            numeroPedido,
            status: 'skipped_existing',
            pedidoId: null,
            reason: 'NumeroPedido duplicado',
          });
          continue;
        }

        failed += 1;
        items.push({
          koajOrderId,
          numeroPedido,
          status: 'failed',
          pedidoId: null,
          reason: this.getErrorMessage(error),
        });
      }
    }

      return {
        success: true,
        blockedByDiagnostics: false,
        summary: {
          pendingReceived: orders.length,
          inserted,
          skippedExisting,
          skippedValidation,
          failed,
        },
        diagnostics,
        items,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `No se pudo sincronizar pendientes: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async computeAssignmentPreview(
    pedidoId: number,
    options?: {
      storeCodesCandidate?: string[];
      strategy?: AssignmentStrategy;
    },
  ): Promise<AssignmentComputation> {
    const detail = await this.getOrderDetail(pedidoId);
    const strategy = this.normalizeAssignmentStrategy(options?.strategy);
    const storeCodesCandidate = this.resolveStoreCodesCandidate(options?.storeCodesCandidate);

    const reglas: string[] = [
      `Estrategia seleccionada: ${strategy}`,
      'Sin inventario operativo: se prioriza tienda por fallback de codigos',
      'Transportadora: menor costo activo por zona',
      'Desempate transportadora: menor diasMin y luego menor CostoTransporteId',
    ];

    const advertencias: string[] = [];

    const tiendas = await this.ordersRepository.listTiendasByCodes(
      detail.empresaId,
      storeCodesCandidate,
    );
    const tiendasByCode = new Map(
      tiendas.map((tienda) => [tienda.codigo.trim().toUpperCase(), tienda]),
    );

    let tiendaSugerida: AssignmentPreview['tiendaSugerida'] = null;
    for (const candidateCode of storeCodesCandidate) {
      const tienda = tiendasByCode.get(candidateCode.toUpperCase());
      if (!tienda) {
        continue;
      }
      if (!tienda.activa) {
        advertencias.push(`Tienda ${candidateCode} existe pero no esta activa`);
        continue;
      }

      tiendaSugerida = {
        tiendaId: tienda.tiendaId,
        codigo: tienda.codigo,
        nombre: tienda.nombre,
      };
      break;
    }

    if (!tiendaSugerida) {
      advertencias.push(
        `No hay tiendas activas para candidatos: ${storeCodesCandidate.join(', ')}`,
      );
    }

    let zonaEnvio: AssignmentPreview['zonaEnvio'] = null;
    if (!detail.shipping.ciudadId) {
      advertencias.push('Pedido sin ciudad de envio; no se puede resolver zona de transporte');
    } else {
      const zona = await this.ordersRepository.findZonaByCiudadId(detail.shipping.ciudadId);
      if (!zona) {
        advertencias.push(
          `No existe relacion ZonaCiudad para CiudadId ${detail.shipping.ciudadId}`,
        );
      } else {
        zonaEnvio = {
          zonaTransporteId: zona.zonaTransporteId,
          codigo: zona.codigo,
          nombre: zona.nombre,
        };
      }
    }

    const monedaId = detail.totales.monedaId;
    if (!monedaId) {
      advertencias.push('Pedido sin moneda; no se puede calcular costo de transporte');
    }

    let costoSugerido: AssignmentPreview['costoSugerido'] = null;
    let transportadoraSugerida: AssignmentPreview['transportadoraSugerida'] = null;

    if (zonaEnvio && monedaId) {
      const costos = await this.ordersRepository.listActiveTransportCosts(
        detail.empresaId,
        zonaEnvio.zonaTransporteId,
        monedaId,
      );

      const costoSeleccionado = costos[0];
      if (!costoSeleccionado) {
        advertencias.push(
          `No hay costo transporte activo para zona ${zonaEnvio.zonaTransporteId} y moneda ${monedaId}`,
        );
      } else {
        costoSugerido = {
          costoTransporteId: costoSeleccionado.costoTransporteId,
          costo: costoSeleccionado.costo,
          diasMin: costoSeleccionado.diasMin,
          diasMax: costoSeleccionado.diasMax,
          monedaId: costoSeleccionado.monedaId,
          monedaCodigo: costoSeleccionado.monedaCodigo,
        };
        transportadoraSugerida = {
          transportadoraId: costoSeleccionado.transportadoraId,
          codigo: costoSeleccionado.transportadoraCodigo,
          nombre: costoSeleccionado.transportadoraNombre,
        };
      }
    }

    const preview: AssignmentPreview = {
      pedidoId: detail.pedidoId,
      strategy,
      estadoActual: {
        estadoId: detail.estado.estadoId,
        codigo: detail.estado.codigo,
        nombre: detail.estado.nombre,
      },
      tiendaActual: {
        tiendaId: detail.tiendaOrigen.tiendaId,
        codigo: detail.tiendaOrigen.codigo,
        nombre: detail.tiendaOrigen.nombre,
        activa: detail.tiendaOrigen.activa,
      },
      zonaEnvio,
      tiendaSugerida,
      transportadoraSugerida,
      costoSugerido,
      reglas,
      advertencias,
    };

    return { detail, preview };
  }

  private async loginKoaj(): Promise<string> {
    const baseUrl = this.getKoajBaseUrl();
    const username = this.configService.get<string>('KOAJ_USERNAME') ?? 'Tienda105';
    const password = this.configService.get<string>('KOAJ_PASSWORD') ?? 'Tienda105';

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible conectar con KOAJ para autenticacion',
      );
    }

    const rawBody = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(`KOAJ login fallo con estado ${response.status}`);
    }

    const token = this.extractToken(rawBody);
    if (!token) {
      throw new ServiceUnavailableException('KOAJ login no devolvio token');
    }

    return token;
  }

  private async fetchPendingOrders(token: string): Promise<KoajPendingResponse> {
    const baseUrl = this.getKoajBaseUrl();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/orders/pending`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible consultar pedidos pendientes en KOAJ',
      );
    }

    const rawBody = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(`KOAJ pending fallo con estado ${response.status}`);
    }

    try {
      return JSON.parse(rawBody) as KoajPendingResponse;
    } catch {
      throw new ServiceUnavailableException('KOAJ pending devolvio una respuesta invalida');
    }
  }

  private getKoajBaseUrl(): string {
    return this.configService.get<string>('KOAJ_BASE_URL') ?? 'https://api.dev.koaj.co';
  }

  private getOrigenCanalMap(): Map<number, string> {
    const defaultMap = new Map<number, string>([
      [1, 'ECOM'],
      [2, 'ECOM'],
      [4, 'ECOM'],
    ]);

    const raw = this.configService.get<string>('KOAJ_ORIGEN_CANAL_MAP');
    if (!raw?.trim()) {
      return defaultMap;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const map = new Map<number, string>();

      for (const [key, value] of Object.entries(parsed)) {
        const origen = Number(key);
        const canal = value?.trim().toUpperCase();
        if (!Number.isInteger(origen) || origen <= 0 || !canal) {
          continue;
        }
        map.set(origen, canal);
      }

      if (map.size > 0) {
        return map;
      }
    } catch {
      // Ignore malformed mapping and keep default.
    }

    return defaultMap;
  }

  private extractToken(rawBody: string): string {
    const trimmed = rawBody.trim();
    if (!trimmed) {
      return '';
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === 'string') {
        return parsed.trim();
      }
      if (
        parsed &&
        typeof parsed === 'object' &&
        'token' in parsed &&
        typeof (parsed as { token?: unknown }).token === 'string'
      ) {
        return (parsed as { token: string }).token.trim();
      }
    } catch {
      // Non-JSON response.
    }

    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeCityText(value: string): string {
    return this.normalizeText(value)
      .replace(/\bD C\b/g, '')
      .replace(/\bDC\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findCityByKoajName(
    cities: Array<{ ciudadId: number; nombre: string }>,
    koajCity?: string,
  ): { ciudadId: number; nombre: string } | null {
    const normalizedKoaj = this.normalizeCityText(koajCity?.trim() ?? '');
    if (!normalizedKoaj) {
      return null;
    }

    for (const city of cities) {
      const normalizedCatalog = this.normalizeCityText(city.nombre);
      if (!normalizedCatalog) {
        continue;
      }
      if (
        normalizedCatalog === normalizedKoaj ||
        normalizedKoaj.startsWith(`${normalizedCatalog} `) ||
        normalizedCatalog.startsWith(`${normalizedKoaj} `)
      ) {
        return city;
      }
    }

    return null;
  }

  private buildClienteNombre(order: KoajPendingOrder): string {
    return [order.CLIENTE?.NOMBRE?.trim(), order.CLIENTE?.APELLIDO?.trim()]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .trim();
  }

  private parseKoajDate(value?: string): Date | null {
    const raw = value?.trim();
    if (!raw) {
      return null;
    }

    const parsed = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private mapEstadoToUiStatus(estadoNombre: string | null): string {
    const normalized = this.normalizeText(estadoNombre ?? '');

    if (normalized.includes('ENTREGADO')) {
      return 'Entregado';
    }
    if (normalized.includes('NOVEDAD')) {
      return 'Con novedad';
    }
    if (normalized.includes('ALISTA') || normalized.includes('PREPARA')) {
      return 'Preparacion en curso';
    }

    return 'Asignado';
  }

  private toUiDateTime(isoValue: string): string {
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  private formatMoney(value: number): string {
    const normalized = Number.isFinite(value) ? value : 0;
    const [integerPart, decimalPart] = normalized.toFixed(2).split('.');
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${groupedInteger},${decimalPart} $`;
  }

  private getStringConfig(key: string, fallback: string): string {
    const value = this.configService.get<string>(key)?.trim();
    return value || fallback;
  }

  private getNumberConfig(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private resolveStoreCodesCandidate(input?: string[]): string[] {
    const fromBody = input?.map((code) => code.trim().toUpperCase()).filter(Boolean) ?? [];
    const source = fromBody.length > 0 ? fromBody : this.getStoreCodesCandidateFromConfig();
    const unique = [...new Set(source)];
    return unique.length > 0 ? unique : ['081', '198'];
  }

  private getStoreCodesCandidateFromConfig(): string[] {
    const fallback = ['081', '198'];
    const raw = this.configService.get<string>('KOAJ_ASSIGNMENT_STORE_CODES');
    if (!raw?.trim()) {
      return fallback;
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
            .filter(Boolean);
          return normalized.length > 0 ? normalized : fallback;
        }
      } catch {
        return fallback;
      }
    }

    const normalized = trimmed
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }

  private normalizeAssignmentStrategy(raw?: string): AssignmentStrategy {
    const configValue = this.configService
      .get<string>('KOAJ_ASSIGNMENT_STRATEGY')
      ?.trim()
      .toUpperCase();
    const candidate = raw?.trim().toUpperCase() || configValue || 'COST_MIN';
    return candidate === 'FALLBACK_FIXED' ? 'FALLBACK_FIXED' : 'COST_MIN';
  }

  private async resolveEstadoOperativo(
    detail: PedidoDetail,
    estadoEntidad: string,
    estadoCodigoSolicitado: string,
  ): Promise<{
    estado: { estadoId: number; codigo: string; nombre: string };
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const normalizedSolicitado = estadoCodigoSolicitado.trim().toUpperCase();

    const requested = await this.ordersRepository.findEstadoActivoByEntidadCodigo(
      estadoEntidad,
      normalizedSolicitado,
    );
    if (requested) {
      return { estado: requested, warnings };
    }

    warnings.push(
      `Estado operativo ${estadoEntidad}/${normalizedSolicitado} no existe o no esta activo; se aplicara fallback`,
    );

    const candidateCodes = new Set<string>();
    for (const candidate of this.getEstadoCodigoFallbacksFromConfig()) {
      candidateCodes.add(candidate.trim().toUpperCase());
    }

    const koajEstadoCodigo = this.getStringConfig('KOAJ_ESTADO_CODIGO', 'NUEVO').toUpperCase();
    candidateCodes.add(koajEstadoCodigo);

    if (detail.estado.codigo?.trim()) {
      candidateCodes.add(detail.estado.codigo.trim().toUpperCase());
    }

    candidateCodes.delete(normalizedSolicitado);
    const currentCode = detail.estado.codigo?.trim().toUpperCase() ?? null;

    for (const candidateCode of candidateCodes) {
      if (currentCode && candidateCode === currentCode) {
        continue;
      }

      const found = await this.ordersRepository.findEstadoActivoByEntidadCodigo(
        estadoEntidad,
        candidateCode,
      );
      if (!found) {
        continue;
      }

      warnings.push(
        `Se uso estado fallback ${estadoEntidad}/${found.codigo} (EstadoId ${found.estadoId})`,
      );
      return { estado: found, warnings };
    }

    if (detail.estado.estadoId) {
      const currentActive = await this.ordersRepository.findEstadoActivoById(
        detail.estado.estadoId,
      );
      if (currentActive) {
        warnings.push(
          `Se mantuvo el estado actual activo ${currentActive.codigo} (EstadoId ${currentActive.estadoId})`,
        );
        return { estado: currentActive, warnings };
      }
    }

    throw new UnprocessableEntityException(
      `Estado operativo ${estadoEntidad}/${normalizedSolicitado} no existe o no esta activo y no hay fallback disponible`,
    );
  }

  private getEstadoCodigoFallbacksFromConfig(): string[] {
    const defaults = ['ASIGNADO', 'CONFIRMADO', 'ALISTANDO', 'NUEVO'];
    const raw = this.configService.get<string>('KOAJ_ASSIGNMENT_ESTADO_CANDIDATES');
    if (!raw?.trim()) {
      return defaults;
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
            .filter(Boolean);
          return normalized.length > 0 ? normalized : defaults;
        }
      } catch {
        return defaults;
      }
    }

    const normalized = trimmed
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : defaults;
  }

  private normalizeOptionalText(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido';
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
