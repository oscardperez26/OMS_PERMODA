/**
 * routes.ts
 * ----------
 * Rutas del Frontend OMS.
 * Mantenerlo centralizado evita errores y facilita refactor.
 */
export const ROUTES = {

  /* PANEL */
  PANEL_ROOT: '/panel',
  // SELL (VENDER)
  SELL_ORDERS: '/panel/sell/orders',
  SELL_INVOICES: '/panel/sell/invoices',
  SELL_CREDIT_NOTES: '/panel/sell/credit-notes',
  SELL_DELIVERIES: '/panel/sell/deliveries',
  SELL_CARTS: '/panel/sell/carts',
  // CATALOG (CATALOGO)
  CATALOG_PRODUCTS: '/panel/catalog/products',
  CATALOG_CATEGORIES: '/panel/catalog/categories',
  CATALOG_MONITORING: '/panel/catalog/monitoring',
  CATALOG_ATTRIBUTES: '/panel/catalog/attributes',
  CATALOG_BRANDS_SUPPLIERS: '/panel/catalog/brands-suppliers',
  CATALOG_FILES: '/panel/catalog/files',
  CATALOG_DISCOUNTS: '/panel/catalog/discounts',
  CATALOG_INVENTORY: '/panel/catalog/inventory',

  // PERSONALIZAR
  PERSONALIZE_MODULES: '/panel/personalize/modules',
  PERSONALIZE_DESIGN: '/panel/personalize/design',
  PERSONALIZE_TRANSPORT: '/panel/personalize/transport',
  PERSONALIZE_PAYMENT: '/panel/personalize/payment',
  PERSONALIZE_INTERNATIONAL: '/panel/personalize/international',

  // CONFIGURE
  CONFIGURE_STORE_PARAMS: '/panel/configure/store-params',
  CONFIGURE_ADVANCED_PARAMS: '/panel/configure/advanced-params',

  // GESTOR DE PEDIDOS
  ORDER_MANAGER_PROFILES: '/panel/order-manager/profiles',
  ORDER_MANAGER_EMPLOYEES: '/panel/order-manager/employees',
  ORDER_MANAGER_PERMISSIONS: '/panel/order-manager/permissions',
  ORDER_MANAGER_EMPLOYEE_ACCESS: '/panel/order-manager/employee-access',
} as const;
