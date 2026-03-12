import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../src/auth/useAuth';
import {
  getLogisticaBootstrap,
  type LogisticaBootstrapResponse,
} from '../../src/configuracion-general/configuracion-general.api';
import { ROUTES } from '../../src/routes/routes';
import './LogisticaPage.css';

type LogisticaCard = {
  id: string;
  title: string;
  description: string;
  path: string;
  total: number;
  status: 'ok' | 'warn';
  statusLabel: string;
};

function toLocalDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('es-CO');
}

export function LogisticaPage() {
  const { accessToken } = useAuth();
  const [bootstrap, setBootstrap] = useState<LogisticaBootstrapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadBootstrap() {
      if (!accessToken) {
        if (mounted) {
          setError('Sesion no disponible');
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await getLogisticaBootstrap(accessToken);
        if (!mounted) {
          return;
        }

        setBootstrap(response);
        setError('');
      } catch (requestError) {
        if (!mounted) {
          return;
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar el dashboard de logistica';
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const cards = useMemo<LogisticaCard[]>(() => {
    const data = bootstrap ?? {
      transportadorasTotal: 0,
      zonasTransporteTotal: 0,
      zonaCiudadRelacionesTotal: 0,
      costosTransporteTotal: 0,
      lastUpdatedAt: new Date().toISOString(),
    };

    return [
      {
        id: 'transportadoras',
        title: 'Transportadoras',
        description: 'Configura proveedores de envio y su operacion por empresa.',
        path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA,
        total: data.transportadorasTotal,
        status: data.transportadorasTotal > 0 ? 'ok' : 'warn',
        statusLabel: data.transportadorasTotal > 0 ? 'Configurado' : 'Pendiente',
      },
      {
        id: 'zonas-transporte',
        title: 'Zonas de Transporte',
        description: 'Administra zonas logisticas base para reglas y tarifas.',
        path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZONA_TRANSPORTE,
        total: data.zonasTransporteTotal,
        status: data.zonasTransporteTotal > 0 ? 'ok' : 'warn',
        statusLabel: data.zonasTransporteTotal > 0 ? 'Configurado' : 'Pendiente',
      },
      {
        id: 'zona-ciudad',
        title: 'Zona - Ciudad',
        description: 'Relaciona ciudades con sus zonas operativas de transporte.',
        path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZONA_CIUDAD,
        total: data.zonaCiudadRelacionesTotal,
        status: data.zonaCiudadRelacionesTotal > 0 ? 'ok' : 'warn',
        statusLabel: data.zonaCiudadRelacionesTotal > 0 ? 'Configurado' : 'Pendiente',
      },
      {
        id: 'costos-transporte',
        title: 'Costos de Transporte',
        description: 'Define tarifas por zona, transportadora y rango operativo.',
        path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_COSTO_TRANSPORTE,
        total: data.costosTransporteTotal,
        status: data.costosTransporteTotal > 0 ? 'ok' : 'warn',
        statusLabel: data.costosTransporteTotal > 0 ? 'Configurado' : 'Pendiente',
      },
    ];
  }, [bootstrap]);

  return (
    <section className="logistica-page">
      <header className="logistica-header">
        <h1>Logistica</h1>
        <p>
          Modulo padre para organizar transportadoras, zonas y costos de transporte.
        </p>
      </header>

      {error && <p className="logistica-error">{error}</p>}

      {isLoading ? (
        <p className="logistica-loading">Cargando modulo logistica...</p>
      ) : (
        <>
          <p className="logistica-updated-at">
            Ultima actualizacion: {toLocalDate(bootstrap?.lastUpdatedAt ?? '')}
          </p>

          <div className="logistica-grid">
            {cards.map((card) => (
              <article key={card.id} className="logistica-card">
                <div className="logistica-card-header">
                  <h2>{card.title}</h2>
                  <span className={`logistica-status ${card.status}`}>
                    {card.statusLabel}
                  </span>
                </div>

                <p>{card.description}</p>

                <div className="logistica-metric">
                  <span>Total registros</span>
                  <strong>{card.total}</strong>
                </div>

                <Link to={card.path} className="logistica-link">
                  Abrir
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
      <Link to="/panel/order-manager/configuracion-general" className="transportadora-back-link">
        Volver a Configuracion General
      </Link>
    </section>
    
  );
}
