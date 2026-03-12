import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  listDashboardOptions,
  type DashboardOption,
} from '../../src/configuracion-general/configuracion-general.api';
import { ROUTES } from '../../src/routes/routes';
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

  const parentOptions = useMemo<DashboardOption[]>(() => {
    const defaults: DashboardOption[] = [
      {
        id: 'logistica',
        label: 'Logistica',
        description:
          'Modulo padre para configurar transportadoras, zonas y costos de envio.',
        frontendPath: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_LOGISTICA,
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'comercial',
        label: 'Comercial / Franquicias',
        description:
          'Modulo padre para branding de franquicias, tiendas y gestion comercial.',
        frontendPath: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_COMERCIAL,
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'parametros-base',
        label: 'Parametros Base',
        description: 'Modulo padre para paises, ciudades y monedas.',
        frontendPath: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PARAMETROS_BASE,
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'catalogo-inventario',
        label: 'Catalogo e Inventario',
        description: 'Modulo padre para productos, variantes e inventario.',
        frontendPath: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_CATALOGO_INVENTARIO,
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'pagos-integraciones',
        label: 'Pagos e Integraciones',
        description: 'Modulo padre para pasarelas de pago e integraciones.',
        frontendPath: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PAGOS_INTEGRACIONES,
        permission: 'config.read',
        enabled: true,
      },
      {
        id: 'seguridad-accesos',
        label: 'Seguridad y Accesos',
        description: 'Modulo padre para perfiles, permisos y control de acceso.',
        frontendPath: ROUTES.ORDER_MANAGER_SEGURIDAD_ACCESOS,
        permission: 'users.manage',
        enabled: true,
      },
    ];

    const optionsByPath = new Map(options.map((option) => [option.frontendPath, option]));

    return defaults.map((defaultOption) => {
      const fromApi = optionsByPath.get(defaultOption.frontendPath);
      if (!fromApi) {
        return defaultOption;
      }

      return {
        ...defaultOption,
        label: fromApi.label || defaultOption.label,
        description: fromApi.description || defaultOption.description,
        permission: fromApi.permission,
        enabled: fromApi.enabled,
      };
    });
  }, [options]);

  return (
    <section className="config-general-page">
      <header className="config-general-header">
        <h1>Configuracion General</h1>
        <p>Panel padre para navegar por modulos de configuracion del sistema.</p>
      </header>

      {error && <p className="config-general-error">{error}</p>}

      {isLoading ? (
        <p className="config-general-loading">Cargando opciones...</p>
      ) : (
        <div className="config-general-grid">
          {parentOptions.length === 0 ? (
            <p className="config-general-empty">
              No hay opciones configuradas para este dashboard.
            </p>
          ) : (
            parentOptions.map((option) => {
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
