import { NavLink } from 'react-router-dom';
import { Gauge, Flask, Gear } from '@phosphor-icons/react';

const links = [
  { to: '/', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/config', label: 'Configurações', icon: Gear },
];

export function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Flask size={18} weight="fill" color="#fff" />
        </div>
        <span className="sidebar-logo-text">Testrun</span>
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
