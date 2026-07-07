import { useLocation } from 'react-router-dom';
import { FlaskIcon, PlayIcon, CopyIcon } from '@phosphor-icons/react';

type RouteConfig = {
  match: (pathname: string) => boolean;
  title: string;
  Icon: React.ElementType;
};

const routes: RouteConfig[] = [
  { match: p => p.startsWith('/batch/'),            title: 'Lote',             Icon: CopyIcon  },
  { match: p => p.startsWith('/execution/'),        title: 'Execução',         Icon: PlayIcon  },
  { match: p => p.startsWith('/suite/'),            title: 'Suíte',            Icon: FlaskIcon },
  { match: p => p === '/',                          title: 'Suítes de Teste',  Icon: FlaskIcon },
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
