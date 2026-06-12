import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, X, Plus, Trash, FileXls, FilePdf,
  ArrowSquareOut, CheckCircle, CaretRight,
} from '@phosphor-icons/react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { executionsApi, reportsApi } from '../api/client';
import type { Execution, ExecutionTestCase, Issue } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

const STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED'];
const STATUS_COLORS: Record<string, string> = {
  PASSED: '#22c55e', FAILED: '#ef4444', BLOCKED: '#f59e0b',
  IN_PROGRESS: '#3b82f6', PENDING: '#6b7280',
};

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
        {/* Header */}
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

        {/* Body */}
        <div className="drawer-body">
          {/* Status */}
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
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Responsible */}
          <div>
            <p className="drawer-section-title">Responsável</p>
            <input placeholder="Nome do responsável" value={responsible} onChange={e => setResponsible(e.target.value)} />
          </div>

          {/* Comments */}
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

          {/* Save */}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : <><CheckCircle size={16} /> Salvar alterações</>}
          </button>

          <div className="divider" />

          {/* Issues */}
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
                          <option>Open</option><option>In Progress</option><option>Resolved</option>
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
  const [loading, setLoading] = useState(true);
  const [selectedEtc, setSelectedEtc] = useState<ExecutionTestCase | null>(null);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const fetchExecution = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await executionsApi.get(id);
      setExecution(data);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchExecution(); }, [fetchExecution]);

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
  const executed = counts.passed + counts.failed + counts.blocked;
  const pct = counts.total > 0 ? Math.round((counts.passed / counts.total) * 100) : 0;

  const chartData = [
    { name: 'Passed', value: counts.passed, color: STATUS_COLORS.PASSED },
    { name: 'Failed', value: counts.failed, color: STATUS_COLORS.FAILED },
    { name: 'Blocked', value: counts.blocked, color: STATUS_COLORS.BLOCKED },
    { name: 'In Progress', value: counts.inProgress, color: STATUS_COLORS.IN_PROGRESS },
    { name: 'Pending', value: counts.pending, color: STATUS_COLORS.PENDING },
  ].filter(d => d.value > 0);

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="page-header">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/suites/${execution.suiteId}`)} style={{ marginBottom: '0.5rem', paddingLeft: 0 }}>
              <ArrowLeft size={15} /> {execution.suite?.jiraKey}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{execution.testedFeature}</h1>
              <StatusBadge status={execution.status} />
            </div>
            <p className="page-subtitle">{execution.sprint} · v{execution.version} · {execution.responsible}</p>
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
          </div>
        </div>

        {/* Stats + Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <p className="stat-label">Total</p>
                <p className="stat-value">{counts.total}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Executado</p>
                <p className="stat-value">{executed}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Passed</p>
                <p className="stat-value passed">{counts.passed}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Failed</p>
                <p className="stat-value failed">{counts.failed}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Blocked</p>
                <p className="stat-value blocked">{counts.blocked}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Aprovação</p>
                <p className="stat-value progress">{pct}%</p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <span>Progresso</span>
                <span>{executed}/{counts.total} executados</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-overlay)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ display: 'flex', height: '100%' }}>
                  {counts.passed > 0 && <div style={{ width: `${(counts.passed / counts.total) * 100}%`, background: STATUS_COLORS.PASSED, transition: 'width 0.4s ease' }} />}
                  {counts.failed > 0 && <div style={{ width: `${(counts.failed / counts.total) * 100}%`, background: STATUS_COLORS.FAILED, transition: 'width 0.4s ease' }} />}
                  {counts.blocked > 0 && <div style={{ width: `${(counts.blocked / counts.total) * 100}%`, background: STATUS_COLORS.BLOCKED, transition: 'width 0.4s ease' }} />}
                  {counts.inProgress > 0 && <div style={{ width: `${(counts.inProgress / counts.total) * 100}%`, background: STATUS_COLORS.IN_PROGRESS, transition: 'width 0.4s ease' }} />}
                </div>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Distribuição</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((v: any, name: any) => [`${v} (${Math.round((v / counts.total) * 100)}%)`, String(name)]) as any}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Sem dados
              </div>
            )}
          </div>
        </div>

        {/* Test Cases Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Casos de Teste</h2>
            <span className="badge">{counts.total}</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 110 }}>Key</th>
                  <th>Título</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 140 }}>Responsável</th>
                  <th style={{ width: 60 }}>Issues</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {tcs.map((etc, idx) => (
                  <tr
                    key={etc.id}
                    style={{ cursor: 'pointer', background: selectedEtc?.id === etc.id ? 'var(--accent-subtle)' : undefined }}
                    onClick={() => setSelectedEtc(etc)}
                  >
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>{idx + 1}</td>
                    <td>
                      {etc.testCase.link ? (
                        <a href={etc.testCase.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent)', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          {etc.testCase.jiraKey} <ArrowSquareOut size={10} />
                        </a>
                      ) : <code style={{ fontSize: '0.8rem' }}>{etc.testCase.jiraKey}</code>}
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{etc.testCase.title}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Drawer */}
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
    </div>
  );
}
