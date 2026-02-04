import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SIDEBAR_SECTIONS } from './SidebarMenu';
import { getGroupsToOpenByPathname } from './sidebar.utils';

/**
 * Sidebar
 * -------
 * Renderiza el menú tipo KOAJ:
 * - Secciones (VENDER, PERSONALIZAR...)
 * - Grupos colapsables dentro de cada sección
 * - Items finales con NavLink (resalta el activo)
 */
export function Sidebar() {
  const location = useLocation();
  /**
   * isSidebarOpen: controla si el sidebar está abierto o cerrado.
   */
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => {
  setIsSidebarOpen(prev => !prev);
  };


  /**
   * openGroups: controla qué grupos están expandidos.
   * Ej: openGroups["sell_orders"]=true
   */

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-abrir el grupo correspondiente cuando cambie la URL
  useEffect(() => {
    const keys = getGroupsToOpenByPathname(location.pathname);
    if (keys.length > 0) {
      setOpenGroups((prev) => {
        const next = { ...prev };
        keys.forEach((k) => (next[k] = true));
        return next;
      });
    }
  }, [location.pathname]);
  

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };
                  <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
  ☰
</button>

  
  return (
    <>
    {/* BOTÓN TOGGLE (siempre visible) */}
      <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
      ☰
    </button>
    {/* SIDEBAR */}
    <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>

      
      <div className="sidebar-brand">

        
        <div className="brand-title">KOAJ</div>
        <div className="brand-sub">OMS (Front)</div>
      </div>

      {SIDEBAR_SECTIONS.map((section) => (
        <div key={section.key} className="sidebar-section">
          <div className="section-label">{section.sectionLabel}</div>

          {section.groups.map((group) => (
            <div key={group.key} className="sidebar-group">
              <button
                className="group-toggle"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={!!openGroups[group.key]}
              >
                <span>{group.groupLabel}</span>
                <span className="chev">{openGroups[group.key] ? '▾' : '▸'}</span>
              </button>

              {openGroups[group.key] && (
                <div className="group-items">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav-item active' : 'nav-item')}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </aside>
    </>
  );
}
