import { SIDEBAR_SECTIONS } from './SidebarMenu';
import type { SidebarSection } from './sidebar.types';

/**
 * Devuelve una lista de keys de grupos que deberían estar abiertos
 * según la ruta actual.
 *
 * Ejemplo:
 * - pathname = "/catalog/products"
 *   -> abre el grupo "sell_catalog" (porque allí está Products)
 */
export function getGroupsToOpenByPathname(
  pathname: string,
  sections: SidebarSection[] = SIDEBAR_SECTIONS,
): string[] {
  const openKeys: string[] = [];

  for (const section of sections) {
    for (const group of section.groups) {
      const match = group.items.some((it) => pathname.startsWith(it.path));
      if (match) openKeys.push(group.key);
    }
  }

  return openKeys;
}

