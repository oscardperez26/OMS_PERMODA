import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createMoneda,
  listMonedas,
  updateMoneda,
  type MonedaListItem,
} from '../../src/configuracion-general/moneda.api';
import './MonedasPage.css';

type FormState = {
  codigo: string;
  simbolo: string;
  nombre: string;
  decimales: string;
};

const INITIAL_FORM: FormState = {
  codigo: '',
  simbolo: '',
  nombre: '',
  decimales: '2',
};

export function MonedasPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['catalog.manage']);

  const [monedas, setMonedas] = useState<MonedaListItem[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingMonedaId, setEditingMonedaId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadMonedas() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const data = await listMonedas(accessToken);
      setMonedas(data);
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar monedas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMonedas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const sortedMonedas = useMemo(
    () =>
      [...monedas].sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.monedaId - b.monedaId;
      }),
    [monedas],
  );

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
    const simbolo = form.simbolo.trim() || undefined;
    const decimalesInput = form.decimales.trim();
    const decimales = decimalesInput === '' ? 2 : Number(decimalesInput);

    if (codigo.length !== 3) {
      setError('Codigo debe tener exactamente 3 caracteres');
      return;
    }

    if (!nombre) {
      setError('Nombre es obligatorio');
      return;
    }

    if (!Number.isInteger(decimales) || decimales < 0 || decimales > 255) {
      setError('Decimales debe ser un entero entre 0 y 255');
      return;
    }

    const payload = {
      codigo,
      simbolo,
      nombre,
      decimales,
    };

    setIsSubmitting(true);
    setError('');

    try {
      if (editingMonedaId) {
        await updateMoneda(accessToken, editingMonedaId, payload);
      } else {
        await createMoneda(accessToken, payload);
      }

      setForm(INITIAL_FORM);
      setEditingMonedaId(null);
      await loadMonedas();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar moneda';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(moneda: MonedaListItem) {
    setEditingMonedaId(moneda.monedaId);
    setForm({
      codigo: moneda.codigo,
      simbolo: moneda.simbolo ?? '',
      nombre: moneda.nombre,
      decimales: String(moneda.decimales),
    });
    setError('');
  }

  function cancelEdit() {
    setEditingMonedaId(null);
    setForm(INITIAL_FORM);
    setError('');
  }

  function formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-CO');
  }

  return (
    <section className="monedas-page">
      <header className="monedas-header">
        <h1>Monedas</h1>
        <p>Gestion de monedas usadas por empresas y configuraciones comerciales.</p>
      </header>

      {error && <p className="monedas-error">{error}</p>}

      {canManage && (
        <article className="monedas-card">
          <h2>{editingMonedaId ? 'Editar moneda' : 'Crear moneda'}</h2>
          <form className="monedas-form" onSubmit={handleSubmit}>
            <label>
              Codigo
              <input
                type="text"
                value={form.codigo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, codigo: event.target.value }))
                }
                maxLength={3}
                required
              />
            </label>

            <label>
              Simbolo
              <input
                type="text"
                value={form.simbolo}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, simbolo: event.target.value }))
                }
                maxLength={10}
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
                maxLength={60}
                required
              />
            </label>

            <label>
              Decimales
              <input
                type="number"
                value={form.decimales}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, decimales: event.target.value }))
                }
                min={0}
                max={255}
              />
            </label>

            <div className="monedas-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingMonedaId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingMonedaId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="monedas-card">
        <h2>Listado de monedas</h2>
        {isLoading ? (
          <p className="monedas-loading">Cargando monedas...</p>
        ) : (
          <div className="monedas-table-wrap">
            <table className="monedas-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Codigo</th>
                  <th>Simbolo</th>
                  <th>Nombre</th>
                  <th>Decimales</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedMonedas.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="monedas-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedMonedas.map((moneda) => (
                    <tr key={moneda.monedaId}>
                      <td>{moneda.monedaId}</td>
                      <td>{moneda.codigo}</td>
                      <td>{moneda.simbolo ?? '-'}</td>
                      <td>{moneda.nombre}</td>
                      <td>{moneda.decimales}</td>
                      <td>{formatDate(moneda.createdAt)}</td>
                      <td>{formatDate(moneda.updatedAt)}</td>
                      {canManage && (
                        <td>
                          <button type="button" onClick={() => startEdit(moneda)}>
                            Editar
                          </button>
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
    </section>
  );
}
