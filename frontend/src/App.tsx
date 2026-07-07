import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import SuitesPage from './pages/SuitesPage';
import LoginPage from './pages/LoginPage';
import SuiteDetailPage from './pages/SuiteDetailPage';
import ExecutionRunPage from './pages/ExecutionRunPage';
import BatchExecutionPage from './pages/BatchExecutionPage';
import { authApi } from './api/client';
import type { AuthUser } from './api/client';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { BoardProvider, useBoard } from './context/BoardContext';
import './index.css';

// Sai de telas de detalhe (suíte/execução/lote) quando o usuário troca de
// projeto ou quadro na sidebar, já que esses detalhes pertencem ao contexto anterior.
function ExitDetailOnContextSwitch() {
  const { selectedProject } = useProject();
  const { selectedBoard } = useBoard();
  const location = useLocation();
  const navigate = useNavigate();
  const prevProjectId = useRef(selectedProject?.id);
  const prevBoardId = useRef(selectedBoard?.id);

  useEffect(() => {
    const projectChanged = prevProjectId.current !== undefined && prevProjectId.current !== selectedProject?.id;
    const boardChanged = prevBoardId.current !== undefined && prevBoardId.current !== selectedBoard?.id;
    prevProjectId.current = selectedProject?.id;
    prevBoardId.current = selectedBoard?.id;

    if ((projectChanged || boardChanged) && /^\/(suite|execution|batch)\//.test(location.pathname)) {
      navigate('/suites');
    }
  }, [selectedProject?.id, selectedBoard?.id, location.pathname, navigate]);

  return null;
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    authApi.me()
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  if (user === undefined) {
    return (
      <div className="loading-page"><div className="spinner" /> Carregando...</div>
    );
  }

  if (user === null) {
    return <LoginPage />;
  }

  return (
    <ProjectProvider>
      <BoardProvider>
        <BrowserRouter>
          <ExitDetailOnContextSwitch />
          <div className={`app-layout${sidebarCollapsed ? ' app-layout--collapsed' : ''}`}>
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} user={user} onLogout={handleLogout} />
            <main className="main-content">
              <TopBar />
              <Routes>
                <Route path="/" element={<Navigate to="/suites" replace />} />
                <Route path="/suites" element={<SuitesPage />} />
                <Route path="/suite/:id" element={<SuiteDetailPage />} />
                <Route path="/execution/:id" element={<ExecutionRunPage />} />
                <Route path="/batch/:id" element={<BatchExecutionPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </BoardProvider>
    </ProjectProvider>
  );
}
