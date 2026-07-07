import { useProject } from '../context/ProjectContext';

export function ProjectSelector({ collapsed }: { collapsed: boolean }) {
  const { projects, selectedProject, selectProject, loading } = useProject();

  if (collapsed) return null;

  if (loading) {
    return <div className="sidebar-project-selector sidebar-project-selector--loading">Carregando projetos...</div>;
  }

  if (projects.length === 0) {
    return <div className="sidebar-project-selector sidebar-project-selector--empty">Nenhum projeto encontrado</div>;
  }

  return (
    <div className="sidebar-project-selector">
      <label className="sidebar-project-selector-label">Espaço</label>
      <select
        value={selectedProject?.id ?? ''}
        onChange={(e) => {
          const project = projects.find(p => p.id === e.target.value);
          if (project) selectProject(project);
        }}
      >
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.jiraProjectKey} — {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
