import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../src/auth/useAuth';
import { listOrders } from '../../../src/orders/orders.api';
import { OrderDetailModal } from './OrderDetailModal';
import { OrdersShell } from './OrdersShell';
import { OrdersTable, type OrderRow, type OrdersFilters } from './OrdersTable';

/**
 * OrdersPage
 * ----------
 * - Consume pedidos reales desde API backend (/orders)
 * - Mantiene filtros en estado
 * - Filtra en cliente cuando el usuario da click en Buscar
 */
export function OrdersPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [rowsAll, setRowsAll] = useState<OrderRow[]>([]);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [filters, setFilters] = useState<OrdersFilters>({
    id: '',
    reference: '',
    origin: '',
    newCustomer: '',
    delivery: '',
    customer: '',
    total: '',
    payment: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    async function loadOrdersFromApi() {
      if (!accessToken) {
        setLoadError('Sesion no disponible');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const response = await listOrders(accessToken);
        const nextRows = mapApiOrdersToRows(response);

        setRowsAll(nextRows);
        setRows(nextRows);
        setLoadError('');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo cargar pedidos';
        setLoadError(message);
        setRowsAll([]);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrdersFromApi();
  }, [accessToken, isAuthLoading]);

  const total = useMemo(() => rows.length, [rows]);

  const onSearch = () => {
    const next = rowsAll.filter((r) => {
      const idOk = !filters.id || r.id.toLowerCase().includes(filters.id.toLowerCase());
      const refOk =
        !filters.reference ||
        r.reference.toLowerCase().includes(filters.reference.toLowerCase());
      const originOk =
        !filters.origin || r.origin.toLowerCase().includes(filters.origin.toLowerCase());
      const newOk = !filters.newCustomer || r.newCustomer === filters.newCustomer;
      const delOk =
        !filters.delivery || r.delivery.toLowerCase().includes(filters.delivery.toLowerCase());
      const customerOk =
        !filters.customer || r.customer.toLowerCase().includes(filters.customer.toLowerCase());
      const totalOk =
        !filters.total || r.total.toLowerCase().includes(filters.total.toLowerCase());
      const payOk =
        !filters.payment || r.payment.toLowerCase().includes(filters.payment.toLowerCase());
      const statusOk = !filters.status || r.status === filters.status;

      const rowDateOnly = r.date.substring(0, 10);
      const fromOk = !filters.dateFrom || rowDateOnly >= filters.dateFrom;
      const toOk = !filters.dateTo || rowDateOnly <= filters.dateTo;

      return (
        idOk &&
        refOk &&
        originOk &&
        newOk &&
        delOk &&
        customerOk &&
        totalOk &&
        payOk &&
        statusOk &&
        fromOk &&
        toOk
      );
    });

    setRows(next);
  };

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

  const openDetail = (row: OrderRow) => {
    setSelectedOrder(row);
    setDetailOpen(true);
  };

  const clearFilters = () => {
    const empty: OrdersFilters = {
      id: '',
      reference: '',
      origin: '',
      newCustomer: '',
      delivery: '',
      customer: '',
      total: '',
      payment: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    };

    setFilters(empty);
    setRows(rowsAll);
  };

  return (
    <OrdersShell
      title="Pedidos"
      total={total}
      onOpenSettings={() => alert('Configuracion (pendiente)')}
    >
      {isLoading && <p>Cargando pedidos desde API...</p>}
      {loadError && <p style={{ color: '#b00020' }}>{loadError}</p>}

      <OrdersTable
        rows={rows}
        filters={filters}
        onChangeFilters={setFilters}
        onSearch={onSearch}
        onClear={clearFilters}
        onView={openDetail}
      />

      <OrderDetailModal
        open={detailOpen}
        order={selectedOrder}
        onClose={() => setDetailOpen(false)}
      />
    </OrdersShell>
  );
}

function normalizeNewCustomer(value: string): OrderRow['newCustomer'] {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'no') {
    return 'No';
  }

  return 'S\u00ED';
}

function normalizeStatus(value: string): OrderRow['status'] {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'entregado') {
    return 'Entregado';
  }
  if (normalized === 'con novedad') {
    return 'Con novedad';
  }
  if (normalized === 'preparacion en curso' || normalized === 'preparaci\u00F3n en curso') {
    return 'Preparaci\u00F3n en curso';
  }

  return 'Asignado';
}

function mapApiOrdersToRows(items: Awaited<ReturnType<typeof listOrders>>): OrderRow[] {
  return items.map((item) => ({
    pedidoId: item.pedidoId,
    id: item.id,
    reference: item.reference,
    origin: item.origenLabel || item.origin || '-',
    newCustomer: normalizeNewCustomer(item.newCustomer),
    delivery: item.delivery,
    customer: item.customer,
    total: item.total,
    payment: item.payment,
    status: normalizeStatus(item.status),
    date: item.date,
  }));
}
