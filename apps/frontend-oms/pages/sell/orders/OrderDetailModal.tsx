import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../src/auth/AuthContext';
import { getOrderDetail, type OrderDetail as ApiOrderDetail } from '../../../src/orders/orders.api';
import { ROUTES } from '../../../src/routes/routes';
import type { OrderRow } from './OrdersTable';
import './order-detail-modal.css';

type LegacyDetail = NonNullable<OrderRow['detail']>;

function mapApiDetailToLegacy(detail: ApiOrderDetail): LegacyDetail {
  const shippingAddressLines = [
    detail.cliente.nombre,
    detail.shipping.direccion,
    detail.shipping.barrio,
    detail.shipping.ciudad,
    detail.shipping.pais,
    detail.shipping.zip ? `ZIP ${detail.shipping.zip}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    shippingCarrier: 'Por definir',
    trackingNumber: '-',
    shippingAddress: shippingAddressLines.join('\n') || '-',
    billingEmail: detail.cliente.email ?? '-',
    billingName: detail.cliente.nombre || '-',
    billingAddress: shippingAddressLines.join('\n') || '-',
    items: [],
  };
}

export function OrderDetailModal({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [apiDetail, setApiDetail] = useState<ApiOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!open || !order) {
      setApiDetail(null);
      setIsLoading(false);
      setLoadError('');
      return;
    }

    if (!accessToken) {
      setApiDetail(null);
      setIsLoading(false);
      setLoadError('Sesion no disponible');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError('');

    void getOrderDetail(accessToken, order.pedidoId)
      .then((detail) => {
        if (cancelled) {
          return;
        }
        setApiDetail(detail);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setApiDetail(null);
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el detalle');
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, order, accessToken]);

  const detail = useMemo(() => {
    if (order?.detail) {
      return order.detail;
    }
    if (apiDetail) {
      return mapApiDetailToLegacy(apiDetail);
    }
    return null;
  }, [order, apiDetail]);

  if (!open || !order) {
    return null;
  }

  return (
    <div className="odm-backdrop" onClick={onClose}>
      <div className="odm-panel odm-panel-wide" onClick={(event) => event.stopPropagation()}>
        <div className="odm-header">
          <div>
            <div className="odm-title">Pedido #{order.id}</div>
            <div className="odm-subtitle">
              Ref: <b>{order.reference}</b> | Estado: <b>{order.status}</b> | Fecha: <b>{order.date}</b>
            </div>
          </div>

          <button className="odm-close" onClick={onClose} type="button" aria-label="Cerrar">
            x
          </button>
        </div>

        <div className="odm-body">
          {isLoading && <div className="odm-muted">Cargando detalle...</div>}
          {!isLoading && loadError && <div className="odm-muted">{loadError}</div>}

          {!isLoading && !detail ? (
            <div className="odm-muted">Detalle no disponible.</div>
          ) : null}

          {!isLoading && detail ? (
            <div className="odm-like-oms">
              <section className="odm-col">
                <div className="odm-block-title">Transportista</div>
                <div className="odm-line">
                  <b>Transportista:</b> {detail.shippingCarrier}
                </div>
                <div className="odm-line">
                  <b>Numero de seguimiento:</b> {detail.trackingNumber || '-'}
                </div>

                <div className="odm-block-title odm-mt">Detalles del envio</div>
                <pre className="odm-pre">{detail.shippingAddress}</pre>
              </section>

              <section className="odm-col">
                <div className="odm-block-title">Email</div>
                <div className="odm-line">{detail.billingEmail}</div>

                <div className="odm-block-title odm-mt">Detalles de facturacion</div>
                <div className="odm-line">{detail.billingName}</div>
                <pre className="odm-pre">{detail.billingAddress}</pre>
              </section>

              <section className="odm-col odm-col-products">
                <div className="odm-products-head">
                  <div className="odm-block-title">Productos ({detail.items.length})</div>
                </div>

                <table className="odm-products-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Referencia</th>
                      <th className="right">Cantidad</th>
                      <th className="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="odm-muted">
                          Sin items en esta vista.
                        </td>
                      </tr>
                    ) : (
                      detail.items.slice(0, 12).map((item, index) => (
                        <tr key={`${item.reference}-${index}`}>
                          <td className="odm-product-name">{item.name}</td>
                          <td>{item.reference}</td>
                          <td className="right">{item.quantity}</td>
                          <td className="right">{item.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="odm-products-actions">
                  <button
                    className="odm-open-details"
                    type="button"
                    onClick={() => navigate(`${ROUTES.SELL_ORDERS}/${order.pedidoId}`)}
                  >
                    Abrir detalles
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          <div className="odm-footer">
            <button className="odm-primary" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
