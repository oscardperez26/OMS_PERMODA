import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/useAuth';
import { listOrders, type OrdersListItem } from '../../../orders/orders.api';

const REFRESH_INTERVAL_MS = 60_000;
const MAX_ITEMS = 5;
const MAX_DISMISSED_ITEMS = 500;
const DISMISSED_FALLBACK_USER_KEY = 'anonymous';

type BellState = {
  isLoading: boolean;
  error: string;
  assignedOrders: OrdersListItem[];
};

const INITIAL_STATE: BellState = {
  isLoading: true,
  error: '',
  assignedOrders: [],
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isAssignedStatus(status: string): boolean {
  const normalizedStatus = normalizeText(status);
  return (
    normalizedStatus === 'ASIGNADO' ||
    normalizedStatus === 'PREPARACION EN CURSO'
  );
}

function toTimestamp(value: string): number {
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function buildDismissedStorageKey(userId?: string): string {
  return `koaj:store-notifications:dismissed:${userId ?? DISMISSED_FALLBACK_USER_KEY}`;
}

function normalizeOrderId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function parseDismissedOrderIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .map((value) => normalizeOrderId(value))
      .filter((value): value is string => value !== null);

    return [...new Set(normalized)].slice(-MAX_DISMISSED_ITEMS);
  } catch {
    return [];
  }
}

