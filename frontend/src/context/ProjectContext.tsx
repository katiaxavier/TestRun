import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { projectsApi } from '../api/client';
import type { Project } from '../api/client';

const STORAGE_KEY = 'selected-project-id';

interface ProjectContextValue {
  projects: Project[];
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const selectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    localStorage.setItem(STORAGE_KEY, project.id);
  }, []);

  useEffect(() => {
    projectsApi.list()
      .then(({ data }) => {
        setProjects(data);
        const storedId = localStorage.getItem(STORAGE_KEY);
        const restored = data.find(p => p.id === storedId);
        setSelectedProject(restored ?? data[0] ?? null);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProjectContext.Provider value={{ projects, selectedProject, selectProject, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject deve ser usado dentro de um ProjectProvider.');
  return ctx;
}
