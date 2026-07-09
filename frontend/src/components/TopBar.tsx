import { useLocation } from 'react-router-dom';
import { GaugeIcon, FlaskIcon, PlayIcon, CopyIcon, ClockCounterClockwiseIcon, BugIcon } from '@phosphor-icons/react';

type RouteConfig = {
  match: (pathname: string) => boolean;
  title: string;
  Icon: React.ElementType;
};

const routes: RouteConfig[] = [
  { match: p => p.startsWith('/batch/'),            title: 'Lote',             Icon: CopyIcon  },
  { match: p => p.startsWith('/execution/'),        title: 'Execução',         Icon: PlayIcon  },
  { match: p => p.startsWith('/suite/'),            title: 'Suíte',            Icon: FlaskIcon },
  { match: p => p === '/suites',                    title: 'Suítes de Teste',  Icon: FlaskIcon },
  { match: p => p === '/executions',                title: 'Todas as Execuções', Icon: ClockCounterClockwiseIcon },
  { match: p => p === '/jira-issues',               title: 'Bugs e Melhorias', Icon: BugIcon },
  { match: p => p === '/execucoes',                 title: 'Execuções',       Icon: PlayIcon },
  { match: p => p === '/dashboard' || p === '/',    title: 'Dashboard',       Icon: GaugeIcon },
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
