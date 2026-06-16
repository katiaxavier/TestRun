import { useLocation } from 'react-router-dom';
import { Flask, Gear, Play, ChartBar } from '@phosphor-icons/react';

type RouteConfig = {
  match: (pathname: string) => boolean;
  title: string;
  Icon: React.ElementType;
};

const routes: RouteConfig[] = [
  { match: p => p === '/config',                    title: 'Configurações',    Icon: Gear      },
  { match: p => p.startsWith('/batch/'),            title: 'Execução em Lote', Icon: ChartBar  },
  { match: p => p.startsWith('/execution/'),        title: 'Execução',         Icon: Play      },
  { match: p => p.startsWith('/suite/'),            title: 'Suites de Teste',  Icon: Flask     },
  { match: p => p === '/',                          title: 'Suites de Teste',  Icon: Flask     },
];

export function TopBar() {
  const { pathname } = useLocation();
  const route = routes.find(r => r.match(pathname));
  if (!route) return null;

  const { title, Icon } = route;

  return (
    <div className="topbar">
      <Icon size={18} weight="duotone" className="topbar-icon" />
      <span className="topbar-title">{title}</span>
    </div>
  );
}
