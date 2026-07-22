import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CaretLeft, CaretRight, Bug, MagnifyingGlass } from '@phosphor-icons/react';
import { jiraIssuesApi } from '../api/client';
import type { JiraIssue, JiraIssueFilters } from '../api/client';
import { useProject } from '../context/ProjectContext';
import { useBoard } from '../context/BoardContext';
import { IssuesTable, IssueKeyLink, IssueTypeTag, IssuePriorityTag } from '../components/IssuesTable';

const PAGE_SIZES = [10, 25, 50, 100] as const;
const EMPTY_FILTERS: JiraIssueFilters = { types: [], statuses: [], priorities: [] };

export default function JiraIssuesPage() {
  const { selectedProject, loading: projectLoading } = useProject();
  const { selectedBoard, loading: boardLoading } = useBoard();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [data, setData] = useState<JiraIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<JiraIssueFilters>(EMPTY_FILTERS);

  const isNoneBoard = selectedBoard?.id === 'none';
  const hasFilters = !!(type || status || priority || search);

  // Debounce: só atualiza `search` (o que de fato dispara a busca) 400ms depois de
  // parar de digitar — evita uma chamada JQL a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!selectedProject) {
      setFilters(EMPTY_FILTERS);
      return;
    }
    jiraIssuesApi.getFilters(selectedProject.id)
      .then(({ data }) => setFilters(data))
      .catch(() => setFilters(EMPTY_FILTERS));
  }, [selectedProject]);

  const fetchData = useCallback(
    async (projectId: string, boardId: string) => {
      setLoading(true);
      try {
        const { data: res } = await jiraIssuesApi.list(projectId, boardId, {
          page, pageSize, type: type || undefined, status: status || undefined,
          priority: priority || undefined, search: search || undefined,
        });
        setData(res.data);
        setTotal(res.total);
      } catch {}
      finally { setLoading(false); }
    },
    [page, pageSize, type, status, priority, search]
  );

  useEffect(() => {
    if (!selectedProject || !selectedBoard || isNoneBoard) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    fetchData(selectedProject.id, selectedBoard.id);
  }, [selectedProject, selectedBoard, isNoneBoard, fetchData]);

  useEffect(() => { setPage(1); }, [type, status, priority, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const typeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of filters.types) map[t.value] = t.label;
    return (value: string) => map[value] ?? value;
  }, [filters.types]);

  if (projectLoading || boardLoading) {
    return <div className="loading-page"><div className="spinner" /> Carregando...</div>;
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height))' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <div className="page-header" style={{ flexShrink: 0 }}>
          <div>
            <h1 className="page-title">Bugs e Melhorias</h1>
            <p className="page-subtitle">Bugs e melhorias registrados no Jira do quadro selecionado</p>
          </div>
        </div>

        {!selectedProject ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Bug size={56} />
            <h3>Nenhum projeto selecionado</h3>
            <p>Selecione um projeto no menu lateral para ver os bugs e melhorias.</p>
          </div>
        ) : !selectedBoard ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Bug size={56} />
            <h3>Nenhum quadro encontrado</h3>
            <p>Este projeto não tem quadros no Jira nem suítes sem quadro.</p>
          </div>
        ) : isNoneBoard ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Bug size={56} />
            <h3>Não disponível para "Sem quadro"</h3>
            <p>Selecione um quadro real do Jira no menu lateral para ver bugs e melhorias.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Busca + filtros */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 160 }}>
                <MagnifyingGlass
                  size={16}
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Buscar por título"
                  style={{ width: '100%', paddingLeft: '2.4rem' }}
                />
              </div>
              <select value={type} onChange={e => setType(e.target.value)} style={{ flex: '0 1 155px', minWidth: 145, paddingRight: '1.7rem' }}>
                <option value="">Todos os tipos</option>
                {filters.types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: '0 1 165px', minWidth: 155, paddingRight: '1.7rem' }}>
                <option value="">Todos os status</option>
                {filters.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ flex: '0 1 210px', minWidth: 200 }}>
                <option value="">Todas as severidades</option>
                {filters.priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

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
              <div className="loading-page" style={{ padding: '2.5rem' }}><div className="spinner" /> Carregando...</div>
            ) : (
              <IssuesTable
                issues={data}
                fillHeight
                emptyMessage={hasFilters ? 'Nenhum resultado com os filtros aplicados.' : 'Sem bugs ou melhorias neste quadro.'}
                columns={[
                  { header: 'ID', width: 130, render: issue => <IssueKeyLink issue={issue} /> },
                  { header: 'Título', render: issue => <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{issue.summary}</span> },
                  { header: 'Tipo', width: 110, render: issue => <IssueTypeTag issue={issue} label={typeLabel(issue.issuetype)} /> },
                  { header: 'Status', width: 150, render: issue => <span className="tag" style={{ whiteSpace: 'nowrap' }}>{issue.status}</span> },
                  { header: 'Severidade', width: 130, render: issue => <IssuePriorityTag issue={issue} /> },
                  { header: 'Responsável', width: 160, render: issue => <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{issue.assignee ?? '—'}</span> },
                  {
                    header: 'Atualizado em', width: 140, nowrap: true,
                    render: issue => (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {issue.updated ? new Date(issue.updated).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    ),
                  },
                ]}
              />
            )}

            {!loading && totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
