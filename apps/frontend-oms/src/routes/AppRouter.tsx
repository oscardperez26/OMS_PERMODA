import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { ROUTES } from './routes';
import { ProtectedRoute } from './ProtectedRoute';
import { StoreLayout } from '../layout/tienda/StoreLayout/StoreLayout';
import { StoreLoginPage } from '../layout/tienda/loginpage/StoreLoginPage';
import { PanelLoginPage } from '../layout/panel/loginpage/PanelLoginPage';

// SELL
import { OrdersPage } from '../../pages/sell/orders/OrdersPage';
import { OrderDetailPage } from '../../pages/sell/orders/OrderDetailPage';
import { InvoicesPage } from '../../pages/sell/InvoicesPage';
import { CreditNotesPage } from '../../pages/sell/CreditNotesPage';
import { DeliveriesPage } from '../../pages/sell/DeliveriesPage';
import { CartsPage } from '../../pages/sell/CartsPage';

// CATALOG
import { ProductsPage } from '../../pages/catalog/ProductsPage';
import { CategoriesPage } from '../../pages/catalog/CategoriesPage';
import { MonitoringPage } from '../../pages/catalog/MonitoringPage';
import { AttributesPage } from '../../pages/catalog/AttributesPage';
import { BrandsPage } from '../../pages/catalog/BrandsPage';

// PERSONALIZE

import { ModulesPage } from '../../pages/personalize/ModulesPage';
import { DesignPage } from '../../pages/personalize/DesignPage';
import { TransportPage } from '../../pages/personalize/TransportPage';
import { PaymentPage } from '../../pages/personalize/PaymentPage';
import { StoreOrderDetailPage } from '../../pages/store/StoreOrderDetailPage';
import { StoreOrderTicketPage } from '../../pages/store/StoreOrderTicketPage';
import { StoreOrdersPage } from '../../pages/store/StoreOrdersPage';
import { ProfilesPage } from '../../pages/gestor/ProfilesPage';
import { ConfiguracionGeneralPage } from '../../pages/gestor/ConfiguracionGeneralPage';
import { PaisesPage } from '../../pages/gestor/PaisesPage';
import { CiudadesPage } from '../../pages/gestor/CiudadesPage';
import { MonedasPage } from '../../pages/gestor/MonedasPage';
import { EmpresasPage } from '../../pages/gestor/EmpresasPage';
import { EmpresaClientePage } from '../../pages/gestor/EmpresaClientePage';
import { PasarelaPagoPage } from '../../pages/gestor/PasarelaPagoPage';
import { TiendaPage } from '../../pages/gestor/TiendaPage';
import { BodegaPage } from '../../pages/gestor/BodegaPage';
import { ProductoPage } from '../../pages/gestor/ProductoPage';
import { ProductoVariantePage } from '../../pages/gestor/ProductoVariantePage';
import { InventarioPage } from '../../pages/gestor/InventarioPage';
import { TransportadoraPage } from '../../pages/gestor/TransportadoraPage';
import { TransportadoraConfiguracionPage } from '../../pages/gestor/TransportadoraConfiguracionPage';
import { TransportadoraApiPage } from '../../pages/gestor/TransportadoraApiPage';
import { ZonaTransportePage } from '../../pages/gestor/ZonaTransportePage';
import { ZonaCiudadPage } from '../../pages/gestor/ZonaCiudadPage';
import { CostoTransportePage } from '../../pages/gestor/CostoTransportePage';
import { StoreParamsPage } from '../../pages/configure/StoreParamsPage';
import { PermissionsPage } from '../../pages/gestor/PermissionsPage';
import { LogisticaPage } from '../../pages/gestor/LogisticaPage';
import { ComercialPage } from '../../pages/gestor/ComercialPage';
import { ParametrosBasePage } from '../../pages/gestor/ParametrosBasePage';
import { CatalogoInventarioPage } from '../../pages/gestor/CatalogoInventarioPage';
import { PagosIntegracionesPage } from '../../pages/gestor/PagosIntegracionesPage';
import { SeguridadAccesosPage } from '../../pages/gestor/SeguridadAccesosPage';
import { IntegracionesEntrantesPage } from '../../pages/gestor/IntegracionesEntrantesPage';
import { ZiSyncPage } from '../../pages/gestor/ZiSyncPage';


/**
 * AppRouter
 * ---------
 * Un solo frontend con dos dominios funcionales:
 * - /panel (admin)
 * - /tienda (usuarios de tienda)
 */