export function StoreNotificationsBell() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dismissedOrderIdsRef = useRef<string[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<BellState>(INITIAL_STATE);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([]);
  const [isDismissedHydrated, setIsDismissedHydrated] = useState(false);

  const dismissedStorageKey = useMemo(
    () => buildDismissedStorageKey(user?.id),
    [user?.id],
  );

  const persistDismissedOrderIds = useCallback(
    (orderIds: string[]) => {
      localStorage.setItem(
        dismissedStorageKey,
        JSON.stringify(orderIds.slice(-MAX_DISMISSED_ITEMS)),
      );
    },
    [dismissedStorageKey],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsDismissedHydrated(false);
      const fallbackStorageKey = buildDismissedStorageKey();
      const fallbackDismissed = parseDismissedOrderIds(
        localStorage.getItem(fallbackStorageKey),
      );
      const currentDismissed = parseDismissedOrderIds(
        localStorage.getItem(dismissedStorageKey),
      );
      const mergedDismissed = [...new Set([...fallbackDismissed, ...currentDismissed])]
        .slice(-MAX_DISMISSED_ITEMS);

      dismissedOrderIdsRef.current = mergedDismissed;
      setDismissedOrderIds(mergedDismissed);

      if (
        user?.id &&
        dismissedStorageKey !== fallbackStorageKey &&
        fallbackDismissed.length > 0
      ) {
        localStorage.removeItem(fallbackStorageKey);
      }

      setIsDismissedHydrated(true);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [dismissedStorageKey, user?.id]);

  useEffect(() => {
    if (!isDismissedHydrated) {
      return;
    }
    dismissedOrderIdsRef.current = dismissedOrderIds;
    persistDismissedOrderIds(dismissedOrderIds);
  }, [dismissedOrderIds, isDismissedHydrated, persistDismissedOrderIds]);

  const loadAssignedOrders = useCallback(async () => {
    if (!isDismissedHydrated) {
      return;
    }

    if (!accessToken) {
      setState({
        isLoading: false,
        error: 'Sesion no disponible',
        assignedOrders: [],
      });
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: '',
    }));

    try {
      const orders = await listOrders(accessToken);
      const dismissedSet = new Set(dismissedOrderIdsRef.current);
      const assignedOrders = orders
        .filter((order) => isAssignedStatus(order.status))
        .filter((order) => {
          const orderId = normalizeOrderId(order.pedidoId);
          return orderId !== null && !dismissedSet.has(orderId);
        })
        .sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date));

      setState({
        isLoading: false,
        error: '',
        assignedOrders,
      });
    } catch (error) {
      setState({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'No se pudieron cargar notificaciones',
        assignedOrders: [],
      });
    }
  }, [accessToken, isDismissedHydrated]);

  useEffect(() => {
    if (!isDismissedHydrated) {
      return;
    }
    const timeoutId = setTimeout(() => {
      void loadAssignedOrders();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isDismissedHydrated, loadAssignedOrders]);

  useEffect(() => {
    if (!isDismissedHydrated) {
      return;
    }
    const intervalId = setInterval(() => {
      void loadAssignedOrders();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isDismissedHydrated, loadAssignedOrders]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (rootRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const topOrders = useMemo(
    () => state.assignedOrders.slice(0, MAX_ITEMS),
    [state.assignedOrders],
  );

  const totalAssigned = state.assignedOrders.length;

  const handleOpenOrder = (pedidoId: number) => {
    const normalizedOrderId = normalizeOrderId(pedidoId);
    if (!normalizedOrderId) {
      navigate(`/tienda/orders/${pedidoId}`);
      return;
    }

    setDismissedOrderIds((previous) => {
      if (previous.includes(normalizedOrderId)) {
        return previous;
      }
      const nextDismissed = [...previous, normalizedOrderId].slice(-MAX_DISMISSED_ITEMS);
      dismissedOrderIdsRef.current = nextDismissed;
      persistDismissedOrderIds(nextDismissed);
      return nextDismissed;
    });
    setState((previous) => ({
      ...previous,
      assignedOrders: previous.assignedOrders.filter(
        (order) => normalizeOrderId(order.pedidoId) !== normalizedOrderId,
      ),
    }));
    setIsOpen(false);
    navigate(`/tienda/orders/${pedidoId}`);
  };

  return (
    <div className="store-notifications" ref={rootRef}>
      <button
        className="btn-koaj-outline store-notifications-trigger"
        title="Notificaciones de pedidos asignados"
        onClick={() => setIsOpen((previous) => !previous)}
        type="button"
      >
        <i className="bi bi-bell-fill"></i>
        {totalAssigned > 0 && (
          <span className="store-notifications-badge" aria-label={`${totalAssigned} pedidos asignados`}>
            {totalAssigned > 99 ? '99+' : totalAssigned}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="store-notifications-popover" role="dialog" aria-label="Notificaciones de pedidos">
          <div className="store-notifications-header">
            <div className="store-notifications-title">Pedidos ({totalAssigned})</div>
            <button
              className="store-notifications-refresh"
              title="Actualizar"
              onClick={() => void loadAssignedOrders()}
              disabled={state.isLoading}
              type="button"
            >
              <i className={`bi ${state.isLoading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`}></i>
            </button>
          </div>

          <div className="store-notifications-body">
            {state.isLoading && (
              <div className="store-notifications-feedback">Cargando notificaciones...</div>
            )}

            {!state.isLoading && state.error && (
              <div className="store-notifications-feedback store-notifications-feedback-error">
                {state.error}
              </div>
            )}

            {!state.isLoading && !state.error && topOrders.length === 0 && (
              <div className="store-notifications-feedback">
                No hay pedidos asignados en este momento.
              </div>
            )}

            {!state.isLoading && !state.error && topOrders.length > 0 && (
              <ul className="store-notifications-list">
                {topOrders.map((order) => (
                  <li key={`${order.pedidoId}-${order.id}`}>
                    <button
                      className="store-notifications-item store-notifications-item-unread"
                      onClick={() => handleOpenOrder(order.pedidoId)}
                      type="button"
                    >
                      <div className="store-notifications-item-row">
                        <span className="store-notifications-item-id-wrap">
                          <span className="store-notifications-item-dot" aria-hidden="true"></span>
                          <span className="store-notifications-item-id">#{order.pedidoId}</span>
                        </span>
                        <span className="store-notifications-item-total">{order.total}</span>
                      </div>
                      <div className="store-notifications-item-customer">{order.customer}</div>
                      <div className="store-notifications-item-delivery">
                        Entrega: {order.delivery || 'Pendiente'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
