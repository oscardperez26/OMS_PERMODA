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
    icon: "bi-shop",
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
    icon: "bi-sliders",
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
    icon: "bi-gear",
    groups: [
      {
        key: "configure_group",
        groupLabel: "Parametros",
        items: [
          {
            label: "Parametros de la tienda",
            path: ROUTES.CONFIGURE_STORE_PARAMS,
            requiredPermissions: ['config.read'],
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
        groupLabel: "Gestion",
        items: [
          {
            label: "Configuracion General",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Monedas",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_MONEDA,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Empresas",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_EMPRESA,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Empresa Cliente",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_EMPRESA_CLIENTE,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Pasarelas de Pago",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PASARELA_PAGO,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Tiendas",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TIENDA,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Bodegas",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_BODEGA,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Productos",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Producto Variante",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_PRODUCTO_VARIANTE,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Inventario",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_INVENTARIO,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Transportadoras",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_TRANSPORTADORA,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Zonas de Transporte",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZONA_TRANSPORTE,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Zona Ciudad",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_ZONA_CIUDAD,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Costos Transporte",
            path: ROUTES.ORDER_MANAGER_GENERAL_CONFIG_COSTO_TRANSPORTE,
            requiredPermissions: ['config.read'],
          },
          {
            label: "Gestion de Perfiles",
            path: ROUTES.ORDER_MANAGER_PROFILES,
            requiredPermissions: ['users.manage'],
          },
          {
            label: "Gestion de Empleados",
            path: ROUTES.ORDER_MANAGER_EMPLOYEES,
            requiredPermissions: ['users.manage'],
          },
          {
            label: "Gestion de Permisos",
            path: ROUTES.ORDER_MANAGER_PERMISSIONS,
            requiredPermissions: ['security.manage'],
          },
          {
            label: "Configurar Acceso de Empleados",
            path: ROUTES.ORDER_MANAGER_EMPLOYEE_ACCESS,
            requiredPermissions: ['users.manage'],
          },
        ],
      },
    ],
  },
];
