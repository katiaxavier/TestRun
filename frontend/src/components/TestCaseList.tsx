import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowSquareOut, Flask, MagnifyingGlass, Trash } from '@phosphor-icons/react';
import type { Suite, TestCase } from '../api/client';

interface TestCaseListProps {
  testCases: TestCase[];
  onDelete?: (id: string) => Promise<void>;
  suiteMap?: Record<string, Suite>;
}

type PriorityFilter = 'all' | 'Gravíssima' | 'Crítica' | 'Alta' | 'Média' | 'Normal' | 'Trivial';

const PRIORITY_COLORS: Record<string, string> = {
  Gravíssima: '#DC2626',
  Crítica: '#F97316',
  Alta: '#F59E0B',
  Média: '#22C55E',
  Normal: '#3B82F6',
  Trivial: '#6B7280',
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function priorityLabel(priority?: string | null): string {
  if (!priority) return '—';
  const n = normalize(priority);
  const map: Record<string, string> = {
    highest: 'Gravíssima', critical: 'Gravíssima', gravissima: 'Gravíssima', 'gravíssima': 'Gravíssima',
    high: 'Crítica', critica: 'Crítica', 'crítica': 'Crítica',
    medium: 'Média', media: 'Média', 'média': 'Média',
    low: 'Normal', normal: 'Normal',
    trivial: 'Trivial',
  };
  return map[n] ?? priority;
}

export function TestCaseList({ testCases, onDelete, suiteMap }: TestCaseListProps) {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!onDelete || !confirm('Excluir este caso de teste localmente?')) return;
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  };

  if (testCases.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2.5rem' }}>
        <Flask size={40} />
        <h3>Sem casos de teste</h3>
        <p>Re-importe a suíte para sincronizar os casos do Jira.</p>
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
        gridTemplateColumns: '1fr 210px',
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
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {suiteMap && <th style={{ width: 120 }}>Suite</th>}
              <th style={{ width: 120 }}>Key</th>
              <th>Título</th>
              <th style={{ width: 120 }}>Prioridade</th>
              {onDelete && <th style={{ width: 60 }} />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={(onDelete ? 4 : 3) + (suiteMap ? 1 : 0)} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum caso encontrado.
                </td>
              </tr>
            ) : filtered.map(tc => {
              const priority = priorityLabel(tc.priority);
              const suite = suiteMap?.[tc.suiteId];
              return (
                <tr key={tc.id}>
                  {suiteMap && (
                    <td style={{ width: 110 }}>
                      {suite ? (
                        <Link
                          to={`/suites/${suite.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                        >
                          {suite.jiraKey}
                        </Link>
                      ) : (
                        <code>—</code>
                      )}
                    </td>
                  )}
                  <td style={{ width: 110 }}>
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
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{tc.title}</td>
                  <td>
                    {priority === '—' ? (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    ) : (
                      <span className="tag" style={{ background: `${PRIORITY_COLORS[priority]}20`, color: PRIORITY_COLORS[priority] }}>
                        {priority}
                      </span>
                    )}
                  </td>
                  {onDelete && (
                    <td>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDelete(tc.id)}
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
    </div>
  );
}
