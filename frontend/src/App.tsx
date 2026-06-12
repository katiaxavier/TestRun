import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ConfigPage from './pages/ConfigPage';
import SuiteDetailPage from './pages/SuiteDetailPage';
import ExecutionRunPage from './pages/ExecutionRunPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/suites/:id" element={<SuiteDetailPage />} />
            <Route path="/executions/:id" element={<ExecutionRunPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
