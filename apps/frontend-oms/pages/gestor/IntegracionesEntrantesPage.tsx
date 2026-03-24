import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  createIntegracionEntrante,
  getIntegracionEntranteById,
  getIntegracionEntranteRuns,
  getIntegracionesEntrantesBootstrap,
  syncIntegracionEntranteNow,
  updateIntegracionEntrante,
  validateIntegracionEntrante,
  type IntegracionEntranteListItem,
  type IntegracionEntranteRunLog,
  type IntegracionesEntrantesBootstrapResponse,
} from '../../src/configuracion-general/integraciones-entrantes.api';
import { ROUTES } from '../../src/routes/routes';
import './IntegracionesEntrantesPage.css';

type FormState = {
  empresaId: string;
  canalVentaId: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  providerCode: string;
  mode: 'KOAJ_PILOT' | 'GENERIC';
  baseUrl: string;
  timeoutMs: string;
  listConfirmedOrdersEndpoint: string;
  orderDetailEndpoint: string;
  confirmedStatuses: string;
  externalOrderIdField: string;
  externalReferenceField: string;
  customerNameField: string;
  totalField: string;
  statusField: string;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  canalVentaId: '',
  codigo: '',
  nombre: '',
  activo: true,
  providerCode: 'KOAJ',
  mode: 'KOAJ_PILOT',
  baseUrl: '',
  timeoutMs: '15000',
  listConfirmedOrdersEndpoint: '',
  orderDetailEndpoint: '',
  confirmedStatuses: 'CONFIRMED',
  externalOrderIdField: 'id',
  externalReferenceField: 'reference',
  customerNameField: 'customer_name',
  totalField: 'total_paid_tax_incl',
  statusField: 'status',
};

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

function mapItemToForm(item: IntegracionEntranteListItem): FormState {
  return {
    empresaId: String(item.empresaId),
    canalVentaId: String(item.canalVentaId),
    codigo: item.codigo,
    nombre: item.nombre,
    activo: item.activo,
    providerCode: item.config.providerCode,
    mode: item.config.mode,
    baseUrl: item.config.connection.baseUrl ?? '',
    timeoutMs: String(item.config.connection.timeoutMs),
    listConfirmedOrdersEndpoint:
      item.config.endpoints.listConfirmedOrdersEndpoint ?? '',
    orderDetailEndpoint: item.config.endpoints.orderDetailEndpoint ?? '',
    confirmedStatuses: item.config.filters.confirmedStatuses.join(', '),
    externalOrderIdField: item.config.mapping.externalOrderIdField ?? '',
    externalReferenceField: item.config.mapping.externalReferenceField ?? '',
    customerNameField: item.config.mapping.customerNameField ?? '',
    totalField: item.config.mapping.totalField ?? '',
    statusField: item.config.mapping.statusField ?? '',
  };
}

