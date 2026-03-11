import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  getTransportadoraConfiguracion,
  updateTransportadoraConfiguracion,
  type TransportadoraConfiguracionDetail,
  type TransportadoraConfiguracionStoreItem,
  type UpdateTransportadoraConfiguracionRequest,
} from '../../src/configuracion-general/transportadora.api';
import { ROUTES } from '../../src/routes/routes';
import './TransportadoraConfiguracionPage.css';

type FormState = {
  empresaId: number;
  codigo: string;
  nombre: string;
  trackingUrlTemplate: string;
  activo: boolean;
  servicio: string;
  permiteExpress: boolean;
  moduloCode: string;
  zonaSeleccionadaId: string;
  tarifaCosto: string;
  tarifaDiasMin: string;
  tarifaDiasMax: string;
  tarifaActiva: boolean;
  tiendaIds: number[];
};

const EMPTY_FORM: FormState = {
  empresaId: 0,
  codigo: '',
  nombre: '',
  trackingUrlTemplate: '',
  activo: true,
  servicio: '',
  permiteExpress: false,
  moduloCode: '',
  zonaSeleccionadaId: '',
  tarifaCosto: '',
  tarifaDiasMin: '',
  tarifaDiasMax: '',
  tarifaActiva: true,
  tiendaIds: [],
};

const SERVICIO_OPTIONS = ['Domicilio', 'Tienda', 'Interno', 'Manual'] as const;

function toStoreLabel(store: TransportadoraConfiguracionStoreItem): string {
  return `${store.codigo} ${store.nombre}`;
}

function parseRequiredDecimal(value: string, fieldName: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    throw new Error(`El campo ${fieldName} es obligatorio`);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`El campo ${fieldName} debe ser un numero mayor o igual a 0`);
  }

  return parsed;
}

function parseOptionalInteger(value: string, fieldName: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`El campo ${fieldName} debe ser un entero mayor o igual a 0`);
  }

  return parsed;
}

function byStoreNameAsc(
  left: TransportadoraConfiguracionStoreItem,
  right: TransportadoraConfiguracionStoreItem,
): number {
  const byName = left.nombre.localeCompare(right.nombre);
  if (byName !== 0) {
    return byName;
  }
  return left.tiendaId - right.tiendaId;
}

function buildFormFromDetail(payload: TransportadoraConfiguracionDetail): FormState {
  const hasTarifaZona = payload.tarifaZona !== null;
  return {
    empresaId: payload.transportadora.empresaId,
    codigo: payload.transportadora.codigo,
    nombre: payload.transportadora.nombre,
    trackingUrlTemplate: payload.transportadora.trackingUrlTemplate ?? '',
    activo: payload.transportadora.activo,
    servicio: payload.config.servicio ?? '',
    permiteExpress: payload.config.permiteExpress,
    moduloCode: payload.config.moduloCode ?? '',
    zonaSeleccionadaId: hasTarifaZona
      ? payload.zonaSeleccionadaId !== null
        ? String(payload.zonaSeleccionadaId)
        : ''
      : '',
    tarifaCosto:
      payload.tarifaZona?.costo !== undefined ? String(payload.tarifaZona.costo) : '',
    tarifaDiasMin:
      payload.tarifaZona?.diasMin !== undefined ? String(payload.tarifaZona.diasMin) : '',
    tarifaDiasMax:
      payload.tarifaZona?.diasMax !== undefined ? String(payload.tarifaZona.diasMax) : '',
    tarifaActiva: payload.tarifaZona?.activo ?? true,
    tiendaIds: payload.tiendasSeleccionadas.map((item) => item.tiendaId),
  };
}

