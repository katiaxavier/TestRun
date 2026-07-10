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
  // Abas já visitadas ficam montadas (só escondidas via CSS) pra trocar de aba não
  // refazer o fetch inteiro de novo — ver PLANO em .claude/plans (fix de reload ao trocar de aba).
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(() => new Set(['operacao']));

  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    setVisitedTabs(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

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
            onClick={() => selectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visitedTabs.has('operacao') && (
        <div style={{ display: activeTab === 'operacao' ? undefined : 'none' }}>
          <OperacaoTab active={activeTab === 'operacao'} />
        </div>
      )}
      {visitedTabs.has('qualidade') && (
        <div style={{ display: activeTab === 'qualidade' ? undefined : 'none' }}>
          <QualidadeTab projectId={selectedProject.id} boardId={selectedBoard.id} />
        </div>
      )}
      {visitedTabs.has('eficiencia') && (
        <div style={{ display: activeTab === 'eficiencia' ? undefined : 'none' }}>
          <EficienciaTab projectId={selectedProject.id} boardId={selectedBoard.id} />
        </div>
      )}
    </div>
  );
}
