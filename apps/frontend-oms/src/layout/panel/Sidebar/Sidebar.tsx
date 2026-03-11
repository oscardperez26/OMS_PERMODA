import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SIDEBAR_SECTIONS } from './SidebarMenu';
import { getGroupsToOpenByPathname } from './sidebar.utils';
import { useAuth } from '../../../auth/useAuth';

/**
 * Sidebar
 * -------
 * Menu principal del panel admin.
 */
export function Sidebar() {
  const location = useLocation();
  const { hasPermissions } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const visibleSections = useMemo(
    () =>
      SIDEBAR_SECTIONS.map((section) => ({
        ...section,
        groups: section.groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
              if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
                return true;
              }
              return hasPermissions(item.requiredPermissions);
            }),
          }))
          .filter((group) => group.items.length > 0),
      })).filter((section) => section.groups.length > 0),
    [hasPermissions],
  );

  const autoOpenGroups = useMemo(() => {
    const keys = getGroupsToOpenByPathname(location.pathname, visibleSections);
    return keys.reduce<Record<string, boolean>>((accumulator, key) => {
      accumulator[key] = true;
      return accumulator;
    }, {});
  }, [location.pathname, visibleSections]);

  const isGroupOpen = (groupKey: string) =>
    Boolean(autoOpenGroups[groupKey] || openGroups[groupKey]);

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((previous) => {
      const currentlyOpen = Boolean(autoOpenGroups[groupKey] || previous[groupKey]);
      return { ...previous, [groupKey]: !currentlyOpen };
    });
  };

  if (!isExpanded) {
    return (
      <aside className="koaj-sidebar" style={{ transition: 'width 0.3s ease' }}>
        <button
          className="koaj-sidebar-item mb-4"
          onClick={() => setIsExpanded(true)}
          style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
          title="Expandir menu"
        >
          <i className="bi bi-list fs-3 text-muted"></i>
        </button>

        {visibleSections.map((section) => (
          <div
            key={section.key}
            className="koaj-sidebar-item"
            title={section.sectionLabel}
            onClick={() => setIsExpanded(true)}
          >
            <i className={`bi ${section.icon || 'bi-folder'}`}></i>
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside className="koaj-sidebar-panel" style={{ transition: 'width 0.3s ease' }}>
      <div className="d-flex justify-content-end mb-2">
        <button
          onClick={() => setIsExpanded(false)}
          className="btn btn-sm text-muted border-0 bg-transparent"
          title="Contraer menu"
        >
          <i className="bi bi-layout-sidebar-inset fs-5"></i>
        </button>
      </div>

      {visibleSections.map((section) => (
        <div key={section.key} className="mb-4">
          <div className="koaj-panel-group-title d-flex align-items-center gap-2">
            {section.icon && <i className={`bi ${section.icon} fs-6`}></i>}
            {section.sectionLabel}
          </div>

          {section.groups.map((group) => (
            <div key={group.key} className="mb-1">
              <button
                className="d-flex justify-content-between align-items-center w-100 bg-transparent border-0 text-start"
                style={{
                  color: 'var(--koaj-text-main)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '8px 12px',
                }}
                onClick={() => toggleGroup(group.key)}
                aria-expanded={isGroupOpen(group.key)}
              >
                <span>{group.groupLabel}</span>
                <i
                  className={`bi ${isGroupOpen(group.key) ? 'bi-chevron-down' : 'bi-chevron-right'} text-muted`}
                  style={{ fontSize: '0.7rem' }}
                ></i>
              </button>

              {isGroupOpen(group.key) && (
                <div className="d-flex flex-column ps-3 mt-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }: { isActive: boolean }) =>
                        isActive ? 'koaj-panel-link active' : 'koaj-panel-link'
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
  );
}
