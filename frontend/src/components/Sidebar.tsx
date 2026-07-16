import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GaugeIcon, FlaskIcon, PlayIcon, BugIcon, CaretDoubleLeftIcon, CaretDoubleRightIcon, SignOutIcon } from '@phosphor-icons/react';
import { springSnappy } from '../utils/motion';
import { Tooltip } from './Tooltip';
import { BrandLogo } from './BrandLogo';
import { ProjectSelector } from './ProjectSelector';
import { BoardSelector } from './BoardSelector';
import type { AuthUser } from '../api/client';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: GaugeIcon, end: true },
  { to: '/execucoes', label: 'Execuções', icon: PlayIcon, end: true },
  { to: '/suites', label: 'Suítes de Teste', icon: FlaskIcon, end: true },
  { to: '/jira-issues', label: 'Bugs e Melhorias', icon: BugIcon, end: true },
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
          <BrandLogo className="sidebar-logo-img" variant="on-dark" />
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
                {isActive && (
                  <motion.span
                    className="sidebar-active-pill"
                    layoutId="sidebar-active"
                    transition={springSnappy}
                  />
                )}
                <Icon size={18} weight={isActive ? 'fill' : 'duotone'} />
                {!collapsed && <span className="sidebar-link-label">{label}</span>}
              </>
            )}
          </NavLink>
        </Tooltip>
      ))}

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt={user.displayName} className="sidebar-user-avatar" />
            )}
            {!collapsed && (
              <span className="sidebar-footer-version sidebar-user-name">
                {user.displayName}
              </span>
            )}
            <Tooltip content="Sair" placement="right" delay={150}>
              <button type="button" onClick={onLogout} aria-label="Sair" className="sidebar-logout-btn">
                <SignOutIcon size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </nav>
  );
}
