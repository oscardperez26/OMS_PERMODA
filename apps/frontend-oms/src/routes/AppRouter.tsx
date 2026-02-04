import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { ROUTES } from "./routes";

// SELL
import { OrdersPage } from "../../pages/sell/orders/OrdersPage";
import { OrderDetailPage } from "../../pages/sell/orders/OrderDetailPage";
import { InvoicesPage } from "../../pages/sell/InvoicesPage";
import { CreditNotesPage } from "../../pages/sell/CreditNotesPage";
import { DeliveriesPage } from "../../pages/sell/DeliveriesPage";
import { CartsPage } from "../../pages/sell/CartsPage";

// CATALOG
import { ProductsPage } from "../../pages/catalog/ProductsPage";
import { CategoriesPage } from "../../pages/catalog/CategoriesPage";
import { MonitoringPage } from "../../pages/catalog/MonitoringPage";
import { AttributesPage } from "../../pages/catalog/AttributesPage";
import { BrandsPage } from "../../pages/catalog/BrandsPage";

// PERSONALIZE
import { ModulesPage } from "../../pages/personalize/ModulesPage";
import { DesignPage } from "../../pages/personalize/DesignPage";
import { TransportPage } from "../../pages/personalize/TransportPage";
import { PaymentPage } from "../../pages/personalize/PaymentPage";
import { StoreLayout } from "../layout/tienda/StoreLayout/StoreLayout";
import { StoreOrdersPage } from "../../pages/store/StoreOrdersPage";
import { LoginPage } from "../../pages/auth/LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { StoreLoginPage } from "../layout/tienda/loginpage/StoreLoginPage";
import { PanelLoginPage } from "../layout/panel/loginpage/PanelLoginPage";

// CONFIGURE
//import { StoreParamsPage } from '../pages/configure/StoreParamsPage';
//import { AdvancedParamsPage } from '../pages/configure/AdvancedParamsPage';

// ORDER MANAGER
//import { ProfilesPage } from '../pages/order-manager/ProfilesPage';
//import { EmployeesPage } from '../pages/order-manager/EmployeesPage';
//import { PermissionsPage } from '../pages/order-manager/PermissionsPage';
//import { EmployeeAccessPage } from '../pages/order-manager/EmployeeAccessPage';

/**
 * AppRouter
 * ---------
 * Define rutas y páginas dentro del layout del panel.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Logins independientes */}
        <Route path="/panel/login" element={<PanelLoginPage />} />
        <Route path="/tienda/login" element={<StoreLoginPage />} />

        {/* Redirección raíz -> ir al login (puedes cambiar a /panel si prefieres) */}
        <Route path="/" element={<Navigate to="/panel/login" replace />} />


        {/* TIENDA (Store) */}
        <Route
          path="/tienda"
          element={
            <ProtectedRoute allowedRole="STORE">
              <StoreLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/tienda/orders" replace />} />
          <Route path="orders" element={<StoreOrdersPage />} />
          {/* futuro */}
          {/* <Route path="orders/:id" element={<StoreOrderDetailPage />} /> */}
        </Route>

        {/* PANEL PRINCIPAL OMS */}

        <Route
          path={ROUTES.PANEL_ROOT}
          element={
            <ProtectedRoute allowedRole="ADMIN">
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={ROUTES.SELL_ORDERS} replace />} />

          {/* SELL */}
          <Route path={ROUTES.SELL_ORDERS} element={<OrdersPage />} />
          <Route path={`${ROUTES.SELL_ORDERS}/:id`} element={<OrderDetailPage />} />
          <Route path={ROUTES.SELL_INVOICES} element={<InvoicesPage />} />
          <Route
            path={ROUTES.SELL_CREDIT_NOTES}
            element={<CreditNotesPage />}
          />
          <Route path={ROUTES.SELL_DELIVERIES} element={<DeliveriesPage />} />
          <Route path={ROUTES.SELL_CARTS} element={<CartsPage />} />

          {/* CATALOG */}
          <Route path={ROUTES.CATALOG_PRODUCTS} element={<ProductsPage />} />
          <Route
            path={ROUTES.CATALOG_CATEGORIES}
            element={<CategoriesPage />}
          />
          <Route
            path={ROUTES.CATALOG_MONITORING}
            element={<MonitoringPage />}
          />
          <Route
            path={ROUTES.CATALOG_ATTRIBUTES}
            element={<AttributesPage />}
          />
          <Route
            path={ROUTES.CATALOG_BRANDS_SUPPLIERS}
            element={<BrandsPage />}
          />

          {/* PERSONALIZE */}
          <Route path={ROUTES.PERSONALIZE_MODULES} element={<ModulesPage />} />
          <Route path={ROUTES.PERSONALIZE_DESIGN} element={<DesignPage />} />
          <Route
            path={ROUTES.PERSONALIZE_TRANSPORT}
            element={<TransportPage />}
          />
          <Route path={ROUTES.PERSONALIZE_PAYMENT} element={<PaymentPage />} />

          {/* CONFIGURE */}
          {/*<Route path={ROUTES.CONFIGURE_STORE_PARAMS} element={<StoreParamsPage />} />
          <Route path={ROUTES.CONFIGURE_ADVANCED_PARAMS} element={<AdvancedParamsPage />} />

          {/* ORDER MANAGER */}
          {/*<Route path={ROUTES.ORDER_MANAGER_PROFILES} element={<ProfilesPage />} />
          <Route path={ROUTES.ORDER_MANAGER_EMPLOYEES} element={<EmployeesPage />} />
          <Route path={ROUTES.ORDER_MANAGER_PERMISSIONS} element={<PermissionsPage />} />
          <Route path={ROUTES.ORDER_MANAGER_EMPLOYEE_ACCESS} element={<EmployeeAccessPage />} />{ */}

          <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
