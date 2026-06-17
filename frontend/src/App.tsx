import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import DashboardPage from './pages/DashboardPage';
import ConfigPage from './pages/ConfigPage';
import SuiteDetailPage from './pages/SuiteDetailPage';
import ExecutionRunPage from './pages/ExecutionRunPage';
import BatchExecutionPage from './pages/BatchExecutionPage';
import './index.css';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <BrowserRouter>
      <div className={`app-layout${sidebarCollapsed ? ' app-layout--collapsed' : ''}`}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
        <main className="main-content">
          <TopBar />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/suite/:id" element={<SuiteDetailPage />} />
            <Route path="/execution/:id" element={<ExecutionRunPage />} />
            <Route path="/batch/:id" element={<BatchExecutionPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
