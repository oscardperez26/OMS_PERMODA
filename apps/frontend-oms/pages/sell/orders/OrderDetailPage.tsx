import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../src/auth/AuthContext';
import {
  confirmOrderAssignment,
  getOrderDetail,
  previewOrderAssignment,
  type AssignmentConfirmResponse,
  type AssignmentPreviewResponse,
  type OrderDetail,
} from '../../../src/orders/orders.api';
import { ROUTES } from '../../../src/routes/routes';

export function OrderDetailPage() {
  const { id } = useParams();
  const { accessToken, isLoading: isAuthLoading, hasPermissions } = useAuth();
  const canManage = hasPermissions(['orders.manage']);

  const pedidoId = useMemo(() => {
    const parsed = Number(id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [id]);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [preview, setPreview] = useState<AssignmentPreviewResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<AssignmentConfirmResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    async function loadDetail() {
      if (!pedidoId) {
        setLoadError('Id de pedido invalido');
        setIsLoading(false);
        return;
      }
      if (!accessToken) {
        setLoadError('Sesion no disponible');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const detail = await getOrderDetail(accessToken, pedidoId);
        setOrder(detail);
      } catch (error) {
        setOrder(null);
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el pedido');
      } finally {
        setIsLoading(false);
      }
    }

    void loadDetail();
  }, [accessToken, isAuthLoading, pedidoId]);

  async function loadPreview() {
    if (!accessToken || !pedidoId) {
      return;
    }

    setPreviewError('');
    setIsPreviewing(true);
    try {
      const result = await previewOrderAssignment(accessToken, pedidoId);
      setPreview(result);
    } catch (error) {
      setPreview(null);
      setPreviewError(
        error instanceof Error ? error.message : 'No se pudo calcular la previsualizacion',
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleConfirmAssignment() {
    if (!accessToken || !pedidoId) {
      setConfirmError('Sesion o pedido no disponible');
      return;
    }

    setIsConfirming(true);
    setConfirmError('');

    try {
      const result = await confirmOrderAssignment(accessToken, pedidoId);
      setConfirmResult(result);

      const refreshed = await getOrderDetail(accessToken, pedidoId);
      setOrder(refreshed);

      try {
        const refreshedPreview = await previewOrderAssignment(accessToken, pedidoId);
        setPreview(refreshedPreview);
      } catch {
        // Preview refresh is best-effort after confirm.
      }
    } catch (error) {
      setConfirmError(
        error instanceof Error ? error.message : 'No se pudo confirmar la asignacion',
      );
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="odp-page">
      <div className="odp-topbar">
        <div>
          <h1 className="odp-title">Detalle del pedido</h1>
          <div className="odp-subtitle">Pedido local #{pedidoId ?? '-'}</div>
        </div>

        <div className="odp-actions">
          <Link className="odp-back" to={ROUTES.SELL_ORDERS}>
            Volver a pedidos
          </Link>
        </div>
      </div>

      {isLoading && <p className="odp-info">Cargando detalle...</p>}
      {loadError && <p className="odp-error">{loadError}</p>}

      {!isLoading && order && (
        <>
          <div className="odp-grid">
            <section className="odp-card">
              <h3>Cabecera</h3>
              <p>
                <b>Numero pedido:</b> {order.numeroPedido}
              </p>
              <p>
                <b>Numero externo:</b> {order.numeroExterno ?? '-'}
              </p>
              <p>
                <b>Estado actual:</b> {order.estado.nombre ?? '-'}
              </p>
              <p>
                <b>Tienda origen:</b> {formatStore(order)}
              </p>
              <p>
                <b>Creado:</b> {formatDateTime(order.createdAt)}
              </p>
              <p>
                <b>Actualizado:</b> {formatDateTime(order.updatedAt)}
              </p>
            </section>

            <section className="odp-card">
              <h3>Cliente y envio</h3>
              <p>
                <b>Cliente:</b> {order.cliente.nombre}
              </p>
              <p>
                <b>Email:</b> {order.cliente.email ?? '-'}
              </p>
              <p>
                <b>Telefono:</b> {order.cliente.telefono ?? '-'}
              </p>
              <p>
                <b>Pais / Ciudad:</b> {order.shipping.pais ?? '-'} / {order.shipping.ciudad ?? '-'}
              </p>
              <pre className="odp-pre">{formatShippingAddress(order)}</pre>
            </section>

            <section className="odp-card">
              <h3>Totales</h3>
              <p>
                <b>Subtotal:</b> {formatMoney(order.totales.subtotal)}
              </p>
              <p>
                <b>Descuento:</b> {formatMoney(order.totales.descuento)}
              </p>
              <p>
                <b>Impuestos:</b> {formatMoney(order.totales.impuestos)}
              </p>
              <p>
                <b>Costo envio:</b> {formatMoney(order.totales.costoEnvio)}
              </p>
              <p>
                <b>Total:</b> {formatMoney(order.totales.total)}
              </p>
              <p>
                <b>Moneda:</b> {order.totales.monedaCodigo ?? '-'}
              </p>
            </section>
          </div>

          <section className="odp-card odp-assignment-card">
            <div className="odp-assignment-head">
              <h3>Asignacion operativa/logistica</h3>
              <div className="odp-actions">
                <button
                  className="odp-btn"
                  type="button"
                  onClick={() => void loadPreview()}
                  disabled={isPreviewing}
                >
                  {isPreviewing ? 'Calculando...' : 'Previsualizar asignacion'}
                </button>

                {canManage && (
                  <button
                    className="odp-btn odp-btn-primary"
                    type="button"
                    onClick={() => void handleConfirmAssignment()}
                    disabled={isConfirming}
                  >
                    {isConfirming ? 'Confirmando...' : 'Confirmar asignacion'}
                  </button>
                )}
              </div>
            </div>

            {!canManage && (
              <p className="odp-info">Solo usuarios con permiso orders.manage pueden confirmar.</p>
            )}

            {previewError && <p className="odp-error">{previewError}</p>}

            {preview && (
              <div className="odp-preview-grid">
                <div>
                  <p>
                    <b>Estrategia:</b> {preview.strategy}
                  </p>
                  <p>
                    <b>Zona envio:</b>{' '}
                    {preview.zonaEnvio
                      ? `${preview.zonaEnvio.nombre} (${preview.zonaEnvio.codigo})`
                      : '-'}
                  </p>
                  <p>
                    <b>Tienda sugerida:</b>{' '}
                    {preview.tiendaSugerida
                      ? `${preview.tiendaSugerida.codigo} - ${preview.tiendaSugerida.nombre}`
                      : '-'}
                  </p>
                  <p>
                    <b>Transportadora sugerida:</b>{' '}
                    {preview.transportadoraSugerida
                      ? `${preview.transportadoraSugerida.codigo} - ${preview.transportadoraSugerida.nombre}`
                      : '-'}
                  </p>
                  <p>
                    <b>Costo sugerido:</b>{' '}
                    {preview.costoSugerido
                      ? `${formatMoney(preview.costoSugerido.costo)} (${preview.costoSugerido.monedaCodigo})`
                      : '-'}
                  </p>
                </div>

                <div>
                  <p>
                    <b>Reglas aplicadas</b>
                  </p>
                  <ul className="odp-list">
                    {preview.reglas.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                  <p>
                    <b>Advertencias</b>
                  </p>
                  {preview.advertencias.length > 0 ? (
                    <ul className="odp-list odp-warning-list">
                      {preview.advertencias.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="odp-info">Sin advertencias.</p>
                  )}
                </div>
              </div>
            )}

            {confirmError && <p className="odp-error">{confirmError}</p>}

            {confirmResult && (
              <div className="odp-confirm-box">
                <p>
                  <b>Confirmacion:</b> {confirmResult.success ? 'OK' : 'Fallida'}
                </p>
                <p>
                  <b>Persistido tienda:</b> {confirmResult.persisted.store ? 'Si' : 'No'}
                </p>
                <p>
                  <b>Persistido estado:</b> {confirmResult.persisted.status ? 'Si' : 'No'}
                </p>
                <p>
                  <b>Carrier en Pedido:</b> {confirmResult.persisted.carrier ? 'Si' : 'No'}
                </p>
                <p>
                  <b>Carrier registrado en log:</b>{' '}
                  {confirmResult.persisted.carrierLogged ? 'Si' : 'No'}
                </p>
                {confirmResult.advertencias.length > 0 && (
                  <>
                    <p>
                      <b>Advertencias confirmacion</b>
                    </p>
                    <ul className="odp-list odp-warning-list">
                      {confirmResult.advertencias.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('es-CO');
}

function formatMoney(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatStore(order: OrderDetail): string {
  if (!order.tiendaOrigen.tiendaId) {
    return '-';
  }
  const code = order.tiendaOrigen.codigo ?? '-';
  const name = order.tiendaOrigen.nombre ?? '-';
  return `${code} - ${name}`;
}

function formatShippingAddress(order: OrderDetail): string {
  const lines = [
    order.shipping.direccion,
    order.shipping.barrio,
    order.shipping.ciudad,
    order.shipping.pais,
    order.shipping.zip ? `ZIP ${order.shipping.zip}` : null,
  ].filter((item): item is string => Boolean(item));

  return lines.length > 0 ? lines.join('\n') : '-';
}
