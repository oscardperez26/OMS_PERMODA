import { ROUTES } from "../../../routes/routes";
import type { SidebarSection } from "./sidebar.types";

/**
 * sidebar.menu.ts
 * ---------------
 * Estructura del menu del panel (KOAJ-like).
 * Se mantiene como "data" para renderizarlo con map().
 */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    key: "sell",
    sectionLabel: "VENDER",
    groups: [
      {
        key: "sell_orders",
        groupLabel: "Pedidos",
        items: [
          { label: "Pedidos", path: ROUTES.SELL_ORDERS },
          { label: "Facturas", path: ROUTES.SELL_INVOICES },
          { label: "Notas Credito", path: ROUTES.SELL_CREDIT_NOTES },
          { label: "Remisiones", path: ROUTES.SELL_DELIVERIES },
          { label: "Carritos de Compra", path: ROUTES.SELL_CARTS },
        ],
      },
      {
        key: "sell_catalog",
        groupLabel: "Catalogo",
        items: [
          { label: "Productos", path: ROUTES.CATALOG_PRODUCTS },
          { label: "Categorias", path: ROUTES.CATALOG_CATEGORIES },
          { label: "Monitoreo", path: ROUTES.CATALOG_MONITORING },
          {
            label: "Atributos y Caracteristicas",
            path: ROUTES.CATALOG_ATTRIBUTES,
          },
          {
            label: "Marcas y Proveedores",
            path: ROUTES.CATALOG_BRANDS_SUPPLIERS,
          },
          { label: "Archivos", path: ROUTES.CATALOG_FILES },
          { label: "Descuentos", path: ROUTES.CATALOG_DISCOUNTS },
          { label: "Inventario", path: ROUTES.CATALOG_INVENTORY },
        ],
      },
    ],
  },
  {
    key: "personalize",
    sectionLabel: "PERSONALIZAR",
    groups: [
      {
        key: "personalize_group",
        groupLabel: "Opciones",
        items: [
          { label: "Modulos", path: ROUTES.PERSONALIZE_MODULES },
          { label: "Diseno", path: ROUTES.PERSONALIZE_DESIGN },
          { label: "Transporte", path: ROUTES.PERSONALIZE_TRANSPORT },
          { label: "Pago", path: ROUTES.PERSONALIZE_PAYMENT },
          { label: "Internacional", path: ROUTES.PERSONALIZE_INTERNATIONAL },
        ],
      },
    ],
  },
  {
    key: "configure",
    sectionLabel: "CONFIGURE",
    groups: [
      {
        key: "configure_group",
        groupLabel: "Parametros",
        items: [
          {
            label: "Parametros de la tienda",
            path: ROUTES.CONFIGURE_STORE_PARAMS,
          },
          {
            label: "Parametros Avanzados",
            path: ROUTES.CONFIGURE_ADVANCED_PARAMS,
          },
        ],
      },
    ],
  },
  {
    key: "order_manager",
    sectionLabel: "GESTOR DE PEDIDOS",
    groups: [
      {
        key: "order_manager_group",
        groupLabel: "Gestion",
        items: [
          {
            label: "Configuracion General",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG,
          },
          { label: "Gestion de Perfiles", path: ROUTES.ORDER_MANAGER_PROFILES },
          {
            label: "Gestion de Empleados",
            path: ROUTES.ORDER_MANAGER_EMPLOYEES,
          },
          {
            label: "Gestion de Permisos",
            path: ROUTES.ORDER_MANAGER_PERMISSIONS,
          },
          {
            label: "Configurar Acceso de Empleados",
            path: ROUTES.ORDER_MANAGER_EMPLOYEE_ACCESS,
          },
        ],
      },
    ],
  },
];