export function AppRouter() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/panel/login" element={<PanelLoginPage />} />
        <Route path="/tienda/login" element={<StoreLoginPage />} />
        <Route path="/" element={<Navigate to="/panel/login" replace />} />

        <Route
          path="/tienda"
          element={
            <ProtectedRoute
              loginPath="/tienda/login"
              allowedRoles={['STORE_ADMIN', 'STORE_READONLY']}
              requiredPermissions={['orders.read']}
            >
              <StoreLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/tienda/orders" replace />} />

          {/* Lista: /tienda/orders */}
          <Route path="orders" element={<StoreOrdersPage />} />

          {/*
           * Detalle: /tienda/orders/:orderId
           * Usa el orderId de negocio (ej: 629) como parámetro de URL.
           * StoreOrderDetailPage lo lee con useParams({ orderId }).
           */}
          <Route path="orders/:orderId" element={<StoreOrderDetailPage />} />

          {/*
           * Ticket imprimible: /tienda/orders/:orderId/ticket
           * Renderiza un recibo en estilo monoespaciado y lanza
           * window.print() automáticamente cuando el componente monta.
           */}
          <Route path="orders/:orderId/ticket" element={<StoreOrderTicketPage />} />
        </Route>

        <Route
          path={ROUTES.PANEL_ROOT}
          element={
            <ProtectedRoute
              loginPath="/panel/login"
              allowedRoles={['ADMIN', 'PANEL_READONLY']}
              requiredPermissions={['orders.read']}
            >
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={ROUTES.SELL_ORDERS} replace />} />

          <Route path={ROUTES.SELL_ORDERS} element={<OrdersPage />} />
          <Route path={`${ROUTES.SELL_ORDERS}/:id`} element={<OrderDetailPage />} />
          <Route path={ROUTES.SELL_INVOICES} element={<InvoicesPage />} />
          <Route path={ROUTES.SELL_CREDIT_NOTES} element={<CreditNotesPage />} />
          <Route path={ROUTES.SELL_DELIVERIES} element={<DeliveriesPage />} />
          <Route path={ROUTES.SELL_CARTS} element={<CartsPage />} />

          <Route path={ROUTES.CATALOG_PRODUCTS} element={<ProductsPage />} />
          <Route path={ROUTES.CATALOG_CATEGORIES} element={<CategoriesPage />} />
          <Route path={ROUTES.CATALOG_MONITORING} element={<MonitoringPage />} />
          <Route path={ROUTES.CATALOG_ATTRIBUTES} element={<AttributesPage />} />
          <Route path={ROUTES.CATALOG_BRANDS_SUPPLIERS} element={<BrandsPage />} />

          <Route path={ROUTES.PERSONALIZE_MODULES} element={<ModulesPage />} />
          <Route path={ROUTES.PERSONALIZE_DESIGN} element={<DesignPage />} />
          <Route path={ROUTES.PERSONALIZE_TRANSPORT} element={<TransportPage />} />
          <Route path={ROUTES.PERSONALIZE_PAYMENT} element={<PaymentPage />} />

          <Route
            path="configure/store-params"
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <StoreParamsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_COMERCIAL_STORE_PARAMS}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <StoreParamsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ConfiguracionGeneralPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_LOGISTICA}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <LogisticaPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_COMERCIAL}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ComercialPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PARAMETROS_BASE}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ParametrosBasePage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_CATALOGO_INVENTARIO}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <CatalogoInventarioPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PAGOS_INTEGRACIONES}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <PagosIntegracionesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_INTEGRACIONES}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <IntegracionesEntrantesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_INTEGRACIONES_ENTRANTES}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <IntegracionesEntrantesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZI_SYNC}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ZiSyncPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_SEGURIDAD_ACCESOS}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['users.manage']}
              >
                <SeguridadAccesosPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PAIS}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <PaisesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_CIUDAD}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <CiudadesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_MONEDA}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <MonedasPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_EMPRESA}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <EmpresasPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_EMPRESA_CLIENTE}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <EmpresaClientePage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PASARELA_PAGO}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <PasarelaPagoPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TIENDA}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <TiendaPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_BODEGA}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <BodegaPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ProductoPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO_VARIANTE}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ProductoVariantePage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_INVENTARIO}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <InventarioPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <TransportadoraPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA_CONFIG}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <TransportadoraConfiguracionPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZONA_TRANSPORTE}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ZonaTransportePage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZONA_CIUDAD}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <ZonaCiudadPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_COSTO_TRANSPORTE}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <CostoTransportePage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_PROFILES}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['users.manage']}
              >
                <ProfilesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA_API}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['config.read']}
              >
                <TransportadoraApiPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORDER_MANAGER_PERMISSIONS}
            element={
              <ProtectedRoute
                loginPath="/panel/login"
                requiredPermissions={['security.manage']}
              >
                <PermissionsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<h1>404 - Pagina no encontrada</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