export function IntegracionesEntrantesPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [bootstrap, setBootstrap] =
    useState<IntegracionesEntrantesBootstrapResponse | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingIntegracionId, setEditingIntegracionId] = useState<
    number | null
  >(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingById, setSyncingById] = useState<number | null>(null);
  const [validatingById, setValidatingById] = useState<number | null>(null);
  const [selectedIntegracionId, setSelectedIntegracionId] = useState<
    number | null
  >(null);
  const [selectedIntegracionDetail, setSelectedIntegracionDetail] =
    useState<IntegracionEntranteListItem | null>(null);
  const [selectedIntegracionRuns, setSelectedIntegracionRuns] = useState<
    IntegracionEntranteRunLog[]
  >([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const payload = await getIntegracionesEntrantesBootstrap(accessToken);
      setBootstrap(payload);
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudieron cargar las integraciones entrantes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSelectedContext(integracionId: number) {
    if (!accessToken) {
      return;
    }

    setIsDetailLoading(true);
    try {
      const [detail, runs] = await Promise.all([
        getIntegracionEntranteById(accessToken, integracionId),
        getIntegracionEntranteRuns(accessToken, integracionId, 20),
      ]);
      setSelectedIntegracionDetail(detail);
      setSelectedIntegracionRuns(runs);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar el detalle del conector';
      setError(message);
      setSelectedIntegracionDetail(null);
      setSelectedIntegracionRuns([]);
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const empresas = useMemo(() => bootstrap?.empresas ?? [], [bootstrap]);
  const canalesVenta = useMemo(() => bootstrap?.canalesVenta ?? [], [bootstrap]);
  const integracionesEntrantes = useMemo(
    () => bootstrap?.integracionesEntrantes ?? [],
    [bootstrap],
  );
  const templates = useMemo(() => bootstrap?.templates ?? [], [bootstrap]);
  const selectedIntegracion = useMemo(
    () =>
      integracionesEntrantes.find(
        (item) => item.integracionId === selectedIntegracionId,
      ) ?? null,
    [integracionesEntrantes, selectedIntegracionId],
  );
  const selectedIntegracionResolved =
    selectedIntegracionDetail ?? selectedIntegracion;

  useEffect(() => {
    if (integracionesEntrantes.length === 0) {
      setSelectedIntegracionId(null);
      return;
    }
    const exists = integracionesEntrantes.some(
      (item) => item.integracionId === selectedIntegracionId,
    );
    if (!exists) {
      setSelectedIntegracionId(integracionesEntrantes[0].integracionId);
    }
  }, [integracionesEntrantes, selectedIntegracionId]);

  useEffect(() => {
    if (!selectedIntegracionId) {
      setSelectedIntegracionDetail(null);
      setSelectedIntegracionRuns([]);
      return;
    }

    void loadSelectedContext(selectedIntegracionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIntegracionId, accessToken]);

  useEffect(() => {
    if (form.empresaId || empresas.length === 0) {
      return;
    }
    setForm((previous) => ({
      ...previous,
      empresaId: String(empresas[0].empresaId),
    }));
  }, [empresas, form.empresaId]);

  const filteredCanales = useMemo(
    () =>
      canalesVenta.filter(
        (canal) => String(canal.empresaId) === String(form.empresaId),
      ),
    [canalesVenta, form.empresaId],
  );

  useEffect(() => {
    if (filteredCanales.length === 0) {
      return;
    }
    const canalExists = filteredCanales.some(
      (canal) => String(canal.canalVentaId) === String(form.canalVentaId),
    );
    if (!canalExists) {
      setForm((previous) => ({
        ...previous,
        canalVentaId: String(filteredCanales[0].canalVentaId),
      }));
    }
  }, [filteredCanales, form.canalVentaId]);

  function canRunSync(item: IntegracionEntranteListItem): boolean {
    const isKoajPilot =
      item.config.mode === 'KOAJ_PILOT' &&
      item.config.providerCode.toUpperCase() === 'KOAJ';
    return item.config.validation.isValid || isKoajPilot;
  }

  function applyTemplate() {
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      providerCode: template.providerCode,
      mode: template.mode,
      baseUrl: template.connection.baseUrl,
      timeoutMs: String(template.connection.timeoutMs),
      listConfirmedOrdersEndpoint: template.endpoints.listConfirmedOrdersEndpoint,
      orderDetailEndpoint: template.endpoints.orderDetailEndpoint,
      confirmedStatuses: template.filters.confirmedStatuses.join(', '),
      externalOrderIdField: template.mapping.externalOrderIdField,
      externalReferenceField: template.mapping.externalReferenceField,
      customerNameField: template.mapping.customerNameField,
      totalField: template.mapping.totalField,
      statusField: template.mapping.statusField,
    }));
    setSuccess(`Plantilla ${template.label} aplicada en el formulario`);
    setError('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }
    if (!canManage) {
      setError('No tienes permisos para gestionar integraciones');
      return;
    }

    const empresaId = Number(form.empresaId);
    const canalVentaId = Number(form.canalVentaId);
    const timeoutMs = Number(form.timeoutMs);
    const confirmedStatuses = form.confirmedStatuses
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!Number.isInteger(canalVentaId) || canalVentaId <= 0) {
      setError('Canal de venta es obligatorio');
      return;
    }
    if (!form.codigo.trim() || !form.nombre.trim()) {
      setError('Codigo y nombre son obligatorios');
      return;
    }
    if (!Number.isInteger(timeoutMs)) {
      setError('Timeout debe ser un numero entero');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      let persistedIntegracionId: number | null = editingIntegracionId;
      const payload = {
        empresaId,
        canalVentaId,
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        activo: form.activo,
        providerCode: form.providerCode.trim().toUpperCase(),
        mode: form.mode,
        baseUrl: form.baseUrl.trim() || null,
        authType: 'API_KEY' as const,
        timeoutMs,
        listConfirmedOrdersEndpoint: form.listConfirmedOrdersEndpoint.trim() || null,
        orderDetailEndpoint: form.orderDetailEndpoint.trim() || null,
        confirmedStatuses,
        externalOrderIdField: form.externalOrderIdField.trim() || null,
        externalReferenceField: form.externalReferenceField.trim() || null,
        customerNameField: form.customerNameField.trim() || null,
        totalField: form.totalField.trim() || null,
        statusField: form.statusField.trim() || null,
      };

      if (editingIntegracionId) {
        await updateIntegracionEntrante(accessToken, editingIntegracionId, payload);
        setSuccess('Integracion entrante actualizada');
      } else {
        const created = await createIntegracionEntrante(accessToken, payload);
        persistedIntegracionId = created.integracionId;
        setSuccess('Integracion entrante creada');
      }

      setEditingIntegracionId(null);
      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
        canalVentaId: previous.canalVentaId,
      }));
      await loadData();
      if (persistedIntegracionId) {
        setSelectedIntegracionId(persistedIntegracionId);
        await loadSelectedContext(persistedIntegracionId);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar la integracion';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(item: IntegracionEntranteListItem) {
    setEditingIntegracionId(item.integracionId);
    setForm(mapItemToForm(item));
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditingIntegracionId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      empresaId: previous.empresaId || String(empresas[0]?.empresaId ?? ''),
      canalVentaId:
        previous.canalVentaId || String(filteredCanales[0]?.canalVentaId ?? ''),
    }));
    setError('');
    setSuccess('');
  }

  async function handleValidate(integracionId: number) {
    if (!accessToken || !canManage) {
      return;
    }
    setValidatingById(integracionId);
    setError('');
    setSuccess('');
    try {
      const response = await validateIntegracionEntrante(accessToken, integracionId);
      setSelectedIntegracionId(integracionId);
      if (response.validation.status === 'OK') {
        setSuccess(response.validation.message);
      } else {
        setError(response.validation.message);
      }
      await loadData();
      await loadSelectedContext(integracionId);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo validar la integracion';
      setError(message);
    } finally {
      setValidatingById(null);
    }
  }

  async function handleSyncNow(integracionId: number) {
    if (!accessToken || !canManage) {
      return;
    }
    setSyncingById(integracionId);
    setError('');
    setSuccess('');
    try {
      const response = await syncIntegracionEntranteNow(accessToken, integracionId);
      const { summary } = response.result;
      setSelectedIntegracionId(integracionId);
      if (response.result.status === 'OK') {
        setSuccess(
          `${response.result.message}. Recibidos: ${summary.pendingReceived}, Ingestados: ${summary.ingested}, Duplicados: ${summary.duplicated}, Fallidos: ${summary.failed}`,
        );
      } else {
        setError(response.result.message);
      }
      await loadData();
      await loadSelectedContext(integracionId);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo sincronizar la integracion';
      setError(message);
    } finally {
      setSyncingById(null);
    }
  }

  return (
    <section className="integraciones-entrantes-page">
      <header className="integraciones-entrantes-header">
        <div>
          <h1>Integraciones Entrantes</h1>
          <p>Conectores para recibir y sincronizar pedidos confirmados.</p>
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

      {canManage && (
        <article className="integraciones-entrantes-card">
          <h2>
            {editingIntegracionId
              ? `Editar conector #${editingIntegracionId}`
              : 'Nuevo conector entrante'}
          </h2>

          <div className="integraciones-entrantes-template-row">
            <label>
              Plantilla
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                <option value="">Seleccionar plantilla</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
              <small className="integraciones-entrantes-help">
                Carga valores sugeridos para proveedor, endpoints y mapeo.
              </small>
            </label>
            <button type="button" className="btn-secondary" onClick={applyTemplate}>
              Aplicar plantilla
            </button>
          </div>

          <form className="integraciones-entrantes-form" onSubmit={handleSubmit}>
            <label>
              Empresa
              <select
                value={form.empresaId}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    empresaId: event.target.value,
                  }))
                }
                required
              >
                {empresas.map((empresa) => (
                  <option key={empresa.empresaId} value={String(empresa.empresaId)}>
                    {empresa.nombre} ({empresa.codigo})
                  </option>
                ))}
              </select>
              <small className="integraciones-entrantes-help">
                Empresa propietaria del conector.
              </small>
            </label>

            <label>
              Canal venta
              <select
                value={form.canalVentaId}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    canalVentaId: event.target.value,
                  }))
                }
                required
              >
                {filteredCanales.map((canal) => (
                  <option key={canal.canalVentaId} value={String(canal.canalVentaId)}>
                    {canal.nombre} ({canal.codigo})
                  </option>
                ))}
              </select>
              <small className="integraciones-entrantes-help">
                Destino comercial del pedido recibido.
              </small>
            </label>

            <label>
              Codigo conector
              <input
                type="text"
                value={form.codigo}
                maxLength={120}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    codigo: event.target.value,
                  }))
                }
                required
              />
              <small className="integraciones-entrantes-help">
                Identificador unico interno de la integracion.
              </small>
            </label>

            <label>
              Nombre
              <input
                type="text"
                value={form.nombre}
                maxLength={240}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    nombre: event.target.value,
                  }))
                }
                required
              />
              <small className="integraciones-entrantes-help">
                Nombre visible para operacion.
              </small>
            </label>

            <label>
              Provider code
              <input
                type="text"
                value={form.providerCode}
                maxLength={60}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    providerCode: event.target.value,
                  }))
                }
                required
              />
              <small className="integraciones-entrantes-help">
                Codigo tecnico del proveedor externo (ej: KOAJ, VTEX, SHOPIFY).
              </small>
            </label>

            <label>
              Mode
              <select
                value={form.mode}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    mode: event.target.value as 'KOAJ_PILOT' | 'GENERIC',
                  }))
                }
              >
                <option value="KOAJ_PILOT">KOAJ_PILOT</option>
                <option value="GENERIC">GENERIC</option>
              </select>
              <small className="integraciones-entrantes-help">
                KOAJ_PILOT usa la logica actual; GENERIC queda listo para nuevos conectores.
              </small>
            </label>

            <label>
              Base URL
              <input
                type="text"
                value={form.baseUrl}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    baseUrl: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                URL base del API externo. En KOAJ_PILOT es informativa en V1.
              </small>
            </label>

            <label>
              Timeout (ms)
              <input
                type="number"
                min={1000}
                max={60000}
                value={form.timeoutMs}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    timeoutMs: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Tiempo maximo de espera por llamada HTTP.
              </small>
            </label>

            <label>
              Endpoint lista confirmados
              <input
                type="text"
                value={form.listConfirmedOrdersEndpoint}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    listConfirmedOrdersEndpoint: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Ruta del proveedor para consultar pedidos confirmados.
              </small>
            </label>

            <label>
              Endpoint detalle pedido
              <input
                type="text"
                value={form.orderDetailEndpoint}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    orderDetailEndpoint: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Ruta para consultar detalle de un pedido especifico.
              </small>
            </label>

            <label>
              Estados confirmados (CSV)
              <input
                type="text"
                value={form.confirmedStatuses}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    confirmedStatuses: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Estados externos que OMS considera listos para ingesta.
              </small>
            </label>

            <label>
              Campo externalOrderId
              <input
                type="text"
                value={form.externalOrderIdField}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    externalOrderIdField: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Campo del payload externo que identifica el pedido unico.
              </small>
            </label>

            <label>
              Campo referencia
              <input
                type="text"
                value={form.externalReferenceField}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    externalReferenceField: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Campo visible de referencia comercial (numero de orden).
              </small>
            </label>

            <label>
              Campo cliente
              <input
                type="text"
                value={form.customerNameField}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    customerNameField: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Campo externo para nombre del cliente.
              </small>
            </label>

            <label>
              Campo total
              <input
                type="text"
                value={form.totalField}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    totalField: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Campo externo para total pagado del pedido.
              </small>
            </label>

            <label>
              Campo estado
              <input
                type="text"
                value={form.statusField}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    statusField: event.target.value,
                  }))
                }
              />
              <small className="integraciones-entrantes-help">
                Campo externo de estado para filtrar confirmados.
              </small>
            </label>

            <label className="integraciones-entrantes-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    activo: event.target.checked,
                  }))
                }
              />
              Activo
            </label>

            <div className="integraciones-entrantes-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingIntegracionId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>
              {editingIntegracionId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="integraciones-entrantes-card">
        <h2>Listado de conectores entrantes</h2>
        {isLoading ? (
          <p className="integraciones-entrantes-loading">
            Cargando integraciones...
          </p>
        ) : (
          <div className="integraciones-entrantes-table-wrap">
            <table className="integraciones-entrantes-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Canal</th>
                  <th>Conector</th>
                  <th>Provider</th>
                  <th>Estado</th>
                  <th>Validacion</th>
                  <th>Ultimo sync</th>
                  <th>Ultimo resultado</th>
                  <th>Duracion</th>
                  <th>Ultimo error</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {integracionesEntrantes.length === 0 ? (
                  <tr>
                    <td
                      className="integraciones-entrantes-empty-cell"
                      colSpan={canManage ? 12 : 11}
                    >
                      No hay conectores entrantes registrados.
                    </td>
                  </tr>
                ) : (
                  integracionesEntrantes.map((item) => (
                    <tr
                      key={item.integracionId}
                      className={
                        selectedIntegracionId === item.integracionId
                          ? 'integraciones-entrantes-row-selected'
                          : undefined
                      }
                      onClick={() => setSelectedIntegracionId(item.integracionId)}
                    >
                      <td>{item.integracionId}</td>
                      <td>
                        {item.empresaNombre} ({item.empresaCodigo})
                      </td>
                      <td>
                        {item.canalVentaNombre} ({item.canalVentaCodigo})
                      </td>
                      <td>
                        {item.codigo}
                        <br />
                        <small>{item.nombre}</small>
                      </td>
                      <td>
                        {item.config.providerCode}
                        <br />
                        <small>{item.config.mode}</small>
                      </td>
                      <td>{item.activo ? 'Activa' : 'Inactiva'}</td>
                      <td>
                        {item.config.validation.isValid ? 'Valida' : 'Pendiente'}
                        <br />
                        <small>{toLocalDate(item.config.validation.validatedAt)}</small>
                      </td>
                      <td>
                        {item.config.lastSync
                          ? `Ingestados ${item.config.lastSync.ingested} / Duplicados ${item.config.lastSync.duplicated}`
                          : '-'}
                        <br />
                        <small>{toLocalDate(item.config.lastSync?.executedAt ?? null)}</small>
                      </td>
                      <td>{item.config.lastSync?.status ?? '-'}</td>
                      <td>{toDurationLabel(item.config.lastSync?.durationMs)}</td>
                      <td>
                        {item.config.lastSync?.errorMessage ?? '-'}
                        <br />
                        <small>{item.config.lastSync?.errorCode ?? '-'}</small>
                      </td>
                      {canManage && (
                        <td>
                          <div className="integraciones-entrantes-row-actions">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedIntegracionId(item.integracionId);
                              }}
                            >
                              Detalle
                            </button>
                            <button type="button" onClick={() => startEdit(item)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={validatingById === item.integracionId}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleValidate(item.integracionId);
                              }}
                            >
                              {validatingById === item.integracionId
                                ? 'Validando...'
                                : 'Validar'}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={
                                syncingById === item.integracionId ||
                                !canRunSync(item)
                              }
                              title={
                                canRunSync(item)
                                  ? 'Ejecutar sincronizacion manual'
                                  : 'Debes validar la configuracion antes de sincronizar'
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleSyncNow(item.integracionId);
                              }}
                            >
                              {syncingById === item.integracionId
                                ? 'Sincronizando...'
                                : 'Sincronizar ahora'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {selectedIntegracionResolved && (
        <article className="integraciones-entrantes-card">
          <h2>
            Detalle ultimo sync ({selectedIntegracionResolved.codigo} /{' '}
            {selectedIntegracionResolved.config.providerCode})
          </h2>
          {isDetailLoading ? (
            <p className="integraciones-entrantes-loading">
              Cargando detalle del conector...
            </p>
          ) : !selectedIntegracionResolved.config.lastSync ? (
            <p className="integraciones-entrantes-loading">
              No hay ejecuciones de sincronizacion registradas para este conector.
            </p>
          ) : (
            <div className="integraciones-entrantes-detail-grid">
              <div>
                <span>Run ID</span>
                <strong>{selectedIntegracionResolved.config.lastSync.runId}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{selectedIntegracionResolved.config.lastSync.status}</strong>
              </div>
              <div>
                <span>Mensaje</span>
                <strong>{selectedIntegracionResolved.config.lastSync.message}</strong>
              </div>
              <div>
                <span>Ejecutado</span>
                <strong>
                  {toLocalDate(selectedIntegracionResolved.config.lastSync.executedAt)}
                </strong>
              </div>
              <div>
                <span>Duracion</span>
                <strong>
                  {toDurationLabel(selectedIntegracionResolved.config.lastSync.durationMs)}
                </strong>
              </div>
              <div>
                <span>Ejecutado por</span>
                <strong>{selectedIntegracionResolved.config.lastSync.executedBy ?? '-'}</strong>
              </div>
              <div>
                <span>Resumen</span>
                <strong>
                  Recibidos {selectedIntegracionResolved.config.lastSync.pendingReceived} /
                  Ingestados {selectedIntegracionResolved.config.lastSync.ingested} /
                  Duplicados {selectedIntegracionResolved.config.lastSync.duplicated} /
                  Fallidos {selectedIntegracionResolved.config.lastSync.failed}
                </strong>
              </div>
              <div>
                <span>Diagnosticos</span>
                <strong>
                  {selectedIntegracionResolved.config.lastSync.diagnosticsSummary
                    ? `Total ${selectedIntegracionResolved.config.lastSync.diagnosticsSummary.total}, OK ${selectedIntegracionResolved.config.lastSync.diagnosticsSummary.ok}, Fallidos ${selectedIntegracionResolved.config.lastSync.diagnosticsSummary.failed}`
                    : '-'}
                </strong>
              </div>
              <div className="integraciones-entrantes-detail-full">
                <span>Codigos diagnostico fallidos</span>
                <strong>
                  {selectedIntegracionResolved.config.lastSync.diagnosticsSummary
                    ?.failedCodes?.length
                    ? selectedIntegracionResolved.config.lastSync.diagnosticsSummary.failedCodes.join(
                        ', ',
                      )
                    : '-'}
                </strong>
              </div>
              <div className="integraciones-entrantes-detail-full">
                <span>Ultimo error</span>
                <strong>
                  {selectedIntegracionResolved.config.lastSync.errorMessage ?? '-'}
                  {selectedIntegracionResolved.config.lastSync.errorCode
                    ? ` (${selectedIntegracionResolved.config.lastSync.errorCode})`
                    : ''}
                </strong>
              </div>
            </div>
          )}

          <h3>Idempotencia por conector</h3>
          {selectedIntegracionDetail?.dedupe ? (
            <div className="integraciones-entrantes-detail-grid">
              <div>
                <span>Total trazas</span>
                <strong>{selectedIntegracionDetail.dedupe.total}</strong>
              </div>
              <div>
                <span>Ingestados</span>
                <strong>{selectedIntegracionDetail.dedupe.ingestado}</strong>
              </div>
              <div>
                <span>Duplicados</span>
                <strong>{selectedIntegracionDetail.dedupe.duplicado}</strong>
              </div>
              <div>
                <span>Fallidos</span>
                <strong>{selectedIntegracionDetail.dedupe.failed}</strong>
              </div>
              <div className="integraciones-entrantes-detail-full">
                <span>Ultima actualizacion de traza</span>
                <strong>{toLocalDate(selectedIntegracionDetail.dedupe.lastUpdatedAt)}</strong>
              </div>
            </div>
          ) : (
            <p className="integraciones-entrantes-loading">
              Sin metadatos de deduplicacion disponibles.
            </p>
          )}

          <h3>Historial de corridas recientes</h3>
          {isDetailLoading ? (
            <p className="integraciones-entrantes-loading">Cargando historial...</p>
          ) : selectedIntegracionRuns.length === 0 ? (
            <p className="integraciones-entrantes-loading">
              No hay corridas recientes registradas.
            </p>
          ) : (
            <div className="integraciones-entrantes-table-wrap">
              <table className="integraciones-entrantes-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Estado</th>
                    <th>Ejecutado</th>
                    <th>Duracion</th>
                    <th>Resumen</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIntegracionRuns.map((run) => (
                    <tr key={run.runId}>
                      <td>{run.runId}</td>
                      <td>{run.status}</td>
                      <td>{toLocalDate(run.executedAt)}</td>
                      <td>{toDurationLabel(run.durationMs)}</td>
                      <td>
                        Recibidos {run.summary.pendingReceived} / Ingestados{' '}
                        {run.summary.ingested} / Duplicados {run.summary.duplicated} /
                        Fallidos {run.summary.failed}
                      </td>
                      <td>
                        {run.errorMessage ?? '-'}
                        <br />
                        <small>{run.errorCode ?? '-'}</small>
                      </td>
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