export function TransportadoraConfiguracionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [detail, setDetail] = useState<TransportadoraConfiguracionDetail | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingZonaTarifa, setIsLoadingZonaTarifa] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const transportadoraId = Number(id);

  useEffect(() => {
    async function loadDetail() {
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

      try {
        const payload = await getTransportadoraConfiguracion(accessToken, transportadoraId);
        setDetail(payload);
        setForm(buildFormFromDetail(payload));
        setError('');
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la configuracion de transportadora';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDetail();
  }, [accessToken, transportadoraId]);

  const storeMap = useMemo(() => {
    const map = new Map<number, TransportadoraConfiguracionStoreItem>();
    detail?.tiendasDisponibles.forEach((store) => {
      map.set(store.tiendaId, store);
    });
    detail?.tiendasSeleccionadas.forEach((store) => {
      map.set(store.tiendaId, store);
    });
    return map;
  }, [detail]);

  const availableStores = useMemo(() => {
    if (!detail) {
      return [];
    }

    const selectedIds = new Set(form.tiendaIds);
    const term = availableSearch.trim().toLowerCase();

    return detail.tiendasDisponibles
      .filter((store) => !selectedIds.has(store.tiendaId))
      .filter((store) => {
        if (!term) {
          return true;
        }
        return toStoreLabel(store).toLowerCase().includes(term);
      })
      .sort(byStoreNameAsc);
  }, [detail, form.tiendaIds, availableSearch]);

  const selectedStores = useMemo(() => {
    const term = selectedSearch.trim().toLowerCase();

    return form.tiendaIds
      .map((tiendaId) => storeMap.get(tiendaId))
      .filter((store): store is TransportadoraConfiguracionStoreItem => Boolean(store))
      .filter((store) => {
        if (!term) {
          return true;
        }
        return toStoreLabel(store).toLowerCase().includes(term);
      })
      .sort(byStoreNameAsc);
  }, [form.tiendaIds, storeMap, selectedSearch]);

  const servicioOptions = useMemo(() => {
    const options: string[] = [...SERVICIO_OPTIONS];
    const current = form.servicio.trim();

    if (
      current &&
      !options.some((option) => option.toLowerCase() === current.toLowerCase())
    ) {
      options.unshift(current);
    }

    return options;
  }, [form.servicio]);

  function addStore(tiendaId: number) {
    setForm((previous) => {
      if (previous.tiendaIds.includes(tiendaId)) {
        return previous;
      }
      return { ...previous, tiendaIds: [...previous.tiendaIds, tiendaId] };
    });
  }

  function removeStore(tiendaId: number) {
    setForm((previous) => ({
      ...previous,
      tiendaIds: previous.tiendaIds.filter((value) => value !== tiendaId),
    }));
  }

  async function handleZonaChange(nextZonaValue: string) {
    setForm((previous) => ({ ...previous, zonaSeleccionadaId: nextZonaValue }));

    const zonaSeleccionadaId = Number(nextZonaValue);
    if (!accessToken || !Number.isInteger(zonaSeleccionadaId) || zonaSeleccionadaId <= 0) {
      return;
    }

    try {
      setIsLoadingZonaTarifa(true);
      const payload = await getTransportadoraConfiguracion(
        accessToken,
        transportadoraId,
        zonaSeleccionadaId,
      );
      setDetail(payload);
      setForm((previous) => ({
        ...previous,
        zonaSeleccionadaId:
          payload.zonaSeleccionadaId !== null ? String(payload.zonaSeleccionadaId) : '',
        tarifaCosto:
          payload.tarifaZona?.costo !== undefined ? String(payload.tarifaZona.costo) : '',
        tarifaDiasMin:
          payload.tarifaZona?.diasMin !== undefined ? String(payload.tarifaZona.diasMin) : '',
        tarifaDiasMax:
          payload.tarifaZona?.diasMax !== undefined ? String(payload.tarifaZona.diasMax) : '',
        tarifaActiva: payload.tarifaZona?.activo ?? true,
      }));
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar la tarifa de la zona seleccionada';
      setError(message);
    } finally {
      setIsLoadingZonaTarifa(false);
    }
  }

  function goToList() {
    navigate(ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }

    if (!canManage) {
      setError('No tienes permisos para gestionar catalogos');
      return;
    }

    const codigo = form.codigo.trim().toUpperCase();
    const nombre = form.nombre.trim();

    if (!codigo || !nombre) {
      setError('Nombre y codigo son obligatorios');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const zonaValue = form.zonaSeleccionadaId.trim();
      const costoValue = form.tarifaCosto.trim();
      const requestPayload: UpdateTransportadoraConfiguracionRequest = {
        empresaId: form.empresaId,
        codigo,
        nombre,
        trackingUrlTemplate: form.trackingUrlTemplate.trim() || null,
        activo: form.activo,
        servicio: form.servicio.trim() || null,
        permiteExpress: form.permiteExpress,
        moduloCode: form.moduloCode.trim() || null,
        tiendaIds: form.tiendaIds,
      };

      if (zonaValue || costoValue) {
        if (!zonaValue || !costoValue) {
          throw new Error('Para guardar tarifa debes completar zona y costo');
        }

        const zonaSeleccionadaId = Number(zonaValue);
        if (!Number.isInteger(zonaSeleccionadaId) || zonaSeleccionadaId <= 0) {
          throw new Error('La zona seleccionada no es valida');
        }

        const costo = parseRequiredDecimal(form.tarifaCosto, 'costo');
        const diasMin = parseOptionalInteger(form.tarifaDiasMin, 'dias min');
        const diasMax = parseOptionalInteger(form.tarifaDiasMax, 'dias max');

        if (diasMin !== null && diasMax !== null && diasMin > diasMax) {
          throw new Error('El campo dias min no puede ser mayor a dias max');
        }

        requestPayload.zonaSeleccionadaId = zonaSeleccionadaId;
        requestPayload.tarifaZona = {
          costo,
          diasMin,
          diasMax,
          activo: form.tarifaActiva,
        };
      }

      await updateTransportadoraConfiguracion(
        accessToken,
        transportadoraId,
        requestPayload,
      );

      goToList();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar la configuracion de transportadora';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="transportadora-config-page">
      <header className="transportadora-config-header">
        <div>
          <h1>Configuracion de transportadora</h1>
          <p>
            Actualiza datos base, parametros logisticos, tarifa base por zona y tiendas
            asociadas.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={goToList}>
          Volver al listado
        </button>
      </header>

      {!canManage && (
        <p className="transportadora-config-warning">
          Modo lectura: no tienes permisos de gestion (`config.manage`).
        </p>
      )}

      {error && <p className="transportadora-config-error">{error}</p>}

      {isLoading ? (
        <article className="transportadora-config-card">
          <p className="transportadora-config-loading">Cargando configuracion...</p>
        </article>
      ) : !detail ? (
        <article className="transportadora-config-card">
          <p className="transportadora-config-loading">
            No se encontro informacion para esta transportadora.
          </p>
        </article>
      ) : (
        <form className="transportadora-config-form" onSubmit={handleSubmit}>
          <article className="transportadora-config-card">
            <h2>Datos base</h2>
            <div className="transportadora-config-grid">
              <label>
                EmpresaId
                <input type="text" value={String(form.empresaId)} disabled />
              </label>

              <label>
                Codigo
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, codigo: event.target.value }))
                  }
                  maxLength={60}
                  required
                  disabled={!canManage || isSubmitting}
                />
              </label>

              <label>
                Nombre
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, nombre: event.target.value }))
                  }
                  maxLength={180}
                  required
                  disabled={!canManage || isSubmitting}
                />
              </label>

              <label>
                Tracking URL Template
                <input
                  type="text"
                  value={form.trackingUrlTemplate}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      trackingUrlTemplate: event.target.value,
                    }))
                  }
                  maxLength={255}
                  disabled={!canManage || isSubmitting}
                />
              </label>

              <label className="transportadora-config-checkbox">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      activo: event.target.checked,
                    }))
                  }
                  disabled={!canManage || isSubmitting}
                />
                Activo
              </label>
            </div>
          </article>

          <article className="transportadora-config-card">
            <h2>Configuracion logistica</h2>
            <div className="transportadora-config-grid">
              <label>
                Servicio
                <select
                  value={form.servicio}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, servicio: event.target.value }))
                  }
                  disabled={!canManage || isSubmitting}
                >
                  <option value="">Seleccione un servicio</option>
                  {servicioOptions.map((servicioOption) => (
                    <option key={servicioOption} value={servicioOption}>
                      {servicioOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="transportadora-config-checkbox">
                <input
                  type="checkbox"
                  checked={form.permiteExpress}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      permiteExpress: event.target.checked,
                    }))
                  }
                  disabled={!canManage || isSubmitting}
                />
                Permite express
              </label>

              <label>
                Modulo code
                <input
                  type="text"
                  value={form.moduloCode}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, moduloCode: event.target.value }))
                  }
                  maxLength={120}
                  disabled={!canManage || isSubmitting}
                />
              </label>
            </div>
          </article>

          <article className="transportadora-config-card">
            <h2>Tarifa base por zona</h2>
            <div className="transportadora-config-grid">
              <label>
                Zona
                <select
                  value={form.zonaSeleccionadaId}
                  onChange={(event) => void handleZonaChange(event.target.value)}
                  disabled={
                    !canManage ||
                    isSubmitting ||
                    isLoadingZonaTarifa ||
                    detail.zonasDisponibles.length === 0
                  }
                >
                  <option value="">Seleccione una zona</option>
                  {detail.zonasDisponibles.map((zona) => (
                    <option key={zona.zonaTransporteId} value={String(zona.zonaTransporteId)}>
                      {zona.nombre} ({zona.codigo})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Costo
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.tarifaCosto}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, tarifaCosto: event.target.value }))
                  }
                  disabled={
                    !canManage ||
                    isSubmitting ||
                    isLoadingZonaTarifa ||
                    detail.zonasDisponibles.length === 0
                  }
                />
              </label>

              <label>
                Dias min
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={form.tarifaDiasMin}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, tarifaDiasMin: event.target.value }))
                  }
                  disabled={
                    !canManage ||
                    isSubmitting ||
                    isLoadingZonaTarifa ||
                    detail.zonasDisponibles.length === 0
                  }
                />
              </label>

              <label>
                Dias max
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={form.tarifaDiasMax}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, tarifaDiasMax: event.target.value }))
                  }
                  disabled={
                    !canManage ||
                    isSubmitting ||
                    isLoadingZonaTarifa ||
                    detail.zonasDisponibles.length === 0
                  }
                />
              </label>

              <label className="transportadora-config-checkbox">
                <input
                  type="checkbox"
                  checked={form.tarifaActiva}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, tarifaActiva: event.target.checked }))
                  }
                  disabled={
                    !canManage ||
                    isSubmitting ||
                    isLoadingZonaTarifa ||
                    detail.zonasDisponibles.length === 0
                  }
                />
                Activo tarifa
              </label>
            </div>
            <p className="transportadora-config-hint">
              Moneda de tarifa:{' '}
              {detail.tarifaZona?.monedaId ?? 'segun moneda de la empresa'}
            </p>
            {detail.zonasDisponibles.length === 0 && (
              <p className="transportadora-config-hint">
                No hay zonas activas disponibles. Puedes guardar datos base y tiendas
                sin tarifa.
              </p>
            )}
            {isLoadingZonaTarifa && (
              <p className="transportadora-config-hint">Cargando tarifa de zona...</p>
            )}
          </article>

          <article className="transportadora-config-card">
            <h2>Tiendas asociadas</h2>
            <p className="transportadora-config-hint">
              Tiendas seleccionadas: {form.tiendaIds.length}
            </p>
            <div className="transportadora-store-layout">
              <section className="transportadora-store-column">
                <h3>Disponibles</h3>
                <input
                  type="text"
                  placeholder="Buscar tienda..."
                  value={availableSearch}
                  onChange={(event) => setAvailableSearch(event.target.value)}
                  disabled={isSubmitting}
                />
                <ul className="transportadora-store-list">
                  {availableStores.length === 0 ? (
                    <li className="transportadora-store-empty">Sin tiendas disponibles</li>
                  ) : (
                    availableStores.map((store) => (
                      <li key={store.tiendaId}>
                        <span>{toStoreLabel(store)}</span>
                        <button
                          type="button"
                          onClick={() => addStore(store.tiendaId)}
                          disabled={!canManage || isSubmitting}
                        >
                          Agregar
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section className="transportadora-store-column">
                <h3>Seleccionadas</h3>
                <input
                  type="text"
                  placeholder="Buscar seleccionadas..."
                  value={selectedSearch}
                  onChange={(event) => setSelectedSearch(event.target.value)}
                  disabled={isSubmitting}
                />
                <ul className="transportadora-store-list">
                  {selectedStores.length === 0 ? (
                    <li className="transportadora-store-empty">Sin tiendas seleccionadas</li>
                  ) : (
                    selectedStores.map((store) => (
                      <li key={store.tiendaId}>
                        <span>{toStoreLabel(store)}</span>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => removeStore(store.tiendaId)}
                          disabled={!canManage || isSubmitting}
                        >
                          Quitar
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          </article>

          <div className="transportadora-config-actions">
            <button type="submit" disabled={!canManage || isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={goToList}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
