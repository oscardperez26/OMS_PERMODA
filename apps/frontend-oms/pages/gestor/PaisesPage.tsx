import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import {
  createPais,
  listPaises,
  updatePais,
  type PaisListItem,
} from '../../src/configuracion-general/pais.api';
import './PaisesPage.css';

type FormState = {
  codigoISO2: string;
  codigoISO3: string;
  nombre: string;
};

const INITIAL_FORM: FormState = {
  codigoISO2: '',
  codigoISO3: '',
  nombre: '',
};

export function PaisesPage() {
  const { accessToken, hasPermissions } = useAuth();
  const canManage = hasPermissions(['config.manage']);

  const [paises, setPaises] = useState<PaisListItem[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingPaisId, setEditingPaisId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadPaises() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const data = await listPaises(accessToken);
      setPaises(data);
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo cargar paises';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPaises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const sortedPaises = useMemo(
    () =>
      [...paises].sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.paisId - b.paisId;
      }),
    [paises],
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

    const payload = {
      codigoISO2: form.codigoISO2.trim().toUpperCase(),
      codigoISO3: form.codigoISO3.trim().toUpperCase() || undefined,
      nombre: form.nombre.trim(),
    };

    if (!payload.codigoISO2 || !payload.nombre) {
      setError('Codigo ISO2 y Nombre son obligatorios');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingPaisId) {
        await updatePais(accessToken, editingPaisId, payload);
      } else {
        await createPais(accessToken, payload);
      }

      setForm(INITIAL_FORM);
      setEditingPaisId(null);
      await loadPaises();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudo guardar pais';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(pais: PaisListItem) {
    setEditingPaisId(pais.paisId);
    setForm({
      codigoISO2: pais.codigoISO2,
      codigoISO3: pais.codigoISO3 ?? '',
      nombre: pais.nombre,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingPaisId(null);
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
    <section className="paises-page">
      <header className="paises-header">
        <h1>Paises</h1>
        <p>Gestion del catalogo base que alimenta ciudades y otros modulos.</p>
      </header>

      {error && <p className="paises-error">{error}</p>}

      {canManage && (
        <article className="paises-card">
          <h2>{editingPaisId ? 'Editar pais' : 'Crear pais'}</h2>
          <form className="paises-form" onSubmit={handleSubmit}>
            <label>
              Codigo ISO2
              <input
                type="text"
                value={form.codigoISO2}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    codigoISO2: event.target.value,
                  }))
                }
                maxLength={2}
                required
              />
            </label>

            <label>
              Codigo ISO3
              <input
                type="text"
                value={form.codigoISO3}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    codigoISO3: event.target.value,
                  }))
                }
                maxLength={3}
              />
            </label>

            <label className="paises-form-name">
              Nombre
              <input
                type="text"
                value={form.nombre}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    nombre: event.target.value,
                  }))
                }
                maxLength={240}
                required
              />
            </label>

            <div className="paises-form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingPaisId
                    ? 'Actualizar'
                    : 'Crear'}
              </button>

              {editingPaisId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>
      )}

      <article className="paises-card">
        <h2>Listado de paises</h2>
        {isLoading ? (
          <p className="paises-loading">Cargando paises...</p>
        ) : (
          <div className="paises-table-wrap">
            <table className="paises-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ISO2</th>
                  <th>ISO3</th>
                  <th>Nombre</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {sortedPaises.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="paises-empty-cell">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  sortedPaises.map((pais) => (
                    <tr key={pais.paisId}>
                      <td>{pais.paisId}</td>
                      <td>{pais.codigoISO2}</td>
                      <td>{pais.codigoISO3 ?? '-'}</td>
                      <td>{pais.nombre}</td>
                      <td>{formatDate(pais.createdAt)}</td>
                      <td>{formatDate(pais.updatedAt)}</td>
                      {canManage && (
                        <td>
                          <button type="button" onClick={() => startEdit(pais)}>
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
