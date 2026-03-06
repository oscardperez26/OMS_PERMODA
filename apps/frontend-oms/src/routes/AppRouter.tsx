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
import { StoreOrdersPage } from '../../pages/store/StoreOrdersPage';
import { StoreOrderDetailPage } from '../../pages/store/StoreOrderDetailPage';
import { StoreOrderTicketPage } from '../../pages/store/StoreOrderTicketPage';



/**
 * AppRouter
 * ---------
 * Un solo frontend con dos dominios funcionales:
 * - /panel (admin)
 * - /tienda (usuarios de tienda)
 */
export function AppRouter() {
  return (
    <BrowserRouter>
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
              allowedRoles={['ADMIN']}
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

          <Route path="*" element={<h1>404 - Pagina no encontrada</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
