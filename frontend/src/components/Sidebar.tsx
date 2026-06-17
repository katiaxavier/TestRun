import { NavLink } from 'react-router-dom';
import { FlaskIcon, GearIcon, CaretDoubleLeftIcon, CaretDoubleRightIcon } from '@phosphor-icons/react';
import { Tooltip } from './Tooltip';

const links = [
  { to: '/', label: 'Suítes de Teste', icon: FlaskIcon, end: true },
  { to: '/config', label: 'Configurações', icon: GearIcon },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <nav className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar-logo">
        {!collapsed && (
          <img src="/testrun-logo.png" alt="Testrun" className="sidebar-logo-img" />
        )}
        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed
            ? <CaretDoubleRightIcon size={13} weight="bold" />
            : <CaretDoubleLeftIcon size={13} weight="bold" />}
        </button>
      </div>

      {links.map(({ to, label, icon: Icon, end }) => (
        <Tooltip
          key={to}
          content={collapsed ? label : undefined}
          placement="right"
          delay={150}
          display="block"
        >
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} weight={isActive ? 'fill' : 'duotone'} />
                {!collapsed && <span className="sidebar-link-label">{label}</span>}
              </>
            )}
          </NavLink>
        </Tooltip>
      ))}

      <div className="sidebar-footer">
        {!collapsed && (
          <span className="sidebar-footer-version">Testrun v1.0 — Local</span>
        )}
      </div>
    </nav>
  );
}
