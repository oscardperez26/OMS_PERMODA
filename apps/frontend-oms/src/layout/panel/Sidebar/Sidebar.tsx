import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SIDEBAR_SECTIONS } from './SidebarMenu';
import { getGroupsToOpenByPathname } from './sidebar.utils';

/**
 * Sidebar
 * -------
 * Menu principal del panel admin.
 */
export function Sidebar() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  useEffect(() => {
    const keys = getGroupsToOpenByPathname(location.pathname);
    if (keys.length === 0) {
      return;
    }

    setOpenGroups((previous) => {
      const next = { ...previous };
      keys.forEach((key) => {
        next[key] = true;
      });
      return next;
    });
  }, [location.pathname]);

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((previous) => ({ ...previous, [groupKey]: !previous[groupKey] }));
  };

  return (
    <>
      <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
        Menu
      </button>

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
                  <span className="chev">{openGroups[group.key] ? 'v' : '>'}</span>
                </button>

                {openGroups[group.key] && (
                  <div className="group-items">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }: { isActive: boolean }) =>
                          isActive ? 'nav-item active' : 'nav-item'
                        }
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
