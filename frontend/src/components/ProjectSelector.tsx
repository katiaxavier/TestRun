import { useProject } from '../context/ProjectContext';
import { SidebarSelect } from './SidebarSelect';

export function ProjectSelector({ collapsed }: { collapsed: boolean }) {
  const { projects, selectedProject, selectProject, loading } = useProject();

  if (collapsed) return null;

  if (loading) {
    return <div className="sidebar-select sidebar-select--loading">Carregando projetos...</div>;
  }

  if (projects.length === 0) {
    return <div className="sidebar-select sidebar-select--empty">Nenhum projeto encontrado</div>;
  }

  return (
    <SidebarSelect
      label="Espaço"
      options={projects.map(p => ({ id: p.id, label: `${p.jiraProjectKey} — ${p.name}` }))}
      selectedId={selectedProject?.id ?? null}
      onSelect={(id) => {
        const project = projects.find(p => p.id === id);
        if (project) selectProject(project);
      }}
    />
  );
}
