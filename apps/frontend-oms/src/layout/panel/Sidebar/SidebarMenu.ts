import { ROUTES } from "../../../routes/routes";
import type { SidebarSection } from "./sidebar.types";

/**
 * sidebar.menu.ts
 * ---------------
 * Estructura del menú del panel (KOAJ-like).
 * Se mantiene como "data" para renderizarlo con map().
 */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    key: "sell",
    sectionLabel: "VENDER",
    icon: "bi-shop",
    groups: [
      {
        key: "sell_orders",
        groupLabel: "Pedidos",
        items: [
          { label: "Pedidos", path: ROUTES.SELL_ORDERS },
          { label: "Facturas", path: ROUTES.SELL_INVOICES },
          { label: "Notas Crédito", path: ROUTES.SELL_CREDIT_NOTES },
          { label: "Remisiones", path: ROUTES.SELL_DELIVERIES },
          { label: "Carritos de Compra", path: ROUTES.SELL_CARTS },
        ],
      },
      {
        key: "sell_catalog",
        groupLabel: "Catálogo",
        items: [
          { label: "Productos", path: ROUTES.CATALOG_PRODUCTS },
          { label: "Categorías", path: ROUTES.CATALOG_CATEGORIES },
          { label: "Monitoreo", path: ROUTES.CATALOG_MONITORING },
          {
            label: "Atributos y Características",
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
    icon: "bi-sliders",
    groups: [
      {
        key: "personalize_group",
        groupLabel: "Opciones",
        items: [
          { label: "Módulos", path: ROUTES.PERSONALIZE_MODULES },
          { label: "Diseño", path: ROUTES.PERSONALIZE_DESIGN },
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
    icon: "bi-gear",
    groups: [
      {
        key: "configure_group",
        groupLabel: "Parámetros",
        items: [
          {
            label: "Parámetros de la tienda",
            path: ROUTES.CONFIGURE_STORE_PARAMS,
          },
          {
            label: "Parámetros Avanzados",
            path: ROUTES.CONFIGURE_ADVANCED_PARAMS,
          },
        ],
      },
    ],
  },

  {
    key: "order_manager",
    sectionLabel: "GESTOR DE PEDIDOS",
    icon: "bi-box-seam",
    groups: [
      {
        key: "order_manager_group",
        groupLabel: "Gestión",
        items: [
          { label: "Gestión de Perfiles", path: ROUTES.ORDER_MANAGER_PROFILES },
          {
            label: "Gestión de Empleados",
            path: ROUTES.ORDER_MANAGER_EMPLOYEES,
          },
          {
            label: "Gestión de Permisos",
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
