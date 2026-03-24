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
  ORDER_MANAGER_GENERAL_CONFIG: '/panel/order-manager/configuracion-general',
  ORDER_MANAGER_GENERAL_CONFIG_LOGISTICA:
    '/panel/order-manager/configuracion-general/logistica',
  ORDER_MANAGER_GENERAL_CONFIG_COMERCIAL:
    '/panel/order-manager/configuracion-general/comercial',
  ORDER_MANAGER_GENERAL_CONFIG_PARAMETROS_BASE:
    '/panel/order-manager/configuracion-general/parametros-base',
  // @deprecated - migrar a CATALOG_PRODUCTS (fuente ZI)
  ORDER_MANAGER_GENERAL_CONFIG_CATALOGO_INVENTARIO:
    '/panel/order-manager/configuracion-general/catalogo-inventario',
  ORDER_MANAGER_GENERAL_CONFIG_PAGOS_INTEGRACIONES:
    '/panel/order-manager/configuracion-general/pagos-integraciones',
  ORDER_MANAGER_GENERAL_CONFIG_INTEGRACIONES:
    '/panel/order-manager/configuracion-general/pagos-integraciones/integraciones',
  ORDER_MANAGER_GENERAL_CONFIG_INTEGRACIONES_ENTRANTES:
    '/panel/order-manager/configuracion-general/pagos-integraciones/integraciones/entrantes',
  ORDER_MANAGER_GENERAL_CONFIG_ZI_SYNC:
    '/panel/order-manager/configuracion-general/pagos-integraciones/zi-sync',
  ORDER_MANAGER_GENERAL_CONFIG_COMERCIAL_STORE_PARAMS:
    '/panel/order-manager/configuracion-general/comercial/store-params',
  ORDER_MANAGER_SEGURIDAD_ACCESOS:
    '/panel/order-manager/seguridad-accesos',
  ORDER_MANAGER_GENERAL_CONFIG_PAIS:
    '/panel/order-manager/configuracion-general/pais',
  ORDER_MANAGER_GENERAL_CONFIG_CIUDAD:
    '/panel/order-manager/configuracion-general/ciudad',
  ORDER_MANAGER_GENERAL_CONFIG_MONEDA:
    '/panel/order-manager/configuracion-general/moneda',
  ORDER_MANAGER_GENERAL_CONFIG_EMPRESA:
    '/panel/order-manager/configuracion-general/empresa',
  ORDER_MANAGER_GENERAL_CONFIG_EMPRESA_CLIENTE:
    '/panel/order-manager/configuracion-general/empresa-cliente',
  ORDER_MANAGER_GENERAL_CONFIG_PASARELA_PAGO:
    '/panel/order-manager/configuracion-general/pasarela-pago',
  ORDER_MANAGER_GENERAL_CONFIG_TIENDA:
    '/panel/order-manager/configuracion-general/tienda',
  ORDER_MANAGER_GENERAL_CONFIG_BODEGA:
    '/panel/order-manager/configuracion-general/bodega',
  ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO:
    '/panel/order-manager/configuracion-general/producto',
  ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO_VARIANTE:
    '/panel/order-manager/configuracion-general/producto-variante',
  ORDER_MANAGER_GENERAL_CONFIG_INVENTARIO:
    '/panel/order-manager/configuracion-general/inventario',
  ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA:
    '/panel/order-manager/configuracion-general/transportadora',
  ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA_CONFIG:
    '/panel/order-manager/configuracion-general/transportadora/:id/configuracion',
  ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA_API:
    '/panel/order-manager/configuracion-general/transportadora/:id/api',
  ORDER_MANAGER_GENERAL_CONFIG_ZONA_TRANSPORTE:
    '/panel/order-manager/configuracion-general/zona-transporte',
  ORDER_MANAGER_GENERAL_CONFIG_ZONA_CIUDAD:
    '/panel/order-manager/configuracion-general/zona-ciudad',
  ORDER_MANAGER_GENERAL_CONFIG_COSTO_TRANSPORTE:
    '/panel/order-manager/configuracion-general/costo-transporte',
} as const;

export function buildTransportadoraConfiguracionRoute(transportadoraId: number): string {
  return `/panel/order-manager/configuracion-general/transportadora/${transportadoraId}/configuracion`;
}

export function buildTransportadoraApiRoute(transportadoraId: number): string {
  return `/panel/order-manager/configuracion-general/transportadora/${transportadoraId}/api`;
}
