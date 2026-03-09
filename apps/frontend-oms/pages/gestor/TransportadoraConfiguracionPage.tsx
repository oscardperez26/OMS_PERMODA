import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  getTransportadoraConfiguracion,
  updateTransportadoraConfiguracion,
  type TransportadoraConfiguracionDetail,
  type TransportadoraConfiguracionStoreItem,
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
  costeFijo: string;
  distanciaFijaKm: string;
  costeIncrementalKm: string;
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
  costeFijo: '',
  distanciaFijaKm: '',
  costeIncrementalKm: '',
  tiendaIds: [],
};

function toTextDecimal(value?: number): string {
  if (value === undefined) {
    return '';
  }
  return String(value);
}

function toStoreLabel(store: TransportadoraConfiguracionStoreItem): string {
  return `${store.codigo} ${store.nombre}`;
}

function parseOptionalDecimal(value: string, fieldName: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`El campo ${fieldName} debe ser un numero mayor o igual a 0`);
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

export function TransportadoraConfiguracionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [detail, setDetail] = useState<TransportadoraConfiguracionDetail | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
        setForm({
          empresaId: payload.transportadora.empresaId,
          codigo: payload.transportadora.codigo,
          nombre: payload.transportadora.nombre,
          trackingUrlTemplate: payload.transportadora.trackingUrlTemplate ?? '',
          activo: payload.transportadora.activo,
          servicio: payload.config.servicio ?? '',
          permiteExpress: payload.config.permiteExpress,
          moduloCode: payload.config.moduloCode ?? '',
          costeFijo: toTextDecimal(payload.config.costeFijo),
          distanciaFijaKm: toTextDecimal(payload.config.distanciaFijaKm),
          costeIncrementalKm: toTextDecimal(payload.config.costeIncrementalKm),
          tiendaIds: payload.tiendasSeleccionadas.map((item) => item.tiendaId),
        });
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

      const costeFijo = parseOptionalDecimal(form.costeFijo, 'coste fijo');
      const distanciaFijaKm = parseOptionalDecimal(
        form.distanciaFijaKm,
        'distancia fija km',
      );
      const costeIncrementalKm = parseOptionalDecimal(
        form.costeIncrementalKm,
        'coste incremental km',
      );

      await updateTransportadoraConfiguracion(accessToken, transportadoraId, {
        empresaId: form.empresaId,
        codigo,
        nombre,
        trackingUrlTemplate: form.trackingUrlTemplate.trim() || null,
        activo: form.activo,
        servicio: form.servicio.trim() || null,
        permiteExpress: form.permiteExpress,
        moduloCode: form.moduloCode.trim() || null,
        costeFijo,
        distanciaFijaKm,
        costeIncrementalKm,
        tiendaIds: form.tiendaIds,
      });

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
          <p>Actualiza datos base, parametros logisticos y tiendas asociadas.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={goToList}>
          Volver al listado
        </button>
      </header>

      {!canManage && (
        <p className="transportadora-config-warning">
          Modo lectura: no tienes permisos de gestion (`catalog.manage`).
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
                <input
                  type="text"
                  value={form.servicio}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, servicio: event.target.value }))
                  }
                  maxLength={120}
                  disabled={!canManage || isSubmitting}
                />
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

              <label>
                Coste fijo
                <input
                  type="number"
                  min={0}
                  step="0.000001"
                  value={form.costeFijo}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, costeFijo: event.target.value }))
                  }
                  disabled={!canManage || isSubmitting}
                />
              </label>

              <label>
                Distancia fija (km)
                <input
                  type="number"
                  min={0}
                  step="0.000001"
                  value={form.distanciaFijaKm}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      distanciaFijaKm: event.target.value,
                    }))
                  }
                  disabled={!canManage || isSubmitting}
                />
              </label>

              <label>
                Coste incremental por km
                <input
                  type="number"
                  min={0}
                  step="0.000001"
                  value={form.costeIncrementalKm}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      costeIncrementalKm: event.target.value,
                    }))
                  }
                  disabled={!canManage || isSubmitting}
                />
              </label>
            </div>
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
