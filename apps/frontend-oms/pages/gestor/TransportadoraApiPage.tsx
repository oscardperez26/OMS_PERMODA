import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  getTransportadoraApiConfig,
  updateTransportadoraApiConfig,
  type TransportadoraApiConfigDetail,
  type TransportadoraApiPageViewModel,
} from '../../src/configuracion-general/transportadora.api';
import { ROUTES } from '../../src/routes/routes';
import './TransportadoraApiPage.css';

type ApiConfigFormState = {
  baseUrl: string;
  authType: 'API_KEY';
  timeoutMs: string;
  createShipmentEndpoint: string;
  trackingEndpointTemplate: string;
  trackingNumberField: string;
  statusField: string;
  apiKeyPlaintext: string;
};

function mapApiConfigToForm(
  detail: TransportadoraApiConfigDetail,
): ApiConfigFormState {
  return {
    baseUrl: detail.apiConfig.baseUrl ?? '',
    authType: detail.apiConfig.authType ?? 'API_KEY',
    timeoutMs: String(detail.apiConfig.timeoutMs ?? 15000),
    createShipmentEndpoint: detail.apiConfig.createShipmentEndpoint ?? '',
    trackingEndpointTemplate: detail.apiConfig.trackingEndpointTemplate ?? '',
    trackingNumberField: detail.apiConfig.trackingNumberField ?? '',
    statusField: detail.apiConfig.statusField ?? '',
    apiKeyPlaintext: '',
  };
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-CO');
}

