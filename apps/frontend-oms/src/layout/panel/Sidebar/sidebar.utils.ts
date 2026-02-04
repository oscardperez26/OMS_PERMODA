import { SIDEBAR_SECTIONS } from './SidebarMenu';

/**
 * Devuelve una lista de keys de grupos que deberían estar abiertos
 * según la ruta actual.
 *
 * Ejemplo:
 * - pathname = "/catalog/products"
 *   -> abre el grupo "sell_catalog" (porque allí está Products)
 */
export function getGroupsToOpenByPathname(pathname: string): string[] {
  const openKeys: string[] = [];

  for (const section of SIDEBAR_SECTIONS) {
    for (const group of section.groups) {
      const match = group.items.some((it) => pathname.startsWith(it.path));
      if (match) openKeys.push(group.key);
    }
  }

  return openKeys;
}

