import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../src/auth/useAuth';
import { useBranding } from '../../src/branding/useBranding';
import {
  getStoreParamsBootstrap,
  updateStoreParams,
  type StoreParamsEmpresaClienteItem,
} from '../../src/configure/store-params.api';
import './StoreParamsPage.css';

type EmpresaOption = {
  empresaId: number;
  codigo: string;
  nombre: string;
};

type FormState = {
  displayName: string;
  logoUrl: string;
  faviconUrl: string;
};

const INITIAL_FORM: FormState = {
  displayName: '',
  logoUrl: '',
  faviconUrl: '',
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

export function StoreParamsPage() {
  const { accessToken, hasPermissions } = useAuth();
  const { reloadBranding } = useBranding();
  const canManage = hasPermissions(['config.manage']);

  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [empresaClientes, setEmpresaClientes] = useState<StoreParamsEmpresaClienteItem[]>([]);
  const [selectedEmpresaClienteId, setSelectedEmpresaClienteId] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadData() {
    if (!accessToken) {
      setError('Sesion no disponible');
      setIsLoading(false);
      return;
    }

    try {
      const bootstrap = await withRetry(() => getStoreParamsBootstrap(accessToken));
      const sortedEmpresaClientes = [...bootstrap.empresaClientes].sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre);
        return byName !== 0 ? byName : a.empresaClienteId - b.empresaClienteId;
      });

      setEmpresas([...bootstrap.empresas]);
      setEmpresaClientes(sortedEmpresaClientes);
      setSelectedEmpresaClienteId((previous) => {
        if (
          previous &&
          sortedEmpresaClientes.some(
            (empresaCliente) => String(empresaCliente.empresaClienteId) === previous,
          )
        ) {
          return previous;
        }
        return sortedEmpresaClientes.length > 0
          ? String(sortedEmpresaClientes[0].empresaClienteId)
          : '';
      });
      setError('');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar parametros de tienda';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const empresaMap = useMemo(() => {
    const map = new Map<number, EmpresaOption>();
    empresas.forEach((empresa) => map.set(empresa.empresaId, empresa));
    return map;
  }, [empresas]);

  const selectedEmpresaCliente = useMemo(() => {
    const selectedId = Number(selectedEmpresaClienteId);
    if (!Number.isInteger(selectedId) || selectedId <= 0) {
      return null;
    }
    return (
      empresaClientes.find(
        (empresaCliente) => empresaCliente.empresaClienteId === selectedId,
      ) ?? null
    );
  }, [empresaClientes, selectedEmpresaClienteId]);

  useEffect(() => {
    if (!selectedEmpresaCliente) {
      setForm(INITIAL_FORM);
      return;
    }

    setForm({
      displayName: selectedEmpresaCliente.displayName ?? '',
      logoUrl: selectedEmpresaCliente.logoUrl ?? '',
      faviconUrl: selectedEmpresaCliente.faviconUrl ?? '',
    });
    setSuccessMessage('');
  }, [selectedEmpresaCliente]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!accessToken) {
      setError('Sesion no disponible');
      return;
    }
    if (!canManage) {
      setError('No tienes permisos para editar parametros de tienda');
      return;
    }

    const empresaClienteId = Number(selectedEmpresaClienteId);
    if (!Number.isInteger(empresaClienteId) || empresaClienteId <= 0) {
      setError('Selecciona una empresa cliente valida');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      await updateStoreParams(accessToken, empresaClienteId, {
        displayName: form.displayName.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        faviconUrl: form.faviconUrl.trim() || null,
      });
      await loadData();
      await reloadBranding();
      setSuccessMessage('Branding actualizado correctamente');
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar parametros de tienda';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  const previewName =
    form.displayName.trim() || selectedEmpresaCliente?.nombre || 'Sin nombre visible';
  const previewLogo = form.logoUrl.trim();

  return (
    <section className="store-params-page">
      <header className="store-params-header">
        <h1>Parametros de la tienda</h1>
        <p>
          Configura branding por franquicia (empresa cliente) para panel y tienda.
        </p>
      </header>

      {error && <p className="store-params-error">{error}</p>}
      {successMessage && <p className="store-params-success">{successMessage}</p>}

      <article className="store-params-card">
        <form className="store-params-form" onSubmit={handleSubmit}>
          <label>
            Empresa cliente
            <select
              value={selectedEmpresaClienteId}
              onChange={(event) => setSelectedEmpresaClienteId(event.target.value)}
              disabled={isLoading || empresaClientes.length === 0}
              required
            >
              {empresaClientes.length === 0 ? (
                <option value="">Sin registros</option>
              ) : (
                empresaClientes.map((empresaCliente) => {
                  const empresa = empresaMap.get(empresaCliente.empresaId);
                  return (
                    <option
                      key={empresaCliente.empresaClienteId}
                      value={String(empresaCliente.empresaClienteId)}
                    >
                      {empresaCliente.nombre}
                      {empresa ? ` - ${empresa.nombre}` : ''} (#{empresaCliente.empresaClienteId})
                    </option>
                  );
                })
              )}
            </select>
          </label>

          <label>
            Nombre visible
            <input
              type="text"
              value={form.displayName}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, displayName: event.target.value }))
              }
              maxLength={180}
              placeholder="Ej: Pepito Store"
              disabled={!canManage || !selectedEmpresaCliente}
            />
          </label>

          <label>
            URL logo
            <input
              type="url"
              value={form.logoUrl}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, logoUrl: event.target.value }))
              }
              maxLength={800}
              placeholder="https://..."
              disabled={!canManage || !selectedEmpresaCliente}
            />
          </label>

          <label>
            URL favicon
            <input
              type="url"
              value={form.faviconUrl}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, faviconUrl: event.target.value }))
              }
              maxLength={800}
              placeholder="https://..."
              disabled={!canManage || !selectedEmpresaCliente}
            />
          </label>

          <div className="store-params-preview">
            <span>Vista previa</span>
            <div className="store-params-preview-box">
              {previewLogo ? (
                <img src={previewLogo} alt={previewName} />
              ) : (
                <strong>{previewName}</strong>
              )}
            </div>
          </div>

          <div className="store-params-actions">
            <button
              type="submit"
              disabled={!canManage || isSaving || !selectedEmpresaCliente}
            >
              {isSaving ? 'Guardando...' : 'Guardar branding'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
