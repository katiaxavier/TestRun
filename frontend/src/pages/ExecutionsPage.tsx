import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CaretLeft, CaretRight, Clock } from '@phosphor-icons/react';
import { executionsApi } from '../api/client';
import type { Execution } from '../api/client';
import { ExecutionCard } from '../components/ExecutionCard';
import { PageHeader } from '../components/PageHeader';
import { Tooltip } from '../components/Tooltip';
import { useProject } from '../context/ProjectContext';
import { useBoard } from '../context/BoardContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'PENDING', label: 'Pendente' },
];

const PAGE_SIZES = [10, 25, 50, 100] as const;

export default function ExecutionsPage() {
  const navigate = useNavigate();
  const { selectedProject, loading: projectLoading } = useProject();
  const { selectedBoard, loading: boardLoading } = useBoard();
  const [status, setStatus] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [data, setData] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(
    async (projectId: string, boardId: string) => {
      setLoading(true);
      try {
        const { data: res } = await executionsApi.getAll(projectId, boardId, {
          status: status || undefined,
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
          page,
          pageSize,
        });
        setData(res.data);
        setTotal(res.total);
      } catch {}
      finally { setLoading(false); }
    },
    [status, periodStart, periodEnd, page, pageSize]
  );

  useEffect(() => {
    if (!selectedProject || !selectedBoard) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    fetchData(selectedProject.id, selectedBoard.id);
  }, [selectedProject, selectedBoard, fetchData]);

  useEffect(() => { setPage(1); }, [status, periodStart, periodEnd, pageSize]);

  const executionTitle = (execution: Execution) =>
    execution.suite
      ? `${execution.suite.jiraKey ? `${execution.suite.jiraKey} — ` : ''}${execution.suite.title}`
      : execution.batch?.name
      ? `Lote — ${execution.batch.name}`
      : undefined;

  const navigateToExecution = (execution: Execution) =>
    navigate(`/execution/${execution.id}`, { state: { from: 'executions' } });

  const hasFilters = status || periodStart || periodEnd;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (projectLoading || boardLoading) {
    return <div className="loading-page"><div className="spinner" /> Carregando...</div>;
  }

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader
          backLabel="Execuções"
          onBack={() => navigate('/execucoes')}
          title="Todas as Execuções"
        />

        {!selectedProject ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Clock size={56} />
            <h3>Nenhum projeto selecionado</h3>
            <p>Selecione um projeto no menu lateral para ver as execuções.</p>
          </div>
        ) : !selectedBoard ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Clock size={56} />
            <h3>Nenhum quadro encontrado</h3>
            <p>Este projeto não tem quadros no Jira nem suítes sem quadro.</p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius)',
            }}>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ flex: '0 1 170px', minWidth: 140 }}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <Tooltip content="Data de início" placement="top">
                <input
                  type="date"
                  value={periodStart}
                  onChange={e => {
                    setPeriodStart(e.target.value);
                    if (periodEnd && periodEnd < e.target.value) setPeriodEnd('');
                  }}
                  style={{ flex: '0 1 150px', minWidth: 130 }}
                />
              </Tooltip>
              <Tooltip content="Data de fim" placement="top">
                <input
                  type="date"
                  value={periodEnd}
                  min={periodStart || undefined}
                  onChange={e => setPeriodEnd(e.target.value)}
                  style={{ flex: '0 1 150px', minWidth: 130 }}
                />
              </Tooltip>

              {hasFilters && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setStatus(''); setPeriodStart(''); setPeriodEnd(''); }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Limpar filtros
                </button>
              )}

              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                style={{ flex: '0 1 140px', minWidth: 120, marginLeft: 'auto' }}
              >
                {PAGE_SIZES.map(s => (
                  <option key={s} value={s}>{s} por página</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading-page"><div className="spinner" /> Carregando...</div>
            ) : data.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <Clock size={32} />
                  <h3 style={{ fontSize: '0.9rem' }}>
                    {total === 0 && !hasFilters ? 'Sem execuções' : 'Nenhuma execução encontrada'}
                  </h3>
                  <p style={{ fontSize: '0.8rem' }}>
                    {total === 0 && !hasFilters
                      ? 'Inicie um novo ciclo de execução em uma suíte ou lote.'
                      : 'Tente ajustar os filtros aplicados.'}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.map(execution => (
                  <ExecutionCard
                    key={execution.id}
                    execution={execution}
                    title={executionTitle(execution)}
                    onClick={() => navigateToExecution(execution)}
                  />
                ))}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.25rem 0' }}>
                <div className="filters" style={{ gap: 0 }}>
                  <button className="filter-item" onClick={() => setPage(p => p - 1)} disabled={page <= 1} style={{ opacity: page <= 1 ? 0.35 : 1 }}>
                    <CaretLeft size={15} /> Anterior
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {page} / {totalPages}
                  </span>
                  <button className="filter-item" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.35 : 1 }}>
                    Próxima <CaretRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
