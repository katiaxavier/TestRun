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
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <TopBar />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/suite/:id" element={<SuiteDetailPage />} />
            <Route path="/executions/:id" element={<ExecutionRunPage />} />
            <Route path="/batch/:id" element={<BatchExecutionPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
