import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createCostoTransporte,
  getCostosTransporteBootstrap,
  updateCostoTransporte,
  type CostoTransporteListItem,
} from '../../src/configuracion-general/costo-transporte.api';
import './CostoTransportePage.css';
import { Link } from 'react-router-dom';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type ZonaOption = {
  zonaTransporteId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

type TransportadoraOption = {
  transportadoraId: number;
  empresaId: number;
  codigo: string;
  nombre: string;
};

type MonedaOption = {
  monedaId: number;
  codigo: string;
  nombre: string;
};

type FormState = {
  empresaId: string;
  zonaTransporteId: string;
  transportadoraId: string;
  monedaId: string;
  pesoMinKg: string;
  pesoMaxKg: string;
  valorMin: string;
  valorMax: string;
  costo: string;
  diasMin: string;
  diasMax: string;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  empresaId: '',
  zonaTransporteId: '',
  transportadoraId: '',
  monedaId: '',
  pesoMinKg: '',
  pesoMaxKg: '',
  valorMin: '',
  valorMax: '',
  costo: '',
  diasMin: '',
  diasMax: '',
  activo: true,
};

async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }

  throw lastError;
}

export function CostoTransportePage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [costosTransporte, setCostosTransporte] = useState<CostoTransporteListItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [zonasTransporte, setZonasTransporte] = useState<ZonaOption[]>([]);
  const [transportadoras, setTransportadoras] = useState<TransportadoraOption[]>([]);
  const [monedas, setMonedas] = useState<MonedaOption[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingCostoTransporteId, setEditingCostoTransporteId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const bootstrap = await withRetry(() => getCostosTransporteBootstrap(accessToken));
      setCostosTransporte(bootstrap.costosTransporte);
      setEmpresas(
        [...bootstrap.empresas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.empresaId - b.empresaId;
        }),
      );
      setZonasTransporte(
        [...bootstrap.zonasTransporte].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.zonaTransporteId - b.zonaTransporteId;
        }),
      );
      setTransportadoras(
        [...bootstrap.transportadoras].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.transportadoraId - b.transportadoraId;
        }),
      );
      setMonedas(
        [...bootstrap.monedas].sort((a, b) => {
          const byName = a.nombre.localeCompare(b.nombre);
          return byName !== 0 ? byName : a.monedaId - b.monedaId;
        }),
      );
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar costos de transporte';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (form.empresaId || empresas.length === 0) {
      return;
    }
    setForm((previous) => ({ ...previous, empresaId: String(empresas[0].empresaId) }));
  }, [empresas, form.empresaId]);

  const zonasPorEmpresa = useMemo(() => {
    const empresaId = Number(form.empresaId);
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      return [] as ZonaOption[];
    }
    return zonasTransporte.filter((zona) => zona.empresaId === empresaId);
  }, [form.empresaId, zonasTransporte]);

  const transportadorasPorEmpresa = useMemo(() => {
    const empresaId = Number(form.empresaId);
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      return [] as TransportadoraOption[];
    }
    return transportadoras.filter((transportadora) => transportadora.empresaId === empresaId);
  }, [form.empresaId, transportadoras]);

  useEffect(() => {
    if (!form.empresaId) {
      return;
    }

    const zonaValida = zonasPorEmpresa.some(
      (zona) => String(zona.zonaTransporteId) === form.zonaTransporteId,
    );
    const transportadoraValida = transportadorasPorEmpresa.some(
      (transportadora) =>
        String(transportadora.transportadoraId) === form.transportadoraId,
    );

    setForm((previous) => ({
      ...previous,
      zonaTransporteId: zonaValida
        ? previous.zonaTransporteId
        : String(zonasPorEmpresa[0]?.zonaTransporteId ?? ''),
      transportadoraId: transportadoraValida
        ? previous.transportadoraId
        : String(transportadorasPorEmpresa[0]?.transportadoraId ?? ''),
    }));
  }, [form.empresaId, form.transportadoraId, form.zonaTransporteId, transportadorasPorEmpresa, zonasPorEmpresa]);

  useEffect(() => {
    if (form.monedaId || monedas.length === 0) {
      return;
    }
    setForm((previous) => ({ ...previous, monedaId: String(monedas[0].monedaId) }));
  }, [form.monedaId, monedas]);

  const empresaMap = useMemo(() => {
    const map = new Map<number, EmpresaOption>();
    empresas.forEach((empresa) => {
      map.set(empresa.empresaId, empresa);
    });
    return map;
  }, [empresas]);

  const zonaMap = useMemo(() => {
    const map = new Map<number, ZonaOption>();
    zonasTransporte.forEach((zona) => {
      map.set(zona.zonaTransporteId, zona);
    });
    return map;
  }, [zonasTransporte]);

  const transportadoraMap = useMemo(() => {
    const map = new Map<number, TransportadoraOption>();
    transportadoras.forEach((transportadora) => {
      map.set(transportadora.transportadoraId, transportadora);
    });
    return map;
  }, [transportadoras]);

  const monedaMap = useMemo(() => {
    const map = new Map<number, MonedaOption>();
    monedas.forEach((moneda) => {
      map.set(moneda.monedaId, moneda);
    });
    return map;
  }, [monedas]);

  const sortedCostos = useMemo(
    () =>
      [...costosTransporte].sort((a, b) => {
        if (a.empresaId !== b.empresaId) {
          return a.empresaId - b.empresaId;
        }
        if (a.zonaTransporteId !== b.zonaTransporteId) {
          return a.zonaTransporteId - b.zonaTransporteId;
        }
        if (a.transportadoraId !== b.transportadoraId) {
          return a.transportadoraId - b.transportadoraId;
        }
        return Number(a.costoTransporteId) - Number(b.costoTransporteId);
      }),
    [costosTransporte],
  );

  function parseOptionalNumber(value: string): number | undefined {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function parseOptionalInteger(value: string): number | undefined {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isInteger(parsed) ? parsed : undefined;
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

    const empresaId = Number(form.empresaId);
    const zonaTransporteId = Number(form.zonaTransporteId);
    const transportadoraId = Number(form.transportadoraId);
    const monedaId = Number(form.monedaId);
    const pesoMinKg = parseOptionalNumber(form.pesoMinKg);
    const pesoMaxKg = parseOptionalNumber(form.pesoMaxKg);
    const valorMin = parseOptionalNumber(form.valorMin);
    const valorMax = parseOptionalNumber(form.valorMax);
    const costo = Number(form.costo.trim());
    const diasMin = parseOptionalInteger(form.diasMin);
    const diasMax = parseOptionalInteger(form.diasMax);

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      setError('Empresa es obligatoria');
      return;
    }
    if (!Number.isInteger(zonaTransporteId) || zonaTransporteId <= 0) {
      setError('Zona de transporte es obligatoria');
      return;
    }
    if (!Number.isInteger(transportadoraId) || transportadoraId <= 0) {
      setError('Transportadora es obligatoria');
      return;
    }
    if (!Number.isInteger(monedaId) || monedaId <= 0) {
      setError('Moneda es obligatoria');
      return;
    }

    const optionalNumbers = [
      ['pesoMinKg', pesoMinKg],
      ['pesoMaxKg', pesoMaxKg],
      ['valorMin', valorMin],
      ['valorMax', valorMax],
    ] as const;

    const invalidNumber = optionalNumbers.find(
      ([, value]) => value !== undefined && (!Number.isFinite(value) || value < 0),
    );
    if (invalidNumber) {
      setError(`El campo ${invalidNumber[0]} debe ser numerico >= 0`);
      return;
    }

    if (!Number.isFinite(costo) || costo < 0) {
      setError('Costo es obligatorio y debe ser numerico >= 0');
      return;
    }

    const optionalIntegers = [
      ['diasMin', diasMin],
      ['diasMax', diasMax],
    ] as const;
    const invalidInteger = optionalIntegers.find(
      ([, value]) => value !== undefined && (!Number.isInteger(value) || value < 0),
    );
    if (invalidInteger) {
      setError(`El campo ${invalidInteger[0]} debe ser entero >= 0`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingCostoTransporteId) {
        await updateCostoTransporte(accessToken, editingCostoTransporteId, {
          empresaId,
          zonaTransporteId,
          transportadoraId,
          monedaId,
          pesoMinKg: pesoMinKg ?? null,
          pesoMaxKg: pesoMaxKg ?? null,
          valorMin: valorMin ?? null,
          valorMax: valorMax ?? null,
          costo,
          diasMin: diasMin ?? null,
          diasMax: diasMax ?? null,
          activo: form.activo,
        });
      } else {
        await createCostoTransporte(accessToken, {
          empresaId,
          zonaTransporteId,
          transportadoraId,
          monedaId,
          pesoMinKg,
          pesoMaxKg,
          valorMin,
          valorMax,
          costo,
          diasMin,
          diasMax,
          activo: form.activo,
        });
      }

      setForm((previous) => ({
        ...INITIAL_FORM,
        empresaId: previous.empresaId,
        zonaTransporteId: previous.zonaTransporteId,
        transportadoraId: previous.transportadoraId,
        monedaId: previous.monedaId,
      }));
      setEditingCostoTransporteId(null);
      await loadData();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar costo de transporte';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(costoTransporte: CostoTransporteListItem) {
    setEditingCostoTransporteId(costoTransporte.costoTransporteId);
    setForm({
      empresaId: String(costoTransporte.empresaId),
      zonaTransporteId: String(costoTransporte.zonaTransporteId),
      transportadoraId: String(costoTransporte.transportadoraId),
      monedaId: String(costoTransporte.monedaId),
      pesoMinKg:
        costoTransporte.pesoMinKg === undefined ? '' : String(costoTransporte.pesoMinKg),
      pesoMaxKg:
        costoTransporte.pesoMaxKg === undefined ? '' : String(costoTransporte.pesoMaxKg),
      valorMin: costoTransporte.valorMin === undefined ? '' : String(costoTransporte.valorMin),
      valorMax: costoTransporte.valorMax === undefined ? '' : String(costoTransporte.valorMax),
      costo: String(costoTransporte.costo),
      diasMin: costoTransporte.diasMin === undefined ? '' : String(costoTransporte.diasMin),
      diasMax: costoTransporte.diasMax === undefined ? '' : String(costoTransporte.diasMax),
      activo: costoTransporte.activo,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingCostoTransporteId(null);
    setForm((previous) => ({
      ...INITIAL_FORM,
      empresaId: previous.empresaId || String(empresas[0]?.empresaId ?? ''),
      zonaTransporteId: previous.zonaTransporteId,
      transportadoraId: previous.transportadoraId,
      monedaId: previous.monedaId || String(monedas[0]?.monedaId ?? ''),
    }));
    setError('');
  }

  function formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-CO');
  }

  function formatRange(min?: number, max?: number): string {
    if (min === undefined && max === undefined) {
      return '-';
    }
    const minLabel = min === undefined ? '-inf' : String(min);
    const maxLabel = max === undefined ? '+inf' : String(max);
    return `${minLabel} - ${maxLabel}`;
  }

  return (
    <section className="costo-transporte-page">
      <header className="costo-transporte-header">
        <h1>Costos de Transporte</h1>
        <p>Definicion de costos y rangos por empresa, zona, transportadora y moneda.</p>
      </header>

      {error && <p className="costo-transporte-error">{error}</p>}

      {canManage && (
        <article className="costo-transporte-card">
          <h2>{editingCostoTransporteId ? 'Editar costo transporte' : 'Crear costo transporte'}</h2>
          <form className="costo-transporte-form" onSubmit={handleSubmit}>
            <label>
              Empresa
              <select
                value={form.empresaId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, empresaId: event.target.value }))
                }
                required
              >
                {empresas.map((empresa) => (
                  <option key={empresa.empresaId} value={String(empresa.empresaId)}>
                    {empresa.nombre} ({empresa.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Zona transporte
              <select
                value={form.zonaTransporteId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, zonaTransporteId: event.target.value }))
                }
                required
              >
                {zonasPorEmpresa.map((zona) => (
                  <option key={zona.zonaTransporteId} value={String(zona.zonaTransporteId)}>
                    {zona.nombre} ({zona.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Transportadora
              <select
                value={form.transportadoraId}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    transportadoraId: event.target.value,
                  }))
                }
                required
              >
                {transportadorasPorEmpresa.map((transportadora) => (
                  <option
                    key={transportadora.transportadoraId}
                    value={String(transportadora.transportadoraId)}
                  >
                    {transportadora.nombre} ({transportadora.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Moneda
              <select
                value={form.monedaId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, monedaId: event.target.value }))
                }
                required
              >
                {monedas.map((moneda) => (
                  <option key={moneda.monedaId} value={String(moneda.monedaId)}>
                    {moneda.nombre} ({moneda.codigo})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Peso min (kg)
              <input
                type="number"
                step="0.001"
                min={0}
                value={form.pesoMinKg}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, pesoMinKg: event.target.value }))
                }
              />
            </label>

            <label>
              Peso max (kg)
              <input
                type="number"
                step="0.001"
                min={0}
                value={form.pesoMaxKg}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, pesoMaxKg: event.target.value }))
                }
              />
            </label>

            <label>
              Valor min
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.valorMin}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, valorMin: event.target.value }))
                }
              />
            </label>

            <label>
              Valor max
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.valorMax}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, valorMax: event.target.value }))
                }
              />
            </label>

            <label>
              Costo
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.costo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, costo: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Dias min
              <input
                type="number"
                min={0}
                value={form.diasMin}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, diasMin: event.target.value }))
                }
              />
            </label>

            <label>
              Dias max
              <input
                type="number"
                min={0}
                value={form.diasMax}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, diasMax: event.target.value }))
                }
              />
            </label>

            <label className="costo-transporte-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, activo: event.target.checked }))
                }
              />
              Activo
            </label>

            <div className="costo-transporte-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingCostoTransporteId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingCostoTransporteId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="costo-transporte-card">
        <h2>Listado de costos</h2>
        {isLoading ? (
          <p className="costo-transporte-loading">Cargando costos...</p>
        ) : (
          <div className="costo-transporte-table-wrap">
            <table className="costo-transporte-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Zona</th>
                  <th>Transportadora</th>
                  <th>Moneda</th>
                  <th>Peso (kg)</th>
                  <th>Valor</th>
                  <th>Dias</th>
                  <th>Costo</th>
                  <th>Activo</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedCostos.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 13 : 12} className="costo-transporte-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedCostos.map((costoTransporte) => {
                    const empresa = empresaMap.get(costoTransporte.empresaId);
                    const zona = zonaMap.get(costoTransporte.zonaTransporteId);
                    const transportadora = transportadoraMap.get(
                      costoTransporte.transportadoraId,
                    );
                    const moneda = monedaMap.get(costoTransporte.monedaId);

                    return (
                      <tr key={costoTransporte.costoTransporteId}>
                        <td>{costoTransporte.costoTransporteId}</td>
                        <td>
                          {empresa
                            ? `${empresa.nombre} (${empresa.codigo})`
                            : `EmpresaId ${costoTransporte.empresaId}`}
                        </td>
                        <td>
                          {zona
                            ? `${zona.nombre} (${zona.codigo})`
                            : `ZonaId ${costoTransporte.zonaTransporteId}`}
                        </td>
                        <td>
                          {transportadora
                            ? `${transportadora.nombre} (${transportadora.codigo})`
                            : `TransportadoraId ${costoTransporte.transportadoraId}`}
                        </td>
                        <td>
                          {moneda
                            ? `${moneda.nombre} (${moneda.codigo})`
                            : `MonedaId ${costoTransporte.monedaId}`}
                        </td>
                        <td>
                          {formatRange(costoTransporte.pesoMinKg, costoTransporte.pesoMaxKg)}
                        </td>
                        <td>
                          {formatRange(costoTransporte.valorMin, costoTransporte.valorMax)}
                        </td>
                        <td>
                          {formatRange(costoTransporte.diasMin, costoTransporte.diasMax)}
                        </td>
                        <td>{costoTransporte.costo}</td>
                        <td>{costoTransporte.activo ? 'Si' : 'No'}</td>
                        <td>{formatDate(costoTransporte.createdAt)}</td>
                        <td>{formatDate(costoTransporte.updatedAt)}</td>
                        {canManage && (
                          <td>
                            <button type="button" onClick={() => startEdit(costoTransporte)}>
                              Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
                    <Link to="/panel/order-manager/configuracion-general/logistica" className="transportadora-back-link">
                      volver 
                    </Link>
    </section>
  );
}
