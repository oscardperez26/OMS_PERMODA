import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  listDashboardOptions,
  type DashboardOption,
} from '../../src/configuracion-general/configuracion-general.api';
import './ConfiguracionGeneralPage.css';

export function ConfiguracionGeneralPage() {
  const { accessToken, hasPermissions } = useAuth();
  const [options, setOptions] = useState<DashboardOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      if (!accessToken) {
        if (mounted) {
          setError('Sesion no disponible');
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await listDashboardOptions(accessToken);
        if (!mounted) {
          return;
        }

        setOptions(data);
        setError('');
      } catch (requestError) {
        if (!mounted) {
          return;
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar configuracion general';
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOptions();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options],
  );

  return (
    <section className="config-general-page">
      <header className="config-general-header">
        <h1>Configuracion General</h1>
        <p>Panel central para administrar catalogos y opciones del sistema.</p>
      </header>

      {error && <p className="config-general-error">{error}</p>}

      {isLoading ? (
        <p className="config-general-loading">Cargando opciones...</p>
      ) : (
        <div className="config-general-grid">
          {sortedOptions.length === 0 ? (
            <p className="config-general-empty">
              No hay opciones configuradas para este dashboard.
            </p>
          ) : (
            sortedOptions.map((option) => {
              const hasAccess = hasPermissions([option.permission]);
              const canOpen = option.enabled && hasAccess;
              const statusLabel = option.enabled
                ? hasAccess
                  ? 'Disponible'
                  : 'Sin permiso'
                : 'Deshabilitada';

              return (
                <article
                  key={option.id}
                  className={`config-option-card ${canOpen ? '' : 'is-disabled'}`.trim()}
                >
                  <div className="config-option-header">
                    <h2>{option.label}</h2>
                    <span className={`config-option-status ${canOpen ? 'ok' : 'blocked'}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p>{option.description}</p>
                  {canOpen ? (
                    <Link to={option.frontendPath} className="config-option-link">
                      Abrir
                    </Link>
                  ) : (
                    <span className="config-option-link disabled">No disponible</span>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
