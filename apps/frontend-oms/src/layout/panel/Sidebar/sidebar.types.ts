/**
 * sidebar.types.ts
 * ----------------
 * Tipos para un menú de 3 niveles:
 * - Section: encabezado principal (VENDER, PERSONALIZAR, etc.)
 * - Group: bloque dentro de la sección (Pedidos, Catálogo, etc.)
 * - Item: opción final con ruta
 */

export type SidebarItem = {
  label: string;
  path: string;
};

export type SidebarGroup = {
  key: string;         // id único del grupo para colapsar/expandir
  groupLabel: string;  // nombre visible del grupo
  items: SidebarItem[];
};

export type SidebarSection = {
  key: string;            // id único sección
  sectionLabel: string;   // título: VENDER / PERSONALIZAR
  icon?: string;          // Icono opcional para el menu colapsado (bootstrap icon)
  groups: SidebarGroup[]; // grupos internos
};
