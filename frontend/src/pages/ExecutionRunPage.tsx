import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, X, Plus, Trash, FileXls, FilePdf,
  ArrowSquareOut, CheckCircle, MagnifyingGlass,
  CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import { executionsApi, reportsApi, suitesApi } from '../api/client';
import type { Execution, ExecutionTestCase, Issue, Suite } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

const STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED'];
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', IN_PROGRESS: 'Em Andamento',
  PASSED: 'Passou', FAILED: 'Falhou', BLOCKED: 'Bloqueado',
};
const STATUS_COLORS: Record<string, string> = {
  PASSED: '#22c55e', FAILED: '#ef4444', BLOCKED: '#f59e0b',
  IN_PROGRESS: '#3b82f6', PENDING: '#6b7280',
};
const STATUS_FILTERS = [
  { key: 'all', label: 'Todos os status', status: undefined },
  { key: 'PASSED', label: 'Passou', status: 'PASSED' },
  { key: 'FAILED', label: 'Falhou', status: 'FAILED' },
  { key: 'BLOCKED', label: 'Bloqueado', status: 'BLOCKED' },
  { key: 'PENDING', label: 'Pendente', status: 'PENDING' },
];

type StatusFilterKey = 'all' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'PENDING';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return '—';
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function formatVersion(version?: string | null) {
  return version?.trim() ? version : '—';
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const PRIORITY_COLORS: Record<string, string> = {
  Gravíssima: '#DC2626',
  Crítica: '#F97316',
  Alta: '#F59E0B',
  Média: '#22C55E',
  Normal: '#3B82F6',
  Trivial: '#6B7280',
};

function priorityLabel(priority?: string | null): string {
  if (!priority) return '—';
  const normalized = normalize(priority);
  const labels: Record<string, string> = {
    highest: 'Gravíssima',
    critical: 'Gravíssima',
    gravissima: 'Gravíssima',
    gravíssima: 'Gravíssima',
    high: 'Crítica',
    critica: 'Crítica',
    crítica: 'Crítica',
    medium: 'Média',
    media: 'Média',
    média: 'Média',
    low: 'Normal',
    normal: 'Normal',
    trivial: 'Trivial',
  };
  return labels[normalized] ?? priority;
}

// ── Drawer ──────────────────────────────────────────────────────────────────
function TestCaseDrawer({
  executionId, etc, onClose, onUpdated,
}: {
  executionId: string;
  etc: ExecutionTestCase;
  onClose: () => void;
  onUpdated: (updated: ExecutionTestCase) => void;
}) {
  const [status, setStatus] = useState(etc.status);
  const [responsible, setResponsible] = useState(etc.responsible ?? '');
  const [comments, setComments] = useState(etc.comments ?? '');
  const [saving, setSaving] = useState(false);
  const [issueForm, setIssueForm] = useState({ type: 'BUG', jiraKey: '', title: '', severity: 'Medium', status: 'Open', responsible: '' });
  const [addingIssue, setAddingIssue] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issues, setIssues] = useState<Issue[]>(etc.issues);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await executionsApi.updateTestCase(executionId, etc.id, { status, responsible, comments });
      onUpdated(data);
    } catch {}
    setSaving(false);
  };

  const handleAddIssue = async () => {
    if (!issueForm.title.trim()) return;
    setAddingIssue(true);
    try {
      const { data } = await executionsApi.addIssue(executionId, etc.id, issueForm);
      setIssues(prev => [...prev, data]);
      setIssueForm({ type: 'BUG', jiraKey: '', title: '', severity: 'Medium', status: 'Open', responsible: '' });
      setShowIssueForm(false);
    } catch {}
    setAddingIssue(false);
  };

  const handleRemoveIssue = async (issueId: string) => {
    await executionsApi.removeIssue(executionId, etc.id, issueId);
    setIssues(prev => prev.filter(i => i.id !== issueId));
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <motion.div
        className="drawer"
        initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      >
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              {etc.testCase.link ? (
                <a href={etc.testCase.link} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {etc.testCase.jiraKey} <ArrowSquareOut size={11} />
                </a>
              ) : <code style={{ fontSize: '0.8rem' }}>{etc.testCase.jiraKey}</code>}
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)' }}>
              {etc.testCase.title}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="drawer-body">
          <div>
            <p className="drawer-section-title">Status</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: status === s ? STATUS_COLORS[s] : 'var(--bg-elevated)',
                    color: status === s ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${status === s ? STATUS_COLORS[s] : 'var(--border)'}`,
                  }}
                >
                  {STATUS_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="drawer-section-title">Responsável</p>
            <input placeholder="Nome do responsável" value={responsible} onChange={e => setResponsible(e.target.value)} />
          </div>

          <div>
            <p className="drawer-section-title">Comentários</p>
            <textarea
              placeholder="Observações, evidências, notas..."
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : <><CheckCircle size={16} /> Salvar alterações</>}
          </button>

          <div className="divider" />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p className="drawer-section-title" style={{ marginBottom: 0 }}>Bugs & Melhorias</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowIssueForm(s => !s)} style={{ fontSize: '0.75rem' }}>
                <Plus size={13} /> Adicionar
              </button>
            </div>

            <AnimatePresence>
              {showIssueForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label className="form-label">Tipo</label>
                        <select value={issueForm.type} onChange={e => setIssueForm(f => ({ ...f, type: e.target.value }))}>
                          <option value="BUG">Bug</option>
                          <option value="IMPROVEMENT">Melhoria</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Severidade</label>
                        <select value={issueForm.severity} onChange={e => setIssueForm(f => ({ ...f, severity: e.target.value }))}>
                          <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Título *</label>
                      <input placeholder="Descreva o bug ou melhoria" value={issueForm.title} onChange={e => setIssueForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label className="form-label">Key Jira (opcional)</label>
                        <input placeholder="PROJ-999" value={issueForm.jiraKey} onChange={e => setIssueForm(f => ({ ...f, jiraKey: e.target.value.toUpperCase() }))} />
                      </div>
                      <div>
                        <label className="form-label">Status</label>
                        <select value={issueForm.status} onChange={e => setIssueForm(f => ({ ...f, status: e.target.value }))}>
                          <option>Aberto</option><option>Em Andamento</option><option>Resolvido</option>
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleAddIssue} disabled={addingIssue || !issueForm.title.trim()} style={{ justifyContent: 'center' }}>
                      {addingIssue ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <Plus size={14} />}
                      Adicionar Issue
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {issues.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Nenhuma issue vinculada.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {issues.map(issue => (
                  <div key={issue.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: issue.type === 'BUG' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: issue.type === 'BUG' ? 'var(--status-failed)' : 'var(--status-inprogress)' }}>
                          {issue.type === 'BUG' ? 'Bug' : 'Melhoria'}
                        </span>
                        {issue.severity && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{issue.severity}</span>}
                        {issue.jiraKey && <code style={{ fontSize: '0.7rem' }}>{issue.jiraKey}</code>}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{issue.title}</p>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveIssue(issue.id)} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <Trash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ExecutionRunPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [batchSuites, setBatchSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEtc, setSelectedEtc] = useState<ExecutionTestCase | null>(null);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const fetchExecution = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await executionsApi.get(id);
      setExecution(data);
      if (data.batchId) {
        try {
          const { data: batchData } = await executionsApi.getBatch(data.batchId);
          const suiteIds: string[] = batchData.suiteIds ?? [];
          const suites = await Promise.all(
            suiteIds.map(async (suiteId) => {
              try {
                const { data } = await suitesApi.get(suiteId);
                return data;
              } catch {
                return null;
              }
            })
          );
          setBatchSuites(suites.filter((s): s is Suite => !!s));
        } catch {
          setBatchSuites([]);
        }
      }
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchExecution(); }, [fetchExecution]);
  useEffect(() => { setPage(1); }, [statusFilter, search, priorityFilter]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await executionsApi.delete(id);
      setDeleteConfirm(false);
      navigate(execution?.batchId ? `/batch/${execution.batchId}` : `/suites/${execution?.suiteId}`);
    } catch {}
    setDeleting(false);
  };

  const handleUpdated = (updated: ExecutionTestCase) => {
    setExecution(prev => {
      if (!prev) return prev;
      return { ...prev, testCases: prev.testCases.map(tc => tc.id === updated.id ? updated : tc) };
    });
    setSelectedEtc(updated);
  };

  const handleExport = async (type: 'xlsx' | 'pdf') => {
    if (!id) return;
    setExporting(type);
    try {
      const fn = type === 'xlsx' ? reportsApi.xlsx : reportsApi.pdf;
      const { data } = await fn(id);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `testrun-${execution?.suite?.jiraKey ?? id}-${new Date().toISOString().split('T')[0]}.${type === 'xlsx' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(null);
  };

  if (loading) return <div className="page"><div className="loading-page"><div className="spinner" /> Carregando execução...</div></div>;
  if (!execution) return null;

  const tcs = execution.testCases;
  const counts = {
    total: tcs.length,
    passed: tcs.filter(t => t.status === 'PASSED').length,
    failed: tcs.filter(t => t.status === 'FAILED').length,
    blocked: tcs.filter(t => t.status === 'BLOCKED').length,
    inProgress: tcs.filter(t => t.status === 'IN_PROGRESS').length,
    pending: tcs.filter(t => t.status === 'PENDING').length,
  };
  const statusCounts: Record<string, number> = {
    all: counts.total,
    PASSED: counts.passed,
    FAILED: counts.failed,
    BLOCKED: counts.blocked,
    PENDING: counts.pending,
  };
  const executed = counts.passed + counts.failed + counts.blocked;
  const pct = counts.total > 0 ? Math.round((counts.passed / counts.total) * 100) : 0;
  const availablePriorities = Array.from(new Set(tcs.map(tc => priorityLabel(tc.testCase.priority)).filter(p => p !== '—')));
  const query = normalize(search.trim());
  const filteredTcs = tcs
    .filter(tc => statusFilter === 'all' ? true : tc.status === statusFilter)
    .filter(tc => priorityFilter === 'all' ? true : priorityLabel(tc.testCase.priority) === priorityFilter)
    .filter(tc => {
      if (!query) return true;
      return normalize(tc.testCase.jiraKey).includes(query) || normalize(tc.testCase.title).includes(query);
    });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTcs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageTcs = filteredTcs.slice(pageStartIndex, pageStartIndex + pageSize);
  const isBatch = !!execution.batchId;

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(execution?.batchId ? `/batch/${execution.batchId}` : `/suites/${execution.suiteId}`)} style={{ marginBottom: '0.5rem', paddingLeft: 0 }}>
              <ArrowLeft size={15} /> {execution?.batchId ? 'Voltar ao Lote' : execution.suite?.jiraKey}
            </button>
            {isBatch ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span className="tag" style={{ fontFamily: 'var(--font-inter)' }}>LOTE</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {batchSuites.map((suite) => (
                    <h1 key={suite.id} className="page-title" style={{ fontSize: '1.3rem', margin: 0 }}>{suite.title}</h1>
                  ))}
                </div>
                <StatusBadge status={execution.status} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{execution.suite?.jiraKey ?? 'Execução'}</h1>
                <StatusBadge status={execution.status} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => handleExport('xlsx')} disabled={!!exporting}>
              {exporting === 'xlsx' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FileXls size={16} />}
              Excel
            </button>
            <button className="btn btn-secondary" onClick={() => handleExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FilePdf size={16} />}
              PDF
            </button>
            <button className="btn btn-danger" onClick={() => setDeleteConfirm(true)}>
              <Trash size={16} /> Excluir
            </button>
          </div>
        </div>

        {/* Dashboard: Metadata + Progress */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Metadata Card */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Detalhes da Execução</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Sprint</span>
                <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{execution.sprint || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Versão do Sistema</span>
                <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{formatVersion(execution.version)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Período</span>
                <span style={{ fontSize: '0.875rem' }}>{formatPeriod(execution.startDate, execution.endDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Responsável</span>
                <span style={{ fontSize: '0.875rem' }}>{execution.responsible || '—'}</span>
              </div>
            </div>
          </div>

          {/* Execution Progress Card */}
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Progresso da Execução</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent)' }}>{pct}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Executado ({executed})</span>
                <span style={{ color: 'var(--text-secondary)' }}>Total ({counts.total})</span>
              </div>
              <div style={{ height: 16, background: 'var(--bg-overlay)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                {counts.passed > 0 && <div style={{ width: `${(counts.passed / counts.total) * 100}%`, background: STATUS_COLORS.PASSED, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} title={`Passou: ${counts.passed}`} />}
                {counts.failed > 0 && <div style={{ width: `${(counts.failed / counts.total) * 100}%`, background: STATUS_COLORS.FAILED, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} title={`Falhou: ${counts.failed}`} />}
                {counts.blocked > 0 && <div style={{ width: `${(counts.blocked / counts.total) * 100}%`, background: STATUS_COLORS.BLOCKED, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} title={`Bloqueado: ${counts.blocked}`} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS.PASSED, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Passou ({counts.passed})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS.FAILED, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Falhou ({counts.failed})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS.BLOCKED, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Bloqueado ({counts.blocked})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Pendente ({counts.pending})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: '1fr 210px 210px',
            gap: '0.75rem',
            alignItems: 'center',
          }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlass size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por ID ou título"
                style={{ width: '100%', paddingLeft: '2.4rem' }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilterKey)}>
              {STATUS_FILTERS.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="all">Todas as prioridades</option>
              {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Casos de Teste</h2>
            <span className="badge">{filteredTcs.length}</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 110 }}>Key</th>
                  <th>Título</th>
                  <th style={{ width: 120 }}>Prioridade</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 140 }}>Responsável</th>
                  <th style={{ width: 60 }}>Issues</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {pageTcs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum caso encontrado.</td>
                  </tr>
                ) : pageTcs.map((etc, idx) => {
                  const priority = priorityLabel(etc.testCase.priority);
                  return (
                    <tr
                      key={etc.id}
                      style={{ cursor: 'pointer', background: selectedEtc?.id === etc.id ? 'var(--accent-subtle)' : undefined }}
                      onClick={() => setSelectedEtc(etc)}
                    >
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>{pageStartIndex + idx + 1}</td>
                      <td>
                        {etc.testCase.link ? (
                          <a href={etc.testCase.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent)', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                            {etc.testCase.jiraKey} <ArrowSquareOut size={10} />
                          </a>
                        ) : <code style={{ fontSize: '0.8rem' }}>{etc.testCase.jiraKey}</code>}
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{etc.testCase.title}</td>
                      <td>
                        {priority === '—' ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          <span className="tag" style={{ background: `${PRIORITY_COLORS[priority]}20`, color: PRIORITY_COLORS[priority] }}>{priority}</span>
                        )}
                      </td>
                      <td><StatusBadge status={etc.status} /></td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{etc.responsible ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {etc.issues.length > 0 ? (
                          <span style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--status-failed)', borderRadius: 99, padding: '0.15rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                            {etc.issues.length}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <CaretRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
<button className="btn btn-secondary" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>
               <CaretLeft size={16} /> Anterior
             </button>
             <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Página {currentPage} de {totalPages}</span>
             <button className="btn btn-secondary" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>
               Próxima <CaretRight size={16} />
             </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedEtc && (
          <TestCaseDrawer
            key={selectedEtc.id}
            executionId={execution.id}
            etc={selectedEtc}
            onClose={() => setSelectedEtc(null)}
            onUpdated={handleUpdated}
          />
        )}
      </AnimatePresence>

      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Excluir Execução"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Trash size={16} />}
              Excluir
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Tem certeza que deseja excluir esta execução? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
