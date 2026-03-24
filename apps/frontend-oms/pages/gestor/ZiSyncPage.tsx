import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  getZiOpsStatus,
  syncZiCategorias,
  syncZiFull,
  syncZiProducto,
  ZiCatalogApiError,
  type ZiOpsStatus,
} from '../../src/configuracion-general/zi-catalog.api';
import { ROUTES } from '../../src/routes/routes';
import './IntegracionesEntrantesPage.css';

type ZiCompatibilityState = 'loading' | 'ok' | 'unauthorized' | 'not_found' | 'error';

function toLocalDate(value?: string | null): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleString('es-CO');
}

function toDurationLabel(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '-';
  }
  return `${Math.floor(value)} ms`;
}

function toOpsBadgeClass(status?: string | null): string {
  if (status === 'OK') {
    return 'integraciones-ops-badge-ok';
  }
  if (status === 'WARN') {
    return 'integraciones-ops-badge-warn';
  }
  if (status === 'ERROR') {
    return 'integraciones-ops-badge-error';
  }
  return 'integraciones-ops-badge-neutral';
}

function getCompatibilityLabel(state: ZiCompatibilityState): string {
  if (state === 'loading') {
    return 'Cargando';
  }
  if (state === 'ok') {
    return 'Compatible';
  }
  if (state === 'unauthorized') {
    return 'Sin acceso';
  }
  if (state === 'not_found') {
    return 'No desplegado';
  }
  return 'Error';
}

function getCompatibilityBadge(state: ZiCompatibilityState): string {
  if (state === 'ok') {
    return toOpsBadgeClass('OK');
  }
  if (state === 'unauthorized' || state === 'not_found') {
    return toOpsBadgeClass('WARN');
  }
  if (state === 'error') {
    return toOpsBadgeClass('ERROR');
  }
  return toOpsBadgeClass(null);
}

