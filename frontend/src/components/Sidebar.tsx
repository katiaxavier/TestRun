import { NavLink } from 'react-router-dom';
import { Flask, Gear } from '@phosphor-icons/react';

const links = [
  { to: '/', label: 'Suítes de Teste', icon: Flask, end: true },
  { to: '/config', label: 'Jira Sync', icon: Gear },
];

export function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <img src="/testrun-logo.png" alt="Testrun" style={{ height: 28 }} />
      </div>

      <span className="sidebar-section-label">Navegação</span>

      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          <Icon size={18} weight="duotone" />
          {label}
        </NavLink>
      ))}

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 0.75rem' }}>
          Testrun v1.0 — Local
        </div>
      </div>
    </nav>
  );
}
