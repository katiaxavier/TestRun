import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GaugeIcon, PlayIcon, ClockCounterClockwiseIcon, FlaskIcon } from '@phosphor-icons/react';
import { executionsApi } from '../api/client';
import type { Execution } from '../api/client';
import { ExecutionCard } from '../components/ExecutionCard';
import { useProject } from '../context/ProjectContext';
import { useBoard } from '../context/BoardContext';

const RECENT_EXECUTIONS_LIMIT = 3;
const ACTIVE_EXECUTIONS_LIMIT = 50; // teto do endpoint; cobre o caso de várias execuções simultâneas (suíte + lote)

export default function ExecucoesPage() {
  const navigate = useNavigate();
  const { selectedProject, loading: projectLoading } = useProject();
  const { selectedBoard, loading: boardLoading } = useBoard();
  const [activeExecutions, setActiveExecutions] = useState<Execution[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (projectId: string, boardId?: string) => {
    try {
      const [activeRes, recentRes] = await Promise.all([
        executionsApi.getRecent(projectId, boardId, { status: 'IN_PROGRESS', limit: ACTIVE_EXECUTIONS_LIMIT }),
        executionsApi.getRecent(projectId, boardId, { status: 'COMPLETED', limit: RECENT_EXECUTIONS_LIMIT }),
      ]);
      setActiveExecutions(activeRes.data);
      setRecentExecutions(recentRes.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!selectedProject || !selectedBoard) {
      setActiveExecutions([]);
      setRecentExecutions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchData(selectedProject.id, selectedBoard.id);
  }, [selectedProject, selectedBoard, fetchData]);

  useEffect(() => {
    if (!selectedProject || !selectedBoard) return;
    if (activeExecutions.length === 0) return;
    const interval = setInterval(() => fetchData(selectedProject.id, selectedBoard.id), 15_000);
    return () => clearInterval(interval);
  }, [selectedProject, selectedBoard, activeExecutions.length, fetchData]);

  const executionTitle = (execution: Execution) =>
    execution.suite
      ? `${execution.suite.jiraKey ? `${execution.suite.jiraKey} — ` : ''}${execution.suite.title}`
      : execution.batch?.name
      ? `Lote — ${execution.batch.name}`
      : undefined;

  const navigateToExecution = (execution: Execution) =>
    navigate(`/execution/${execution.id}`, { state: { from: 'dashboard' } });

  if (projectLoading || boardLoading) {
    return <div className="loading-page"><div className="spinner" /> Carregando...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="page">
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <FlaskIcon size={56} />
          <h3>Nenhum projeto selecionado</h3>
          <p>Selecione um projeto no menu lateral para ver as execuções.</p>
        </div>
      </div>
    );
  }

  if (!selectedBoard) {
    return (
      <div className="page">
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <FlaskIcon size={56} />
          <h3>Nenhum quadro encontrado</h3>
          <p>Este projeto não tem quadros no Jira nem suítes sem quadro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Execuções</h1>
            <p className="page-subtitle">Visão geral das execuções de {selectedBoard.name}</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /> Carregando...</div>
        ) : (
          <>
            <section style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <PlayIcon size={18} weight="duotone" style={{ color: 'var(--secondary)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Execuções em Andamento</h2>
              </div>
              {activeExecutions.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <GaugeIcon size={40} />
                  <h3>Nenhuma execução em andamento</h3>
                  <p>Inicie uma execução em uma suíte ou lote para acompanhar o progresso aqui.</p>
                  <button className="btn btn-primary" onClick={() => navigate('/suites')} style={{ marginTop: '0.5rem' }}>
                    <FlaskIcon size={16} /> Ver Suítes
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeExecutions.map(execution => (
                    <ExecutionCard
                      key={execution.id}
                      execution={execution}
                      title={executionTitle(execution)}
                      onClick={() => navigateToExecution(execution)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ClockCounterClockwiseIcon size={18} weight="duotone" style={{ color: 'var(--text-muted)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Últimas Execuções</h2>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/executions')}>
                  Ver todas
                </button>
              </div>
              {recentExecutions.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <ClockCounterClockwiseIcon size={40} />
                  <h3>Nenhuma execução recente</h3>
                  <p>O histórico de execuções concluídas aparece aqui assim que você concluir a primeira.</p>
                  <button className="btn btn-primary" onClick={() => navigate('/suites')} style={{ marginTop: '0.5rem' }}>
                    <FlaskIcon size={16} /> Ver Suítes
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentExecutions.map(execution => (
                    <ExecutionCard
                      key={execution.id}
                      execution={execution}
                      title={executionTitle(execution)}
                      onClick={() => navigateToExecution(execution)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </motion.div>
    </div>
  );
}
