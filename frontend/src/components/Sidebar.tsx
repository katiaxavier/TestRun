import { NavLink } from 'react-router-dom';
import { FlaskIcon, GaugeIcon, CaretDoubleLeftIcon, CaretDoubleRightIcon, SignOutIcon } from '@phosphor-icons/react';
import { Tooltip } from './Tooltip';
import { ProjectSelector } from './ProjectSelector';
import { BoardSelector } from './BoardSelector';
import type { AuthUser } from '../api/client';

const links = [
  { to: '/', label: 'Dashboard', icon: GaugeIcon, end: true },
  { to: '/suites', label: 'Suítes de Teste', icon: FlaskIcon, end: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  user: AuthUser | null;
  onLogout: () => void;
}

export function Sidebar({ collapsed, onToggle, user, onLogout }: SidebarProps) {
  return (
    <nav className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar-logo">
        {!collapsed && (
          <img src="/tr-logo.svg" alt="Testrun" className="sidebar-logo-img" />
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

      <div className="sidebar-context">
        <ProjectSelector collapsed={collapsed} />
        <BoardSelector collapsed={collapsed} />
      </div>

      {!collapsed && <div className="sidebar-divider" />}

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
        {user && (
          <div className="sidebar-user" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }}
              />
            )}
            {!collapsed && (
              <span className="sidebar-footer-version" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName}
              </span>
            )}
            <Tooltip content="Sair" placement="right" delay={150}>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sair"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
              >
                <SignOutIcon size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </nav>
  );
}