export function TransportadoraApiPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [transportadora, setTransportadora] =
    useState<TransportadoraApiPageViewModel | null>(null);
  const [form, setForm] = useState<ApiConfigFormState | null>(null);
  const [initialForm, setInitialForm] = useState<ApiConfigFormState | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyLastRotatedAt, setApiKeyLastRotatedAt] = useState<string | null>(
    null,
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const transportadoraId = Number(id);
  const isReadOnly = !canManage || isSubmitting;

  async function loadData() {
    if (!Number.isInteger(transportadoraId) || transportadoraId <= 0) {
      setError('El id de transportadora no es valido');
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
      try {
      const detail = await getTransportadoraApiConfig(
          accessToken,
          transportadoraId,
        );

        const nextForm = mapApiConfigToForm(detail);

        setTransportadora(detail.transportadora);
        setForm(nextForm);
        setInitialForm(nextForm);
        setHasApiKey(detail.apiConfig.hasApiKey);
        setApiKeyLastRotatedAt(detail.apiConfig.apiKeyLastRotatedAt ?? null);
        setUpdatedAt(detail.apiConfig.updatedAt ?? null);
        setError('');
      } catch (requestError) {
        const message =
          requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar la configuracion API de transportadora';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, transportadoraId]);

  const empresaLabel = useMemo(() => {
    if (!transportadora) {
      return '-';
    }
    return `EmpresaId ${transportadora.empresaId}`;
  }, [transportadora]);

  function goBack() {
    navigate(ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA);
  }

  function handleCancel() {
    if (initialForm) {
      setForm({ ...initialForm, apiKeyPlaintext: '' });
    }
    setError('');
    setSuccess('');
  }

  function handleInputChange<K extends keyof ApiConfigFormState>(
    field: K,
    value: ApiConfigFormState[K],
  ) {
    setForm((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    );
  }

  async function handleSave() {
    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }
    if (!canManage) {
      setError('No tienes permisos para editar esta configuracion');
      return;
    }
    if (!form) {
      setError('No hay datos para guardar');
      return;
    }

    const timeoutMs = Number(form.timeoutMs);
    if (!Number.isInteger(timeoutMs)) {
      setError('Timeout (ms) debe ser un numero entero');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateTransportadoraApiConfig(accessToken, transportadoraId, {
        baseUrl: form.baseUrl.trim() || null,
        authType: form.authType,
        timeoutMs,
        createShipmentEndpoint: form.createShipmentEndpoint.trim() || null,
        trackingEndpointTemplate: form.trackingEndpointTemplate.trim() || null,
        trackingNumberField: form.trackingNumberField.trim() || null,
        statusField: form.statusField.trim() || null,
        ...(form.apiKeyPlaintext.trim()
          ? { apiKeyPlaintext: form.apiKeyPlaintext.trim() }
          : {}),
      });

      setSuccess('Configuracion API guardada correctamente');
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar la configuracion API';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="transportadora-api-page">
      <header className="transportadora-api-header">
        <div>
          <h1>API de Transportadora</h1>
          <p>Configuracion de integracion API por transportadora.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={goBack}>
          Volver al listado
        </button>
      </header>

      {!canManage && (
        <p className="transportadora-api-warning">
          Modo lectura: no tienes permisos de gestion (`config.manage`).
        </p>
      )}

      {success && <p className="transportadora-api-success">{success}</p>}
      {error && <p className="transportadora-api-error">{error}</p>}

      {isLoading ? (
        <article className="transportadora-api-card">
          <p className="transportadora-api-loading">
            Cargando contexto de transportadora...
          </p>
        </article>
      ) : !transportadora || !form ? (
        <article className="transportadora-api-card">
          <p className="transportadora-api-loading">
            {error
              ? 'No se pudo cargar la transportadora solicitada.'
              : 'No se encontro la transportadora solicitada.'}
          </p>
        </article>
      ) : (
        <>
          <article className="transportadora-api-card">
            <h2>Contexto</h2>
            <div className="transportadora-api-grid">
              <label>
                TransportadoraId
                <input
                  type="text"
                  value={String(transportadora.transportadoraId)}
                  disabled
                />
              </label>
              <label>
                Empresa
                <input type="text" value={empresaLabel} disabled />
              </label>
              <label>
                Codigo
                <input type="text" value={transportadora.codigo} disabled />
              </label>
              <label>
                Nombre
                <input type="text" value={transportadora.nombre} disabled />
              </label>
              <label>
                Token configurado
                <input type="text" value={hasApiKey ? 'Si' : 'No'} disabled />
              </label>
              <label>
                Ultima rotacion token
                <input type="text" value={formatDate(apiKeyLastRotatedAt)} disabled />
              </label>
              <label>
                Ultima actualizacion
                <input type="text" value={formatDate(updatedAt)} disabled />
              </label>
              <label>
                Estado
                <input
                  type="text"
                  value={transportadora.activo ? 'Activa' : 'Inactiva'}
                  disabled
                />
              </label>
            </div>
          </article>

          <article className="transportadora-api-card">
            <h2>Conexion API</h2>
            <div className="transportadora-api-grid">
              <label>
                Base URL
                <input
                  type="text"
                  placeholder="https://api.proveedor.com"
                  value={form.baseUrl}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleInputChange('baseUrl', event.target.value)
                  }
                />
              </label>
              <label>
                Tipo de autenticacion
                <select
                  value={form.authType}
                  disabled={true}
                  onChange={(event) =>
                    handleInputChange('authType', event.target.value as 'API_KEY')
                  }
                >
                  <option value="API_KEY">API Key</option>
                </select>
              </label>
              <label>
                API Key / Token (rotar)
                <input
                  type="password"
                  placeholder="Ingresa un nuevo token para rotar"
                  value={form.apiKeyPlaintext}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleInputChange('apiKeyPlaintext', event.target.value)
                  }
                />
              </label>
              <label>
                Timeout (ms)
                <input
                  type="number"
                  min={1000}
                  max={60000}
                  value={form.timeoutMs}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleInputChange('timeoutMs', event.target.value)
                  }
                />
              </label>
            </div>
          </article>

          <article className="transportadora-api-card">
            <h2>Mapeo funcional</h2>
            <div className="transportadora-api-grid">
              <label>
                Endpoint crear guia
                <input
                  type="text"
                  placeholder="/shipments"
                  value={form.createShipmentEndpoint}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleInputChange('createShipmentEndpoint', event.target.value)
                  }
                />
              </label>
              <label>
                Endpoint consultar tracking
                <input
                  type="text"
                  placeholder="/track/{trackingNumber}"
                  value={form.trackingEndpointTemplate}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleInputChange('trackingEndpointTemplate', event.target.value)
                  }
                />
              </label>
              <label>
                Campo trackingNumber
                <input
                  type="text"
                  placeholder="tracking_number"
                  value={form.trackingNumberField}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleInputChange('trackingNumberField', event.target.value)
                  }
                />
              </label>
              <label>
                Campo estado logistica
                <input
                  type="text"
                  placeholder="status"
                  value={form.statusField}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleInputChange('statusField', event.target.value)
                  }
                />
              </label>
            </div>
          </article>

          {canManage && (
            <div className="transportadora-api-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={isSubmitting}
                onClick={() => void handleSave()}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                Cancelar
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
