import { useState } from 'react';
import { GaugeIcon } from '@phosphor-icons/react';
import { useProject } from '../context/ProjectContext';
import { useBoard } from '../context/BoardContext';
import { OperacaoTab } from './dashboard/OperacaoTab';
import { QualidadeTab } from './dashboard/QualidadeTab';
import { EficienciaTab } from './dashboard/EficienciaTab';

const TABS = [
  { key: 'operacao', label: 'Operação' },
  { key: 'qualidade', label: 'Qualidade' },
  { key: 'eficiencia', label: 'Eficiência' },
] as const;
type TabKey = typeof TABS[number]['key'];

// Dashboard dividido em abas (Operação / Qualidade / Eficiência) — ver
// PLANO-DASHBOARD-QUALIDADE-V2.md. O conteúdo original (hoje aba "Operação") vive em
// frontend/src/pages/dashboard/OperacaoTab.tsx, sem alteração de comportamento.
export default function HomePage() {
  const { selectedProject, loading: projectLoading } = useProject();
  const { selectedBoard, loading: boardLoading } = useBoard();
  const [activeTab, setActiveTab] = useState<TabKey>('operacao');

  if (projectLoading || boardLoading) {
    return <div className="loading-page"><div className="spinner" /> Carregando...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="page">
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <GaugeIcon size={56} />
          <h3>Nenhum projeto selecionado</h3>
          <p>Selecione um projeto no menu lateral para ver o dashboard.</p>
        </div>
      </div>
    );
  }

  if (!selectedBoard) {
    return (
      <div className="page">
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <GaugeIcon size={56} />
          <h3>Nenhum quadro encontrado</h3>
          <p>Este projeto não tem quadros no Jira nem suítes sem quadro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral de {selectedBoard.name}</p>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: '2rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`filter-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'operacao' && <OperacaoTab />}
      {activeTab === 'qualidade' && <QualidadeTab projectId={selectedProject.id} boardId={selectedBoard.id} />}
      {activeTab === 'eficiencia' && <EficienciaTab projectId={selectedProject.id} boardId={selectedBoard.id} />}
    </div>
  );
}
