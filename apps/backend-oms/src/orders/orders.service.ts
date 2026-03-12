import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Permission, SafeUser } from '../auth/auth.types';
import { OrdersRepository } from './orders.repository';
import type {
  AssignmentConfirmResult,
  AssignmentPreview,
  AssignmentStrategy,
  KoajPsAddress,
  KoajPsAddressResponse,
  KoajPsCustomer,
  KoajPsCustomerResponse,
  KoajPsOrder,
  KoajPsOrdersResponse,
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

type KoajFullOrderRow = {
  productAttributeId: number | null;
  productReference: string | null;
  productEan13: string | null;
  productQuantity: number;
};

type KoajFullOrderPreview = {
  id: number;
  idCarrier: number | null;
  totalPaidTaxIncl: number | null;
  totalProductsWithTax: number | null;
  totalShipping: number | null;
  itemCount: number;
  orderRows: KoajFullOrderRow[];
};

type OrdersActorContext = Pick<
  SafeUser,
  'role' | 'storeId' | 'empresaClienteId' | 'permissions'
>;

type StoreScope = {
  tiendaId: number;
  codigo: string;
  nombre: string;
};

type OrderAccessScope =
  | { kind: 'GLOBAL' }
  | { kind: 'STORE'; store: StoreScope }
  | { kind: 'FRANCHISE'; empresaClienteId: number };

@Injectable()
export class OrdersService {
  private syncInProgress = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  async listOrders(actor?: OrdersActorContext): Promise<OrderListItem[]> {
    const accessScope = await this.resolveActorAccessScope(actor);
    const rows = await this.ordersRepository.listPedidos(
      this.buildPedidoListFilters(accessScope),
    );
    const storeRows = this.filterAndPrioritizeStoreRows(
      rows,
      accessScope.kind === 'STORE',
    );

    return storeRows.map((row) => ({
      pedidoId: row.pedidoId,
      id: row.numeroExterno?.trim() || String(row.pedidoId),
      reference: row.numeroPedido,
      newCustomer: 'No',
      origin: row.origenLabel,
      delivery: row.paisNombre ?? '-',
      customer: row.clienteNombre,
      total: this.formatMoney(row.total),
      payment: '-',
      status: this.mapEstadoToUiStatus(row.estadoNombre),
      date: this.toUiDateTime(row.createdAt),
      alias: row.numeroPedido,
      koajOrderId: Number(row.numeroExterno ?? 0) || 0,
      origen: 0,
      origenLabel: row.origenLabel,
      origenCanalCodigo: row.canalVentaCodigo,
      origenCanalNombre: row.canalVentaNombre,
      origenConectorCodigo: row.integracionCodigo,
      origenProveedorCodigo: row.proveedorCodigo,
      tiendaOrigenId: row.tiendaOrigenId,
      tiendaOrigenCodigo: row.tiendaOrigenCodigo,
      tiendaOrigenNombre: row.tiendaOrigenNombre,
    }));
  }

  async getOrderDetail(
    pedidoId: number,
    actor?: OrdersActorContext,
  ): Promise<PedidoDetail> {
    const accessScope = await this.resolveActorAccessScope(actor);
    return this.getOrderDetailByScope(pedidoId, accessScope);
  }

  private async getOrderDetailByScope(
    pedidoId: number,
    accessScope: OrderAccessScope,
  ): Promise<PedidoDetail> {
    const detail = await this.ordersRepository.findPedidoDetailById(pedidoId);
    if (!detail) {
      throw new NotFoundException(`Pedido ${pedidoId} no existe`);
    }

    this.assertAccessToPedido(detail, accessScope);

    return detail;
  }

  async previewAssignment(
    pedidoId: number,
    actor?: OrdersActorContext,
    options?: {
      storeCodesCandidate?: string[];
      strategy?: AssignmentStrategy;
    },
  ): Promise<AssignmentPreview> {
    const computation = await this.computeAssignmentPreview(
      pedidoId,
      actor,
      options,
    );
    return computation.preview;
  }

  async confirmAssignment(
    pedidoId: number,
    actor?: OrdersActorContext,
    options?: {
      storeCodesCandidate?: string[];
      strategy?: AssignmentStrategy;
      estadoEntidad?: string;
      estadoCodigo?: string;
    },
  ): Promise<AssignmentConfirmResult> {
    const { detail, preview } = await this.computeAssignmentPreview(
      pedidoId,
      actor,
      {
        storeCodesCandidate: options?.storeCodesCandidate,
        strategy: options?.strategy,
      },
    );

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

    const persistedStore =
      detail.tiendaOrigen.tiendaId !== preview.tiendaSugerida.tiendaId;
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

    const advertencias = [
      ...preview.advertencias,
      ...estadoResolution.warnings,
    ];
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
        transportadoraSugeridaId:
          preview.transportadoraSugerida.transportadoraId,
        costoSugerido: preview.costoSugerido.costo,
      },
      advertencias,
    };
  }

  async syncPendingOrders(limit?: number): Promise<SyncPendingResult> {
    if (this.syncInProgress) {
      throw new ServiceUnavailableException(
        'Ya existe una sincronizacion de pedidos KOAJ full en progreso',
      );
    }

    this.syncInProgress = true;
    try {
      try {
        const source = await this.fetchKoajPsOrders(limit);
        const allOrders = source.orders ?? [];
        const orders = allOrders.slice(0, limit ?? allOrders.length);

        const empresaId = this.getNumberConfig('KOAJ_EMPRESA_ID', 1);
        const tiendaCodigo = this.getStringConfig(
          'KOAJ_DEFAULT_TIENDA_CODIGO',
          '081',
        );
        const defaultCanalCodigo = this.getStringConfig(
          'KOAJ_DEFAULT_CANAL_CODIGO',
          'ECOM',
        );
        const monedaCodigo = this.getStringConfig(
          'KOAJ_DEFAULT_MONEDA_CODIGO',
          'COP',
        );
        const paisNombre = this.getStringConfig(
          'KOAJ_DEFAULT_PAIS_NOMBRE',
          'Colombia',
        );
        const fallbackCityName = this.getStringConfig(
          'KOAJ_DEFAULT_CIUDAD_NOMBRE',
          'BOGOTA',
        );
        const estadoEntidad = this.getStringConfig(
          'KOAJ_ESTADO_ENTIDAD',
          'PEDIDO',
        );
        const estadoCodigo = this.getStringConfig(
          'KOAJ_ESTADO_CODIGO',
          'NUEVO',
        );

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
            code: `CANAL_${defaultCanalCodigo}_DEFAULT_EXISTS`,
            ok: context.canales.some(
              (item) =>
                item.codigo.toUpperCase() === defaultCanalCodigo.toUpperCase(),
            ),
            message: context.canales.some(
              (item) =>
                item.codigo.toUpperCase() === defaultCanalCodigo.toUpperCase(),
            )
              ? `Canal default ${defaultCanalCodigo} disponible`
              : `Canal default ${defaultCanalCodigo} no existe para empresa ${empresaId}`,
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
            message: context.paisId
              ? 'Pais Colombia disponible'
              : 'Pais Colombia no existe',
          },
        ];

        const origenMap = this.getOrigenCanalMap();
        const fallbackCity = this.findCityByKoajName(
          context.ciudades,
          fallbackCityName,
        );
        diagnostics.push({
          code: `CIUDAD_FALLBACK_${this.normalizeText(fallbackCityName) || 'EMPTY'}_EXISTS`,
          ok: Boolean(fallbackCity),
          message: fallbackCity
            ? `Ciudad fallback ${fallbackCityName} disponible`
            : `Ciudad fallback ${fallbackCityName} no existe en catalogo`,
        });

        const canalesByCode = new Map(
          context.canales.map((canal) => [
            canal.codigo.toUpperCase(),
            canal.canalVentaId,
          ]),
        );

        const usedOrigenes = new Set<number>(
          orders
            .map((order) => this.toNumber(order.id_shop))
            .filter(
              (value): value is number =>
                typeof value === 'number' &&
                Number.isInteger(value) &&
                value > 0,
            ),
        );
        for (const origen of usedOrigenes) {
          const mappedCode = origenMap.get(origen) ?? defaultCanalCodigo;
          const canalId = canalesByCode.get(mappedCode.toUpperCase());
          diagnostics.push({
            code: `CANAL_${mappedCode}_FOR_ORIGEN_${origen}`,
            ok: Boolean(canalId),
            message: canalId
              ? `ORIGEN ${origen} mapea a canal ${mappedCode}`
              : `Canal ${mappedCode} no existe para empresa ${empresaId}`,
          });
        }

        // La ciudad fallback no debe bloquear toda la sincronizacion:
        // si llega ciudad en el pedido y mapea, el pedido puede insertarse.
        const blockedByDiagnostics = diagnostics.some(
          (diagnostic) =>
            !diagnostic.ok && !diagnostic.code.startsWith('CIUDAD_FALLBACK_'),
        );

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
        const addressCache = new Map<number, KoajPsAddress | null>();
        const customerCache = new Map<number, KoajPsCustomer | null>();
        const candidateNumeroPedidos: string[] = [];
        const candidateNumeroExternos: string[] = [];

        for (const order of orders) {
          const koajOrderId = this.toNumber(order.id);
          if (
            !koajOrderId ||
            !Number.isInteger(koajOrderId) ||
            koajOrderId <= 0
          ) {
            continue;
          }

          const numeroPedido = this.resolveNumeroPedidoFromKoajPsOrder(
            order,
            koajOrderId,
          );
          if (!numeroPedido) {
            continue;
          }

          candidateNumeroPedidos.push(numeroPedido);
          candidateNumeroExternos.push(String(koajOrderId));
        }

        const existingKeys = await this.ordersRepository.findExistingPedidoKeys(
          {
            numeroPedidos: candidateNumeroPedidos,
            numeroExternos: candidateNumeroExternos,
          },
        );
        const existingNumeroPedidos = new Set(
          existingKeys.numeroPedidos.map((item) => item.trim()),
        );
        const existingNumeroExternos = new Set(
          existingKeys.numeroExternos.map((item) => item.trim()),
        );

        let inserted = 0;
        let skippedExisting = 0;
        let skippedValidation = 0;
        let failed = 0;

        for (const order of orders) {
          const koajOrderId = this.toNumber(order.id);
          if (
            !koajOrderId ||
            !Number.isInteger(koajOrderId) ||
            koajOrderId <= 0
          ) {
            skippedValidation += 1;
            items.push({
              koajOrderId: 0,
              numeroPedido: '',
              status: 'skipped_validation',
              pedidoId: null,
              reason: 'Order.id invalido en KOAJ full',
            });
            continue;
          }

          const numeroPedido = this.resolveNumeroPedidoFromKoajPsOrder(
            order,
            koajOrderId,
          );
          const numeroExterno = String(koajOrderId);

          if (!numeroPedido) {
            skippedValidation += 1;
            items.push({
              koajOrderId,
              numeroPedido: '',
              status: 'skipped_validation',
              pedidoId: null,
              reason: 'NumeroPedido vacio',
            });
            continue;
          }

          const existsByNumeroPedido = existingNumeroPedidos.has(numeroPedido);
          const existsByNumeroExterno =
            existingNumeroExternos.has(numeroExterno);
          if (existsByNumeroPedido || existsByNumeroExterno) {
            skippedExisting += 1;
            items.push({
              koajOrderId,
              numeroPedido,
              status: 'skipped_existing',
              pedidoId: null,
              reason: existsByNumeroPedido
                ? 'NumeroPedido ya existe'
                : 'NumeroExterno ya existe',
            });
            continue;
          }

          const origen = this.toNumber(order.id_shop) ?? 1;
          const canalCode = origenMap.get(origen) ?? defaultCanalCodigo;
          const canalVentaId = canalCode
            ? (canalesByCode.get(canalCode.toUpperCase()) ?? null)
            : null;

          if (!canalVentaId) {
            skippedValidation += 1;
            items.push({
              koajOrderId,
              numeroPedido,
              status: 'skipped_validation',
              pedidoId: null,
              reason: `No existe canal para ORIGEN ${origen}`,
            });
            continue;
          }

          const shippingAddress = await this.loadKoajPsAddressById(
            addressCache,
            this.toNumber(order.id_address_delivery),
          );
          const customer = await this.loadKoajPsCustomerById(
            customerCache,
            this.toNumber(order.id_customer),
          );

          const clienteNombre = this.buildClienteNombreFromKoajPs(
            order,
            customer,
            shippingAddress,
          );
          const shippingCity =
            this.findCityByKoajName(context.ciudades, shippingAddress?.city) ??
            fallbackCity;
          if (!shippingCity) {
            skippedValidation += 1;
            items.push({
              koajOrderId,
              numeroPedido,
              status: 'skipped_validation',
              pedidoId: null,
              reason: `Ciudad no mapeada: ${shippingAddress?.city ?? 'SIN_CIUDAD'}`,
            });
            continue;
          }

          const createdAt = this.parseKoajDate(order.date_add) ?? new Date();
          const totals = this.extractTotalsFromKoajPsOrder(order);

          try {
            const result = await this.ordersRepository.createPedido({
              empresaId: context.empresaId,
              empresaClienteId: null,
              canalVentaId,
              tiendaOrigenId: context.tiendaId,
              monedaId: context.monedaId,
              numeroPedido,
              numeroExterno,
              estadoId: context.estadoId,
              clienteNombre,
              clienteDocumento: this.truncate(
                this.normalizeOptionalText(customer?.dni),
                60,
              ),
              clienteEmail: this.truncate(
                this.normalizeOptionalText(customer?.email),
                180,
              ),
              clienteTelefono:
                this.truncate(
                  this.normalizeOptionalText(shippingAddress?.phone_mobile),
                  50,
                ) ??
                this.truncate(
                  this.normalizeOptionalText(shippingAddress?.phone),
                  50,
                ),
              shippingPaisId: context.paisId,
              shippingCiudadId: shippingCity.ciudadId,
              shippingDireccion: this.buildShippingAddress(shippingAddress),
              shippingBarrio: this.truncate(
                this.normalizeOptionalText(shippingAddress?.address2),
                120,
              ),
              shippingZip: this.truncate(
                this.normalizeOptionalText(shippingAddress?.postcode),
                20,
              ),
              subtotal: totals.subtotal,
              descuento: totals.descuento,
              impuestos: totals.impuestos,
              costoEnvio: totals.costoEnvio,
              total: totals.total,
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
            existingNumeroPedidos.add(numeroPedido);
            existingNumeroExternos.add(numeroExterno);
          } catch (error) {
            if (this.isUniqueConstraintError(error)) {
              skippedExisting += 1;
              items.push({
                koajOrderId,
                numeroPedido,
                status: 'skipped_existing',
                pedidoId: null,
                reason: 'Pedido ya existe (concurrencia)',
              });
              existingNumeroPedidos.add(numeroPedido);
              existingNumeroExternos.add(numeroExterno);
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
          `No se pudo sincronizar pedidos KOAJ full: ${this.getErrorMessage(error)}`,
        );
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async computeAssignmentPreview(
    pedidoId: number,
    actor?: OrdersActorContext,
    options?: {
      storeCodesCandidate?: string[];
      strategy?: AssignmentStrategy;
    },
  ): Promise<AssignmentComputation> {
    const accessScope = await this.resolveActorAccessScope(actor);
    const detail = await this.getOrderDetailByScope(pedidoId, accessScope);
    const strategy = this.normalizeAssignmentStrategy(options?.strategy);
    const storeCodesCandidate = this.resolveStoreCodesCandidate(
      options?.storeCodesCandidate,
    );

    const reglas: string[] = [
      `Estrategia seleccionada: ${strategy}`,
      'Tienda: prioridad por inventario (si hay detalle de items), con fallback por codigos',
      'Transportadora: menor costo activo por zona',
      'Desempate transportadora: menor diasMin y luego menor CostoTransporteId',
    ];

    const advertencias: string[] = [];

    const tiendas = await this.ordersRepository.listTiendasByCodes(
      detail.empresaId,
      storeCodesCandidate,
      accessScope.kind === 'FRANCHISE'
        ? accessScope.empresaClienteId
        : undefined,
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
      advertencias.push(
        'Pedido sin ciudad de envio; no se puede resolver zona de transporte',
      );
    } else {
      const zona = await this.ordersRepository.findZonaByCiudadId(
        detail.shipping.ciudadId,
      );
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
      advertencias.push(
        'Pedido sin moneda; no se puede calcular costo de transporte',
      );
    }

    let koajFullOrder: KoajFullOrderPreview | null = null;
    let valorPedidoParaRango: number | null = null;
    if (detail.numeroExterno) {
      const koajSource = await this.loadKoajFullOrderForAssignment(
        detail.numeroExterno,
      );
      koajFullOrder = koajSource.order;
      if (koajSource.warning) {
        advertencias.push(koajSource.warning);
      }

      if (koajFullOrder) {
        valorPedidoParaRango =
          koajFullOrder.totalProductsWithTax ??
          koajFullOrder.totalPaidTaxIncl ??
          null;

        reglas.push(
          `KOAJ full usado para assignment: orderId=${koajFullOrder.id}, carrierOrigen=${koajFullOrder.idCarrier ?? 'N/A'}, valorRef=${valorPedidoParaRango ?? 'N/A'}`,
        );
      }
    }

    if (koajFullOrder?.orderRows.length) {
      const inventoryDecision = await this.selectStoreByInventory(
        detail,
        storeCodesCandidate,
        tiendas,
        koajFullOrder.orderRows,
      );
      if (inventoryDecision.tiendaSugerida) {
        tiendaSugerida = inventoryDecision.tiendaSugerida;
      }
      reglas.push(...inventoryDecision.reglas);
      advertencias.push(...inventoryDecision.advertencias);
    } else {
      reglas.push(
        'Inventario F3 lite: KOAJ no devolvio order_rows; se mantiene fallback de tienda',
      );
    }

    let costoSugerido: AssignmentPreview['costoSugerido'] = null;
    let transportadoraSugerida: AssignmentPreview['transportadoraSugerida'] =
      null;

    if (zonaEnvio && monedaId) {
      const costosActivos =
        await this.ordersRepository.listActiveTransportCosts(
          detail.empresaId,
          zonaEnvio.zonaTransporteId,
          monedaId,
        );

      let costosFiltrados = costosActivos;
      if (valorPedidoParaRango !== null) {
        const costosPorRangoValor = costosActivos.filter((item) =>
          this.isValueWithinRange(
            valorPedidoParaRango,
            item.valorMin,
            item.valorMax,
          ),
        );
        if (costosPorRangoValor.length > 0) {
          costosFiltrados = costosPorRangoValor;
        } else {
          advertencias.push(
            `No hay costo transporte que cubra valor ${valorPedidoParaRango}; se usa menor costo activo de la zona`,
          );
        }
      }

      const costoSeleccionado = costosFiltrados[0];
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

  private async fetchKoajPsOrders(
    limit?: number,
  ): Promise<KoajPsOrdersResponse> {
    const normalizedLimit =
      Number.isInteger(limit) && (limit as number) > 0 ? Number(limit) : 100;
    const payload = await this.fetchKoajPsResource<KoajPsOrdersResponse>(
      '/orders',
      {
        output_format: 'JSON',
        display: 'full',
        limit: normalizedLimit,
      },
      `KOAJ full list (limit ${normalizedLimit})`,
    );

    if (!payload || typeof payload !== 'object') {
      throw new ServiceUnavailableException(
        'KOAJ full list devolvio una respuesta invalida',
      );
    }

    return payload;
  }

  private async loadKoajPsAddressById(
    cache: Map<number, KoajPsAddress | null>,
    addressId: number | null,
  ): Promise<KoajPsAddress | null> {
    if (!addressId || !Number.isInteger(addressId) || addressId <= 0) {
      return null;
    }

    if (cache.has(addressId)) {
      return cache.get(addressId) ?? null;
    }

    try {
      const payload = await this.fetchKoajPsResource<KoajPsAddressResponse>(
        `/addresses/${addressId}`,
        {
          output_format: 'JSON',
          display: 'full',
        },
        `KOAJ address ${addressId}`,
      );
      const address = this.extractKoajPsAddress(payload);
      cache.set(addressId, address);
      return address;
    } catch {
      cache.set(addressId, null);
      return null;
    }
  }

  private async loadKoajPsCustomerById(
    cache: Map<number, KoajPsCustomer | null>,
    customerId: number | null,
  ): Promise<KoajPsCustomer | null> {
    if (!customerId || !Number.isInteger(customerId) || customerId <= 0) {
      return null;
    }

    if (cache.has(customerId)) {
      return cache.get(customerId) ?? null;
    }

    try {
      const payload = await this.fetchKoajPsResource<KoajPsCustomerResponse>(
        `/customers/${customerId}`,
        {
          output_format: 'JSON',
          display: 'full',
        },
        `KOAJ customer ${customerId}`,
      );
      const customer = this.extractKoajPsCustomer(payload);
      cache.set(customerId, customer);
      return customer;
    } catch {
      cache.set(customerId, null);
      return null;
    }
  }

  private async fetchKoajPsResource<T>(
    path: string,
    query: Record<string, string | number>,
    resourceLabel: string,
  ): Promise<T> {
    const wsKey = this.getKoajPsWsKey();
    if (!wsKey) {
      throw new ServiceUnavailableException(
        'KOAJ full no configurado (falta KOAJ_PS_WS_KEY)',
      );
    }

    const baseUrl = this.getKoajPsBaseUrl();
    const authBasic = Buffer.from(`${wsKey}:`).toString('base64');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${normalizedPath}`);

    Object.entries(query).forEach(([key, value]) => {
      const normalizedValue = String(value).trim();
      if (normalizedValue) {
        url.searchParams.set(key, normalizedValue);
      }
    });

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authBasic}`,
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        `No fue posible consultar ${resourceLabel}`,
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `${resourceLabel} fallo con estado ${response.status}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as T | null;
    if (!payload) {
      throw new ServiceUnavailableException(
        `${resourceLabel} devolvio una respuesta invalida`,
      );
    }

    return payload;
  }

  private async loadKoajFullOrderForAssignment(
    numeroExterno: string,
  ): Promise<{ order: KoajFullOrderPreview | null; warning: string | null }> {
    const orderId = Number(numeroExterno);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return { order: null, warning: null };
    }

    const wsKey = this.getKoajPsWsKey();
    if (!wsKey) {
      return {
        order: null,
        warning:
          'KOAJ full no configurado (falta KOAJ_PS_WS_KEY); se usa logica local',
      };
    }

    const baseUrl = this.getKoajPsBaseUrl();
    const authBasic = Buffer.from(`${wsKey}:`).toString('base64');
    const url = `${baseUrl}/orders/${orderId}?output_format=JSON&display=full`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authBasic}`,
        },
      });
    } catch {
      return {
        order: null,
        warning: `KOAJ full no disponible para orderId ${orderId}; se usa logica local`,
      };
    }

    if (!response.ok) {
      return {
        order: null,
        warning: `KOAJ full respondio ${response.status} para orderId ${orderId}; se usa logica local`,
      };
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const rawOrder = this.extractKoajFullOrder(payload);
    if (!rawOrder) {
      return {
        order: null,
        warning: `KOAJ full no retorno order valida para orderId ${orderId}; se usa logica local`,
      };
    }

    const orderRows = this.extractKoajOrderRows(rawOrder);
    const itemCount = orderRows.length;
    return {
      order: {
        id: this.toNumber(rawOrder.id) ?? orderId,
        idCarrier: this.toNumber(rawOrder.id_carrier),
        totalPaidTaxIncl: this.toNumber(rawOrder.total_paid_tax_incl),
        totalProductsWithTax: this.toNumber(rawOrder.total_products_wt),
        totalShipping:
          this.toNumber(rawOrder.total_shipping_tax_incl) ??
          this.toNumber(rawOrder.total_shipping),
        itemCount,
        orderRows,
      },
      warning: null,
    };
  }

  private getKoajPsBaseUrl(): string {
    const raw = this.configService.get<string>('KOAJ_PS_BASE_URL')?.trim();
    const base = raw || 'https://koaj8.dev.koaj.co/api';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }

  private getKoajPsWsKey(): string {
    return this.configService.get<string>('KOAJ_PS_WS_KEY')?.trim() ?? '';
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

  private resolveNumeroPedidoFromKoajPsOrder(
    order: KoajPsOrder,
    orderId: number,
  ): string {
    const reference = this.normalizeOptionalText(order.reference);
    if (reference) {
      return this.truncate(reference, 60);
    }
    return this.truncate(`KOAJ-${orderId}`, 60);
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

  private buildClienteNombreFromKoajPs(
    order: KoajPsOrder,
    customer: KoajPsCustomer | null,
    address: KoajPsAddress | null,
  ): string {
    const customerName = [
      this.normalizeOptionalText(customer?.firstname),
      this.normalizeOptionalText(customer?.lastname),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .trim();
    if (customerName) {
      return this.truncate(customerName, 180);
    }

    const addressName = [
      this.normalizeOptionalText(address?.firstname),
      this.normalizeOptionalText(address?.lastname),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .trim();
    if (addressName) {
      return this.truncate(addressName, 180);
    }

    const customerId = this.toNumber(order.id_customer);
    const orderId = this.toNumber(order.id);
    const fallbackId = customerId ?? orderId;
    return this.truncate(
      fallbackId ? `Cliente KOAJ ${fallbackId}` : 'Cliente KOAJ',
      180,
    );
  }

  private buildShippingAddress(address: KoajPsAddress | null): string | null {
    const primary = this.normalizeOptionalText(address?.address1);
    return primary ? this.truncate(primary, 255) : null;
  }

  private extractTotalsFromKoajPsOrder(order: KoajPsOrder): {
    subtotal: number;
    descuento: number;
    impuestos: number;
    costoEnvio: number;
    total: number;
  } {
    const subtotal =
      this.toNumber(order.total_products_wt) ??
      this.toNumber(order.total_products) ??
      0;
    const descuento =
      this.toNumber(order.total_discounts_tax_incl) ??
      this.toNumber(order.total_discounts) ??
      0;
    const costoEnvio =
      this.toNumber(order.total_shipping_tax_incl) ??
      this.toNumber(order.total_shipping) ??
      0;
    const totalTaxIncl =
      this.toNumber(order.total_paid_tax_incl) ??
      this.toNumber(order.total_paid);
    const totalTaxExcl = this.toNumber(order.total_paid_tax_excl);
    const impuestos =
      totalTaxIncl !== null && totalTaxExcl !== null
        ? Math.max(0, totalTaxIncl - totalTaxExcl)
        : 0;
    const total =
      totalTaxIncl ?? Math.max(0, subtotal - descuento + costoEnvio);

    return {
      subtotal,
      descuento,
      impuestos,
      costoEnvio,
      total,
    };
  }

  private extractKoajPsAddress(
    payload: KoajPsAddressResponse,
  ): KoajPsAddress | null {
    if (payload.address && typeof payload.address === 'object') {
      return payload.address;
    }
    if (Array.isArray(payload.addresses) && payload.addresses.length > 0) {
      return payload.addresses[0] ?? null;
    }
    return null;
  }

  private extractKoajPsCustomer(
    payload: KoajPsCustomerResponse,
  ): KoajPsCustomer | null {
    if (payload.customer && typeof payload.customer === 'object') {
      return payload.customer;
    }
    if (Array.isArray(payload.customers) && payload.customers.length > 0) {
      return payload.customers[0] ?? null;
    }
    return null;
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

  private async resolveActorAccessScope(
    actor?: OrdersActorContext,
  ): Promise<OrderAccessScope> {
    if (!actor) {
      return { kind: 'GLOBAL' };
    }

    if (this.isGlobalSuperAdmin(actor)) {
      return { kind: 'GLOBAL' };
    }

    if (this.isStoreRole(actor.role)) {
      const storeScope = await this.resolveActorStoreScope(actor);
      return { kind: 'STORE', store: storeScope };
    }

    if (this.isPanelRole(actor.role)) {
      const empresaClienteId = this.parsePositiveInteger(actor.empresaClienteId);
      if (!empresaClienteId) {
        throw new ForbiddenException(
          'Usuario panel sin franquicia asignada. Solo super admin global puede ver todos los pedidos.',
        );
      }
      return { kind: 'FRANCHISE', empresaClienteId };
    }

    return { kind: 'GLOBAL' };
  }

  private async resolveActorStoreScope(
    actor: OrdersActorContext,
  ): Promise<StoreScope> {
    const storeReference = actor.storeId?.trim();
    if (!storeReference) {
      throw new ForbiddenException('Usuario tienda sin tienda asignada');
    }

    const scope =
      await this.ordersRepository.findStoreScopeByUserStoreId(storeReference);
    if (!scope) {
      throw new ForbiddenException(
        `No se pudo resolver una tienda activa para el usuario (${storeReference})`,
      );
    }

    return scope;
  }

  private buildPedidoListFilters(
    scope: OrderAccessScope,
  ): { tiendaOrigenId?: number; empresaClienteId?: number } | undefined {
    if (scope.kind === 'STORE') {
      return { tiendaOrigenId: scope.store.tiendaId };
    }

    if (scope.kind === 'FRANCHISE') {
      return { empresaClienteId: scope.empresaClienteId };
    }

    return undefined;
  }

  private assertAccessToPedido(
    detail: PedidoDetail,
    scope: OrderAccessScope,
  ): void {
    if (scope.kind === 'GLOBAL') {
      return;
    }

    if (scope.kind === 'STORE') {
      if (detail.tiendaOrigen.tiendaId !== scope.store.tiendaId) {
        throw new ForbiddenException(
          `No tienes acceso al pedido ${detail.pedidoId}; pertenece a otra tienda`,
        );
      }
      return;
    }

    if (detail.tiendaOrigen.empresaClienteId !== scope.empresaClienteId) {
      throw new ForbiddenException(
        `No tienes acceso al pedido ${detail.pedidoId}; pertenece a otra franquicia`,
      );
    }
  }

  private isStoreRole(role: OrdersActorContext['role']): boolean {
    return role === 'STORE_ADMIN' || role === 'STORE_READONLY';
  }

  private isPanelRole(role: OrdersActorContext['role']): boolean {
    return role === 'ADMIN' || role === 'PANEL_READONLY';
  }

  private isGlobalSuperAdmin(actor: OrdersActorContext): boolean {
    const empresaClienteId = this.parsePositiveInteger(actor.empresaClienteId);
    return (
      empresaClienteId === null &&
      this.hasPermission(actor.permissions, 'security.manage')
    );
  }

  private hasPermission(
    permissions: Permission[] | undefined,
    expected: Permission,
  ): boolean {
    return Array.isArray(permissions) && permissions.includes(expected);
  }

  private parsePositiveInteger(rawValue?: string): number | null {
    if (!rawValue) {
      return null;
    }

    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private filterAndPrioritizeStoreRows<
    T extends {
      estadoCodigo: string | null;
      estadoNombre: string | null;
      createdAt: string;
    },
  >(rows: T[], isStoreUser: boolean): T[] {
    if (!isStoreUser) {
      return rows;
    }

    const operationalRows = rows.filter((row) =>
      this.isStoreOperationalStatus(row.estadoCodigo, row.estadoNombre),
    );
    const selectedRows = operationalRows.length > 0 ? operationalRows : rows;

    return [...selectedRows].sort((left, right) => {
      const priorityDiff =
        this.getStoreStatusPriority(left.estadoCodigo, left.estadoNombre) -
        this.getStoreStatusPriority(right.estadoCodigo, right.estadoNombre);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.createdAt.localeCompare(left.createdAt);
    });
  }

  private isStoreOperationalStatus(
    estadoCodigo: string | null,
    estadoNombre: string | null,
  ): boolean {
    const source = `${this.normalizeText(estadoCodigo ?? '')} ${this.normalizeText(estadoNombre ?? '')}`;

    return (
      source.includes('PREPARA') ||
      source.includes('ALISTA') ||
      source.includes('ASIGNA')
    );
  }

  private getStoreStatusPriority(
    estadoCodigo: string | null,
    estadoNombre: string | null,
  ): number {
    const source = `${this.normalizeText(estadoCodigo ?? '')} ${this.normalizeText(estadoNombre ?? '')}`;

    if (source.includes('PREPARA') || source.includes('ALISTA')) {
      return 0;
    }
    if (source.includes('ASIGNA')) {
      return 1;
    }
    return 2;
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
    const fromBody =
      input?.map((code) => code.trim().toUpperCase()).filter(Boolean) ?? [];
    const source =
      fromBody.length > 0 ? fromBody : this.getStoreCodesCandidateFromConfig();
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
            .map((item) =>
              typeof item === 'string' ? item.trim().toUpperCase() : '',
            )
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

    const requested =
      await this.ordersRepository.findEstadoActivoByEntidadCodigo(
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

    const koajEstadoCodigo = this.getStringConfig(
      'KOAJ_ESTADO_CODIGO',
      'NUEVO',
    ).toUpperCase();
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
    const raw = this.configService.get<string>(
      'KOAJ_ASSIGNMENT_ESTADO_CANDIDATES',
    );
    if (!raw?.trim()) {
      return defaults;
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) =>
              typeof item === 'string' ? item.trim().toUpperCase() : '',
            )
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

  private async selectStoreByInventory(
    detail: PedidoDetail,
    storeCodesCandidate: string[],
    tiendas: Array<{
      tiendaId: number;
      codigo: string;
      nombre: string;
      activa: boolean;
    }>,
    orderRows: KoajFullOrderRow[],
  ): Promise<{
    tiendaSugerida: AssignmentPreview['tiendaSugerida'] | null;
    reglas: string[];
    advertencias: string[];
  }> {
    const reglas: string[] = [];
    const advertencias: string[] = [];

    const tiendasByCode = new Map(
      tiendas.map((tienda) => [tienda.codigo.trim().toUpperCase(), tienda]),
    );
    const tiendasActivasOrdenadas = storeCodesCandidate
      .map((code) => tiendasByCode.get(code.toUpperCase()))
      .filter(
        (
          tienda,
        ): tienda is {
          tiendaId: number;
          codigo: string;
          nombre: string;
          activa: boolean;
        } => Boolean(tienda?.activa),
      );

    if (tiendasActivasOrdenadas.length === 0) {
      advertencias.push(
        'Inventario F3 lite: no hay tiendas activas candidatas para evaluar cobertura',
      );
      return { tiendaSugerida: null, reglas, advertencias };
    }

    const signals = this.collectInventorySignals(orderRows);
    if (
      signals.varianteIds.length === 0 &&
      signals.skus.length === 0 &&
      signals.eans.length === 0
    ) {
      advertencias.push(
        'Inventario F3 lite: order_rows sin señales de variante/SKU/EAN; se mantiene fallback',
      );
      return { tiendaSugerida: null, reglas, advertencias };
    }

    const variantes = await this.ordersRepository.findVariantesBySignals({
      empresaId: detail.empresaId,
      varianteIds: signals.varianteIds,
      skus: signals.skus,
      eans: signals.eans,
    });

    if (variantes.length === 0) {
      advertencias.push(
        'Inventario F3 lite: no se encontraron variantes activas para los items KOAJ',
      );
      return { tiendaSugerida: null, reglas, advertencias };
    }

    const variantesById = new Map(
      variantes.map((item) => [item.varianteId, item.varianteId]),
    );
    const variantesBySku = new Map(
      variantes
        .map(
          (item) =>
            [this.normalizeInventorySku(item.sku), item.varianteId] as const,
        )
        .filter((entry): entry is [string, number] => Boolean(entry[0])),
    );
    const variantesByEan = new Map(
      variantes
        .map(
          (item) =>
            [
              this.normalizeOptionalText(item.ean ?? undefined),
              item.varianteId,
            ] as const,
        )
        .filter((entry): entry is [string, number] => Boolean(entry[0])),
    );

    const qtyRequeridaPorVariante = new Map<number, number>();
    let unresolvedItems = 0;
    for (const row of orderRows) {
      const varianteId = this.resolveVarianteIdForOrderRow(
        row,
        variantesById,
        variantesBySku,
        variantesByEan,
      );
      if (!varianteId) {
        unresolvedItems += 1;
        continue;
      }

      const qty =
        Number.isFinite(row.productQuantity) && row.productQuantity > 0
          ? Math.ceil(row.productQuantity)
          : 1;
      qtyRequeridaPorVariante.set(
        varianteId,
        (qtyRequeridaPorVariante.get(varianteId) ?? 0) + qty,
      );
    }

    if (unresolvedItems > 0) {
      advertencias.push(
        `Inventario F3 lite: ${unresolvedItems} item(s) sin mapeo a variante por attributeId/SKU/EAN`,
      );
    }

    if (qtyRequeridaPorVariante.size === 0) {
      advertencias.push(
        'Inventario F3 lite: no fue posible mapear variantes para validar stock; se mantiene fallback',
      );
      return { tiendaSugerida: null, reglas, advertencias };
    }

    const bodegas = await this.ordersRepository.listActiveBodegasByTiendaIds(
      detail.empresaId,
      tiendasActivasOrdenadas.map((tienda) => tienda.tiendaId),
    );
    if (bodegas.length === 0) {
      advertencias.push(
        'Inventario F3 lite: no hay bodegas activas asociadas a tiendas candidatas',
      );
      return { tiendaSugerida: null, reglas, advertencias };
    }

    const bodegasByTienda = new Map<
      number,
      Array<{
        bodegaId: number;
        tiendaId: number;
        codigo: string;
        nombre: string;
      }>
    >();
    for (const bodega of bodegas) {
      const current = bodegasByTienda.get(bodega.tiendaId) ?? [];
      current.push(bodega);
      bodegasByTienda.set(bodega.tiendaId, current);
    }

    const inventarioRows =
      await this.ordersRepository.listInventarioDisponibilidad({
        empresaId: detail.empresaId,
        bodegaIds: [...new Set(bodegas.map((row) => row.bodegaId))],
        varianteIds: [...qtyRequeridaPorVariante.keys()],
      });
    const availableByBodegaVariante = new Map(
      inventarioRows.map(
        (row) =>
          [`${row.bodegaId}:${row.varianteId}`, row.stockDisponible] as const,
      ),
    );

    const totalVariantes = qtyRequeridaPorVariante.size;
    let bestCoverageStore: { codigo: string; covered: number } | null = null;
    for (const tienda of tiendasActivasOrdenadas) {
      const bodegasDeTienda = bodegasByTienda.get(tienda.tiendaId) ?? [];
      if (bodegasDeTienda.length === 0) {
        continue;
      }

      let covered = 0;
      let missing = 0;
      for (const [
        varianteId,
        qtyRequerida,
      ] of qtyRequeridaPorVariante.entries()) {
        const disponible = bodegasDeTienda.reduce((sum, bodega) => {
          return (
            sum +
            (availableByBodegaVariante.get(
              `${bodega.bodegaId}:${varianteId}`,
            ) ?? 0)
          );
        }, 0);
        if (disponible >= qtyRequerida) {
          covered += 1;
        } else {
          missing += qtyRequerida - disponible;
        }
      }

      if (!bestCoverageStore || covered > bestCoverageStore.covered) {
        bestCoverageStore = { codigo: tienda.codigo, covered };
      }

      if (covered === totalVariantes) {
        reglas.push(
          `Inventario F3 lite: tienda ${tienda.codigo} seleccionada por cobertura completa (${covered}/${totalVariantes} variantes)`,
        );
        return {
          tiendaSugerida: {
            tiendaId: tienda.tiendaId,
            codigo: tienda.codigo,
            nombre: tienda.nombre,
          },
          reglas,
          advertencias,
        };
      }

      advertencias.push(
        `Inventario F3 lite: tienda ${tienda.codigo} no cubre stock completo (cubre ${covered}/${totalVariantes}, faltan ${missing} unidad(es), bodegas=${bodegasDeTienda.length})`,
      );
    }

    if (bestCoverageStore) {
      reglas.push(
        `Inventario F3 lite: mejor cobertura encontrada en ${bestCoverageStore.codigo} (${bestCoverageStore.covered}/${totalVariantes} variantes), se mantiene fallback por cobertura incompleta`,
      );
    }

    return { tiendaSugerida: null, reglas, advertencias };
  }

  private collectInventorySignals(orderRows: KoajFullOrderRow[]): {
    varianteIds: number[];
    skus: string[];
    eans: string[];
  } {
    const varianteIds = [
      ...new Set(
        orderRows
          .map((row) => row.productAttributeId)
          .filter(
            (value): value is number =>
              typeof value === 'number' && Number.isInteger(value) && value > 0,
          ),
      ),
    ];
    const skus = [
      ...new Set(
        orderRows
          .map((row) => this.normalizeInventorySku(row.productReference))
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const eans = [
      ...new Set(
        orderRows
          .map((row) =>
            this.normalizeOptionalText(row.productEan13 ?? undefined),
          )
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    return { varianteIds, skus, eans };
  }

  private resolveVarianteIdForOrderRow(
    row: KoajFullOrderRow,
    variantesById: Map<number, number>,
    variantesBySku: Map<string, number>,
    variantesByEan: Map<string, number>,
  ): number | null {
    if (row.productAttributeId && variantesById.has(row.productAttributeId)) {
      return variantesById.get(row.productAttributeId) ?? null;
    }

    const normalizedSku = this.normalizeInventorySku(row.productReference);
    if (normalizedSku && variantesBySku.has(normalizedSku)) {
      return variantesBySku.get(normalizedSku) ?? null;
    }

    const normalizedEan = this.normalizeOptionalText(
      row.productEan13 ?? undefined,
    );
    if (normalizedEan && variantesByEan.has(normalizedEan)) {
      return variantesByEan.get(normalizedEan) ?? null;
    }

    return null;
  }

  private normalizeInventorySku(value: string | null): string | null {
    const normalized = this.normalizeOptionalText(value ?? undefined);
    return normalized ? normalized.toUpperCase() : null;
  }

  private isValueWithinRange(
    value: number,
    min: number | null,
    max: number | null,
  ): boolean {
    const minValue = min ?? Number.NEGATIVE_INFINITY;
    const maxValue = max ?? Number.POSITIVE_INFINITY;
    return value >= minValue && value <= maxValue;
  }

  private extractKoajFullOrder(
    payload: unknown,
  ): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const root = payload as Record<string, unknown>;
    if (
      root.order &&
      typeof root.order === 'object' &&
      !Array.isArray(root.order)
    ) {
      return root.order as Record<string, unknown>;
    }

    if (Array.isArray(root.orders) && root.orders.length > 0) {
      const first = root.orders[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        return first as Record<string, unknown>;
      }
    }

    return null;
  }

  private extractKoajOrderRows(
    order: Record<string, unknown>,
  ): KoajFullOrderRow[] {
    const associations = order.associations;
    if (
      !associations ||
      typeof associations !== 'object' ||
      Array.isArray(associations)
    ) {
      return [];
    }

    const orderRows = (associations as Record<string, unknown>).order_rows;
    if (!Array.isArray(orderRows)) {
      return [];
    }

    const rows: KoajFullOrderRow[] = [];
    for (const rawRow of orderRows) {
      if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
        continue;
      }

      const row = rawRow as Record<string, unknown>;
      rows.push({
        productAttributeId: this.toNumber(row.product_attribute_id),
        productReference: this.normalizeOptionalText(
          typeof row.product_reference === 'string'
            ? row.product_reference
            : undefined,
        ),
        productEan13: this.normalizeOptionalText(
          typeof row.product_ean13 === 'string' ? row.product_ean13 : undefined,
        ),
        productQuantity: this.toNumber(row.product_quantity) ?? 1,
      });
    }

    return rows;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return null;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private truncate(value: string, maxLength: number): string;
  private truncate(value: string | null, maxLength: number): string | null;
  private truncate(value: string | null, maxLength: number): string | null {
    if (!value) {
      return null;
    }
    return value.length > maxLength ? value.slice(0, maxLength) : value;
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
