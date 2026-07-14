import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowSquareOut, CaretLeft, CaretRight, Flask, MagnifyingGlass, Trash } from '@phosphor-icons/react';
import type { Suite, TestCase } from '../api/client';
import { ConfirmModal } from './ConfirmModal';
import { PRIORITY_COLORS, priorityLabel, normalize } from '../utils/priority';

interface TestCaseListProps {
  testCases: TestCase[];
  onDelete?: (id: string) => Promise<void>;
  onToggleAutomated?: (id: string, automated: boolean) => Promise<void>;
  suiteMap?: Record<string, Suite>;
  renderExtra?: (tc: TestCase) => React.ReactNode;
  isManual?: boolean;
}

type PriorityFilter = 'all' | 'Gravíssima' | 'Crítica' | 'Alta' | 'Média' | 'Normal' | 'Trivial';

const PAGE_SIZES = [10, 25, 50, 100] as const;

export function TestCaseList({ testCases, onDelete, onToggleAutomated, suiteMap, renderExtra, isManual }: TestCaseListProps) {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  const availablePriorities = useMemo(() =>
    Array.from(new Set(testCases.map(tc => priorityLabel(tc.priority)).filter(p => p !== '—'))) as PriorityFilter[],
    [testCases]
  );

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return testCases.filter(tc => {
      const matchesSearch = !q || normalize(tc.jiraKey).includes(q) || normalize(tc.title).includes(q);
      const matchesPriority = priorityFilter === 'all' || priorityLabel(tc.priority) === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [testCases, search, priorityFilter]);

  useEffect(() => { setPage(1); }, [search, priorityFilter, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
  const displayed = pageSize === 'all' ? filtered : filtered.slice(pageStartIndex, pageStartIndex + pageSize);

  const handleToggleAutomated = async (id: string, automated: boolean) => {
    if (!onToggleAutomated) return;
    setTogglingId(id);
    try {
      await onToggleAutomated(id, automated);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setDeleteError(null);
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao excluir caso de teste.';
      setDeleteError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setDeletingId(null);
    }
  };

  if (testCases.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2.5rem' }}>
        <Flask size={40} />
        <h3>Sem casos de teste</h3>
        {isManual
          ? <p>Adicione casos de teste manualmente usando o botão acima.</p>
          : <p>Re-importe a suíte para sincronizar os casos do Jira.</p>
        }
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Filters */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'grid',
        gridTemplateColumns: '1fr 210px 150px',
        gap: '0.75rem',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ID ou título"
            style={{ width: '100%', paddingLeft: '2.4rem' }}
          />
        </div>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}>
          <option value="all">Todas as prioridades</option>
          {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n} por página</option>)}
          <option value="all">Todos</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {suiteMap && <th style={{ width: 120 }}>Suíte</th>}
              <th style={{ width: 150 }}>ID</th>
              <th>Título</th>
              <th style={{ width: 120 }}>Prioridade</th>
              {onToggleAutomated && <th style={{ width: 110 }}>Automatizado</th>}
              {onDelete && <th style={{ width: 60 }} />}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={(onDelete ? 4 : 3) + (suiteMap ? 1 : 0) + (onToggleAutomated ? 1 : 0)} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum caso encontrado.
                </td>
              </tr>
            ) : displayed.map(tc => {
              const priority = priorityLabel(tc.priority);
              const suite = suiteMap?.[tc.suiteId];
              return (
                <tr key={tc.id}>
                  {suiteMap && (
                    <td style={{ width: 110 }}>
                      {suite ? (
                        <Link
                          to={`/suite/${suite.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                        >
                          {suite.jiraKey ?? suite.manualKey ?? suite.title}
                        </Link>
                      ) : (
                        <code>—</code>
                      )}
                    </td>
                  )}
                  <td style={{ width: 150 }}>
                    {tc.link ? (
                      <a
                        href={tc.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                      >
                        {tc.jiraKey} <ArrowSquareOut size={11} />
                      </a>
                    ) : (
                      <code>{tc.jiraKey}</code>
                    )}
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {tc.title}
                    {renderExtra && renderExtra(tc)}
                  </td>
                  <td>
                    {priority === '—' ? (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    ) : (
                      <span className="tag" style={{ background: `${PRIORITY_COLORS[priority]}20`, color: PRIORITY_COLORS[priority] }}>
                        {priority}
                      </span>
                    )}
                  </td>
                  {onToggleAutomated && (
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!tc.automated}
                        disabled={togglingId === tc.id}
                        onChange={e => handleToggleAutomated(tc.id, e.target.checked)}
                      />
                    </td>
                  )}
                  {onDelete && (
                    <td>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setConfirmDeleteId(tc.id)}
                        disabled={deletingId === tc.id}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {deletingId === tc.id
                          ? <div className="spinner" style={{ width: 13, height: 13 }} />
                          : <Trash size={14} />}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageSize !== 'all' && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="filters" style={{ gap: 0 }}>
            <button className="filter-item" onClick={() => setPage(p => p - 1)} disabled={currentPage <= 1} style={{ opacity: currentPage <= 1 ? 0.35 : 1 }}>
              <CaretLeft size={15} /> Anterior
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {currentPage} / {totalPages}
            </span>
            <button className="filter-item" onClick={() => setPage(p => p + 1)} disabled={currentPage >= totalPages} style={{ opacity: currentPage >= totalPages ? 0.35 : 1 }}>
              Próxima <CaretRight size={15} />
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmDeleteId}
        title="Excluir Caso de Teste"
        confirmLabel="Excluir"
        error={deleteError}
        onClose={() => { setConfirmDeleteId(null); setDeleteError(null); }}
        onConfirm={handleDelete}
      >
        {suiteMap ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Tem certeza que deseja remover este caso de teste do lote?
            <br /><br />
            O caso de teste continuará disponível na suíte principal. Execuções já criadas não serão afetadas.
            <br /><br />
            <span style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}>
              Esta operação não pode ser desfeita.
            </span>
          </p>
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Tem certeza que deseja excluir este caso de teste da suíte?
            <br /><br />
            O caso de teste não será excluído do Jira.
            <br /><br />
            <span style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}>
              Esta ação não pode ser desfeita.
            </span>
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}