function resolveCompatibilityState(error: unknown): {
  state: Exclude<ZiCompatibilityState, 'loading' | 'ok'>;
  message: string;
} {
  if (error instanceof ZiCatalogApiError) {
    if (error.status === 401 || error.status === 403) {
      return {
        state: 'unauthorized',
        message:
          'Sesion o permisos insuficientes para consultar ZI. Reingresa o valida permisos config.read/config.manage.',
      };
    }
    if (error.status === 404) {
      return {
        state: 'not_found',
        message:
          'Backend desplegado sin modulo ZI actualizado. Despliega la version de backend con /catalogo-zi antes de usar sync one-click.',
      };
    }
    return {
      state: 'error',
      message:
        error.message || `No se pudo consultar el estado ZI (HTTP ${error.status}).`,
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return { state: 'error', message: error.message };
  }

  return {
    state: 'error',
    message: 'No se pudo consultar el estado operativo de ZI.',
  };
}

export function ZiSyncPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [compatibility, setCompatibility] = useState<ZiCompatibilityState>('loading');
  const [compatibilityMessage, setCompatibilityMessage] = useState(
    'Validando compatibilidad de backend para ZI...',
  );
  const [ziOps, setZiOps] = useState<ZiOpsStatus | null>(null);
  const [ziActionLoading, setZiActionLoading] = useState<
    'full' | 'categorias' | 'producto' | null
  >(null);
  const [ziProductoId, setZiProductoId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const actionsDisabled = ziActionLoading !== null || compatibility !== 'ok' || !canManage;

  async function loadZiOpsStatus() {
    if (!accessToken) {
      setCompatibility('unauthorized');
      setCompatibilityMessage('Sesion no disponible para consultar estado ZI.');
      setZiOps(null);
      return;
    }

    setCompatibility('loading');
    setCompatibilityMessage('Validando compatibilidad de backend para ZI...');
    setError('');

    try {
      const payload = await getZiOpsStatus(accessToken);
      setZiOps(payload);
      setCompatibility('ok');
      setCompatibilityMessage('Backend compatible para operaciones ZI one-click.');
    } catch (requestError) {
      const resolved = resolveCompatibilityState(requestError);
      setZiOps(null);
      setCompatibility(resolved.state);
      setCompatibilityMessage(resolved.message);
    }
  }

  useEffect(() => {
    void loadZiOpsStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function runAction(action: 'full' | 'categorias' | 'producto') {
    if (!accessToken) {
      setError('Sesion no disponible.');
      return;
    }
    if (!canManage) {
      setError('No tienes permisos para ejecutar sincronizaciones ZI.');
      return;
    }
    if (compatibility !== 'ok') {
      setError(
        'Sincronizacion deshabilitada: el backend actual no es compatible o no expone los endpoints ZI.',
      );
      return;
    }

    if (action === 'producto') {
      const productoId = Number(ziProductoId);
      if (!Number.isInteger(productoId) || productoId <= 0) {
        setError('Producto ZI debe ser un numero entero mayor a 0.');
        return;
      }
    }

    setZiActionLoading(action);
    setError('');
    setSuccess('');

    try {
      if (action === 'full') {
        await syncZiFull(accessToken);
        setSuccess('Sincronizacion ZI full ejecutada correctamente.');
      } else if (action === 'categorias') {
        await syncZiCategorias(accessToken);
        setSuccess('Sincronizacion de categorias ZI ejecutada correctamente.');
      } else {
        const productoId = Number(ziProductoId);
        await syncZiProducto(accessToken, productoId);
        setSuccess(`Sincronizacion puntual del producto ZI ${productoId} completada.`);
      }
      await loadZiOpsStatus();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo ejecutar la sincronizacion ZI.';
      setError(message);
    } finally {
      setZiActionLoading(null);
    }
  }

  return (
    <section className="integraciones-entrantes-page">
      <header className="integraciones-entrantes-header">
        <div>
          <h1>Sincronizacion ZI</h1>
          <p>Operacion one-click del catalogo ZI, separada del flujo de pedidos entrantes.</p>
        </div>
        <Link
          to={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PAGOS_INTEGRACIONES}
          className="transportadora-back-link"
        >
          Volver a Pagos e Integraciones
        </Link>
      </header>

      {error && <p className="integraciones-entrantes-error">{error}</p>}
      {success && <p className="integraciones-entrantes-success">{success}</p>}

      <article className="integraciones-entrantes-card">
        <div className="integraciones-ops-header">
          <h2>Compatibilidad del Backend</h2>
          <span className={`integraciones-ops-badge ${getCompatibilityBadge(compatibility)}`}>
            {getCompatibilityLabel(compatibility)}
          </span>
        </div>

        <p className="integraciones-entrantes-help">{compatibilityMessage}</p>

        {canManage && (
          <div className="integraciones-ops-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={actionsDisabled}
              onClick={() => void runAction('full')}
            >
              {ziActionLoading === 'full' ? 'Sincronizando...' : 'Sync ZI Full'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={actionsDisabled}
              onClick={() => void runAction('categorias')}
            >
              {ziActionLoading === 'categorias' ? 'Sincronizando...' : 'Sync ZI Categorias'}
            </button>
            <div className="integraciones-ops-product-sync">
              <input
                type="number"
                min={1}
                placeholder="Producto ZI ID"
                value={ziProductoId}
                onChange={(event) => setZiProductoId(event.target.value)}
                disabled={actionsDisabled}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={actionsDisabled}
                onClick={() => void runAction('producto')}
              >
                {ziActionLoading === 'producto' ? 'Sincronizando...' : 'Sync ZI Producto'}
              </button>
            </div>
          </div>
        )}
      </article>

      <article className="integraciones-entrantes-card">
        <h2>Checklist de Despliegue</h2>
        <p className="integraciones-entrantes-help">
          Antes de habilitar este modulo en produccion, confirma estas variables en backend:
        </p>
        <ul>
          <li>
            <strong>KOAJ_PS_WS_KEY</strong> para evitar fallos de sincronizacion KOAJ.
          </li>
          <li>
            <strong>ZI_SYNC_ENABLED</strong> para autosync ZI.
          </li>
          <li>
            <strong>INBOUND_SYNC_JOB_ENABLED</strong> para autosync de pedidos entrantes.
          </li>
          <li>
            <strong>FRONTEND_ORIGIN</strong> para CORS correcto del frontend.
          </li>
        </ul>
      </article>

      {ziOps && (
        <article className="integraciones-entrantes-card">
          <div className="integraciones-ops-header">
            <h2>Estado Operativo ZI</h2>
            <span className={`integraciones-ops-badge ${toOpsBadgeClass(ziOps.status)}`}>
              {ziOps.status}
            </span>
          </div>

          <p className="integraciones-entrantes-help">{ziOps.message}</p>

          <div className="integraciones-entrantes-detail-grid">
            <div>
              <span>Autosync ZI</span>
              <strong>{ziOps.jobs.zi.enabled ? 'Activo' : 'Inactivo'}</strong>
              <small>
                Stock {ziOps.jobs.zi.cron.stock} | Precios {ziOps.jobs.zi.cron.precios} |
                Productos {ziOps.jobs.zi.cron.productos}
              </small>
            </div>
            <div>
              <span>Configuracion ZI</span>
              <strong>
                Empresa {ziOps.jobs.zi.config.empresaId} | Batch {ziOps.jobs.zi.config.batchSize}
              </strong>
            </div>
            <div>
              <span>Ultima corrida ZI</span>
              <strong>{toLocalDate(ziOps.healthSummary.lastRunAt)}</strong>
              <small>Estado: {ziOps.healthSummary.lastStatus}</small>
            </div>
            <div>
              <span>Resumen 24h</span>
              <strong>
                Total {ziOps.healthSummary.runs24h.total} | OK {ziOps.healthSummary.runs24h.ok} |
                Error {ziOps.healthSummary.runs24h.error}
              </strong>
            </div>
            <div className="integraciones-entrantes-detail-full">
              <span>Ultimo error ZI</span>
              <strong>{ziOps.healthSummary.lastError ?? '-'}</strong>
            </div>
          </div>

          {ziOps.alerts.length > 0 && (
            <div className="integraciones-ops-alerts">
              {ziOps.alerts.map((alert) => (
                <div key={`${alert.code}-${alert.level}`} className="integraciones-ops-alert-item">
                  <span className={`integraciones-ops-badge ${toOpsBadgeClass(alert.level)}`}>
                    {alert.level}
                  </span>
                  <strong>{alert.code}</strong>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          <h3>Ultimas corridas ZI</h3>
          {ziOps.ziLastRuns.length === 0 ? (
            <p className="integraciones-entrantes-loading">No hay corridas ZI registradas.</p>
          ) : (
            <div className="integraciones-entrantes-table-wrap">
              <table className="integraciones-entrantes-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Entidad</th>
                    <th>Producto ZI</th>
                    <th>Estado</th>
                    <th>Duracion</th>
                    <th>Registros</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {ziOps.ziLastRuns.map((run) => (
                    <tr key={`${run.createdAt}-${run.entity}-${run.productoZiId}`}>
                      <td>{toLocalDate(run.createdAt)}</td>
                      <td>{run.entity}</td>
                      <td>{run.productoZiId}</td>
                      <td>
                        <span
                          className={`integraciones-ops-badge ${toOpsBadgeClass(
                            run.status === 'ok' ? 'OK' : 'ERROR',
                          )}`}
                        >
                          {run.status === 'ok' ? 'OK' : 'ERROR'}
                        </span>
                      </td>
                      <td>{toDurationLabel(run.durationMs)}</td>
                      <td>{run.recordsUpdated}</td>
                      <td>{run.error ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
