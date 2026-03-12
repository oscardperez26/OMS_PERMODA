import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import type { PedidoDetail } from './orders.types';

function buildPedidoDetail(empresaClienteId: number | null): PedidoDetail {
  return {
    pedidoId: 1,
    numeroPedido: 'KOAJ-1',
    numeroExterno: '1',
    estado: {
      estadoId: 1,
      codigo: 'ASIGNADO',
      nombre: 'Asignado',
    },
    cliente: {
      nombre: 'Cliente Demo',
      documento: null,
      email: null,
      telefono: null,
    },
    shipping: {
      direccion: 'Calle 1',
      barrio: null,
      zip: null,
      ciudadId: 1,
      ciudad: 'Bogota',
      paisId: 1,
      pais: 'Colombia',
    },
    totales: {
      subtotal: 10000,
      descuento: 0,
      impuestos: 0,
      costoEnvio: 0,
      total: 10000,
      monedaId: 1,
      monedaCodigo: 'COP',
      monedaNombre: 'Peso Colombiano',
    },
    tiendaOrigen: {
      tiendaId: 2,
      codigo: 'T2',
      nombre: 'Tienda 2',
      activa: true,
      empresaClienteId,
    },
    empresaId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
}

describe('OrdersService scope rules', () => {
  const repository = {
    listPedidos: jest.fn(),
    findPedidoDetailById: jest.fn(),
    findStoreScopeByUserStoreId: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.listPedidos.mockResolvedValue([]);
    service = new OrdersService(configService, repository as never);
  });

  it('applies franquicia scope in listOrders for panel users with EmpresaClienteId', async () => {
    await service.listOrders({
      role: 'ADMIN',
      storeId: undefined,
      empresaClienteId: '7',
      permissions: ['orders.read'],
    });

    expect(repository.listPedidos).toHaveBeenCalledWith({
      empresaClienteId: 7,
    });
  });

  it('keeps global scope only for super admin (empresaClienteId null + security.manage)', async () => {
    await service.listOrders({
      role: 'ADMIN',
      storeId: undefined,
      empresaClienteId: undefined,
      permissions: ['security.manage', 'orders.read'],
    });

    expect(repository.listPedidos).toHaveBeenCalledWith(undefined);
  });

  it('blocks panel users without franquicia when they are not super admin', async () => {
    await expect(
      service.listOrders({
        role: 'PANEL_READONLY',
        storeId: undefined,
        empresaClienteId: undefined,
        permissions: ['orders.read'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks order detail access across franquicias', async () => {
    repository.findPedidoDetailById.mockResolvedValue(buildPedidoDetail(99));

    await expect(
      service.getOrderDetail(1, {
        role: 'ADMIN',
        storeId: undefined,
        empresaClienteId: '7',
        permissions: ['orders.read'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps store scope behavior for tienda roles', async () => {
    repository.findStoreScopeByUserStoreId.mockResolvedValue({
      tiendaId: 2,
      codigo: 'T2',
      nombre: 'Tienda 2',
    });

    await service.listOrders({
      role: 'STORE_ADMIN',
      storeId: '2',
      empresaClienteId: undefined,
      permissions: ['orders.read'],
    });

    expect(repository.listPedidos).toHaveBeenCalledWith({
      tiendaOrigenId: 2,
    });
  });
});
