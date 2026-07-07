import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SuiteDetailPage from './pages/SuiteDetailPage';
import ExecutionRunPage from './pages/ExecutionRunPage';
import BatchExecutionPage from './pages/BatchExecutionPage';
import { authApi } from './api/client';
import type { AuthUser } from './api/client';
import { ProjectProvider } from './context/ProjectContext';
import './index.css';

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
      <BrowserRouter>
        <div className={`app-layout${sidebarCollapsed ? ' app-layout--collapsed' : ''}`}>
          <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} user={user} onLogout={handleLogout} />
          <main className="main-content">
            <TopBar />
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/suite/:id" element={<SuiteDetailPage />} />
              <Route path="/execution/:id" element={<ExecutionRunPage />} />
              <Route path="/batch/:id" element={<BatchExecutionPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ProjectProvider>
  );
}
