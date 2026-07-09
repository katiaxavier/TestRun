import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, X, Plus, Trash, FileXls, FilePdf,
  ArrowSquareOut, CheckCircle, MagnifyingGlass,
  CaretLeft, CaretRight, Pencil, FolderOpen,
  CheckSquare, Square,
} from '@phosphor-icons/react';
import { executionsApi, reportsApi, suitesApi, jiraApi } from '../api/client';
import type { Execution, ExecutionTestCase, Issue, Suite, Scenario } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Tooltip } from '../components/Tooltip';
import { PRIORITY_COLORS, SEVERITY_COLORS, priorityLabel, normalize } from '../utils/priority';

const STATUS_OPTIONS = ['PENDING', 'PASSED', 'FAILED', 'BLOCKED'];
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
  return new Date(value.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR');
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return '—';
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function formatVersion(version?: string | null) {
  return version?.trim() ? version : '—';
}

// ── Issue helpers ────────────────────────────────────────────────────────────
const SEVERITY_PT: Record<string, string> = { Trivial: 'Trivial', Normal: 'Normal', Low: 'Trivial', Medium: 'Média', High: 'Alta', Critical: 'Crítica', Gravissima: 'Gravíssima' };
const SEVERITY_EN: Record<string, string> = { Trivial: 'Trivial', Normal: 'Normal', Média: 'Medium', Alta: 'High', Crítica: 'Critical', 'Gravíssima': 'Gravissima' };
const ISSUE_STATUS_PT: Record<string, string> = { Open: 'Aberto', 'In Progress': 'Em Andamento', Resolved: 'Resolvido', Cancelled: 'Cancelado' };
const ISSUE_STATUS_EN: Record<string, string> = { Aberto: 'Open', 'Em Andamento': 'In Progress', Resolvido: 'Resolved', Cancelado: 'Cancelled' };

const ISSUE_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  Aberto:        { color: 'var(--status-blocked)',   bg: 'var(--status-blocked-bg)' },
  'Em Andamento':{ color: 'var(--status-inprogress)', bg: 'var(--status-inprogress-bg)' },
  Resolvido:     { color: 'var(--status-passed)',    bg: 'var(--status-passed-bg)' },
  Cancelado:     { color: 'var(--status-pending)',   bg: 'var(--status-pending-bg)' },
};

type IssueFormState = { type: string; jiraKey: string; title: string; severity: string; status: string };
const EMPTY_ISSUE_FORM: IssueFormState = { type: 'BUG', jiraKey: '', title: '', severity: 'Média', status: 'Aberto' };

function IssueForm({ form, onChange, onSubmit, onCancel, loading, submitLabel }: {
  form: IssueFormState;
  onChange: (f: IssueFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <label className="form-label">Tipo</label>
          <select value={form.type} onChange={e => onChange({ ...form, type: e.target.value })}>
            <option value="BUG">Bug</option>
            <option value="IMPROVEMENT">Melhoria</option>
          </select>
        </div>
        <div>
          <label className="form-label">Severidade</label>
          <select value={form.severity} onChange={e => onChange({ ...form, severity: e.target.value })}>
            <option>Trivial</option><option>Normal</option><option>Média</option><option>Alta</option><option>Crítica</option><option>Gravíssima</option>
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">Título *</label>
        <input placeholder="Descreva o bug ou melhoria" value={form.title} onChange={e => onChange({ ...form, title: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <label className="form-label">ID Jira (opcional)</label>
          <input placeholder="PROJ-999" value={form.jiraKey} onChange={e => onChange({ ...form, jiraKey: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select value={form.status} onChange={e => onChange({ ...form, status: e.target.value })}>
            <option>Aberto</option><option>Em Andamento</option><option>Resolvido</option><option>Cancelado</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary btn-sm" onClick={onSubmit} disabled={loading || !form.title.trim()} style={{ justifyContent: 'center', flex: 1 }}>
          {loading ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <CheckCircle size={14} />}
          {submitLabel}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={loading}>Cancelar</button>
      </div>
    </div>
  );
}

function IssueCard({ issue, jiraUrl, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete }: {
  issue: Issue;
  jiraUrl: string;
  onEdit: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const severityPt = SEVERITY_PT[issue.severity ?? ''] ?? issue.severity;
  const statusPt = ISSUE_STATUS_PT[issue.status ?? ''] ?? issue.status;
  const jiraHref = issue.jiraKey && jiraUrl ? `${jiraUrl.replace(/\/$/, '')}/browse/${issue.jiraKey}` : null;
  const severityStyle = severityPt ? SEVERITY_COLORS[severityPt] : undefined;
  const statusStyle = statusPt ? ISSUE_STATUS_STYLE[statusPt] : undefined;
  return (
    <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: issue.type === 'BUG' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: issue.type === 'BUG' ? 'var(--status-failed)' : 'var(--status-inprogress)' }}>
              {issue.type === 'BUG' ? 'Bug' : 'Melhoria'}
            </span>
            {severityPt && severityStyle && (
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 4, background: severityStyle.bg, color: severityStyle.color }}>
                {severityPt}
              </span>
            )}
            {statusPt && statusStyle && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99, background: statusStyle.bg, color: statusStyle.color }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />
                {statusPt}
              </span>
            )}
            {issue.jiraKey && (
              jiraHref
                ? <a href={jiraHref} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent)' }}>
                    {issue.jiraKey} <ArrowSquareOut size={10} />
                  </a>
                : <code style={{ fontSize: '0.7rem' }}>{issue.jiraKey}</code>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{issue.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.1rem', flexShrink: 0 }}>
          <Tooltip content="Editar" placement="top">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} style={{ color: 'var(--text-muted)' }}><Pencil size={13} /></button>
          </Tooltip>
          <Tooltip content="Remover" placement="top">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} style={{ color: 'var(--text-muted)' }}><Trash size={13} /></button>
          </Tooltip>
        </div>
      </div>
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.6rem', marginTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flex: 1 }}>{issue.type === 'BUG' ? 'Remover este bug?' : 'Remover esta melhoria?'}</span>
              <button className="btn btn-danger btn-sm" onClick={onConfirmDelete}>Remover</button>
              <button className="btn btn-ghost btn-sm" onClick={onCancelDelete}>Cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Issue panel (reusable for test case and scenario) ────────────────────────
function IssuePanel({
  issues, jiraUrl, onAdd, onUpdate, onRemove,
}: {
  issues: Issue[];
  jiraUrl: string;
  onAdd: (data: { type: string; jiraKey?: string; title: string; severity?: string; status?: string }) => Promise<void>;
  onUpdate: (issueId: string, data: { type?: string; jiraKey?: string | null; title?: string; severity?: string; status?: string }) => Promise<void>;
  onRemove: (issueId: string) => Promise<void>;
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueFormState>(EMPTY_ISSUE_FORM);
  const [addingIssue, setAddingIssue] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<IssueFormState>(EMPTY_ISSUE_FORM);
  const [updatingIssue, setUpdatingIssue] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  const handleAdd = async () => {
    if (!issueForm.title.trim()) return;
    setAddingIssue(true);
    try {
      await onAdd({
        type: issueForm.type,
        jiraKey: issueForm.jiraKey || undefined,
        title: issueForm.title,
        severity: SEVERITY_EN[issueForm.severity] ?? issueForm.severity,
        status: ISSUE_STATUS_EN[issueForm.status] ?? issueForm.status,
      });
      setIssueForm(EMPTY_ISSUE_FORM);
      setShowIssueForm(false);
      addToast(issueForm.type === 'BUG' ? 'Bug adicionado' : 'Melhoria adicionada');
    } catch {
      addToast('Erro ao adicionar issue', 'error');
    }
    setAddingIssue(false);
  };

  const handleUpdate = async (issueId: string) => {
    setUpdatingIssue(true);
    try {
      await onUpdate(issueId, {
        type: editForm.type,
        jiraKey: editForm.jiraKey || null,
        title: editForm.title,
        severity: SEVERITY_EN[editForm.severity] ?? editForm.severity,
        status: ISSUE_STATUS_EN[editForm.status] ?? editForm.status,
      });
      setEditingIssueId(null);
      addToast(editForm.type === 'BUG' ? 'Bug atualizado' : 'Melhoria atualizada');
    } catch {
      addToast('Erro ao atualizar', 'error');
    }
    setUpdatingIssue(false);
  };

  const handleRemove = async (issueId: string) => {
    const issueType = issues.find(i => i.id === issueId)?.type;
    try {
      await onRemove(issueId);
      setDeleteConfirmId(null);
      addToast(issueType === 'BUG' ? 'Bug removido' : 'Melhoria removida');
    } catch {
      addToast('Erro ao remover', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span className="drawer-section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Bugs & Melhorias
          {issues.length > 0 && <span className="badge">{issues.length}</span>}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => { setShowIssueForm(s => !s); setEditingIssueId(null); }} style={{ fontSize: '0.75rem' }}>
          <Plus size={13} /> Adicionar
        </button>
      </div>

      <AnimatePresence>
        {showIssueForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '0.75rem' }}>
            <IssueForm form={issueForm} onChange={setIssueForm} onSubmit={handleAdd} onCancel={() => setShowIssueForm(false)} loading={addingIssue} submitLabel="Adicionar" />
          </motion.div>
        )}
      </AnimatePresence>

      {issues.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Nenhuma issue vinculada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {issues.map(issue => (
            <div key={issue.id}>
              {editingIssueId === issue.id ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <IssueForm
                    form={editForm} onChange={setEditForm}
                    onSubmit={() => handleUpdate(issue.id)}
                    onCancel={() => setEditingIssueId(null)}
                    loading={updatingIssue} submitLabel="Salvar"
                  />
                </motion.div>
              ) : (
                <IssueCard
                  issue={issue} jiraUrl={jiraUrl}
                  onEdit={() => {
                    setEditingIssueId(issue.id);
                    setShowIssueForm(false);
                    setEditForm({
                      type: issue.type,
                      jiraKey: issue.jiraKey ?? '',
                      title: issue.title,
                      severity: SEVERITY_PT[issue.severity ?? ''] ?? issue.severity ?? 'Média',
                      status: ISSUE_STATUS_PT[issue.status ?? ''] ?? issue.status ?? 'Aberto',
                    });
                  }}
                  onDelete={() => setDeleteConfirmId(issue.id)}
                  confirmDelete={deleteConfirmId === issue.id}
                  onConfirmDelete={() => handleRemove(issue.id)}
                  onCancelDelete={() => setDeleteConfirmId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="toast-area">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} className={`toast toast-${t.type}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Scenario view inside drawer ───────────────────────────────────────────────
function ScenarioView({
  executionId, etcId, scenario, onBack, onUpdated, onDeleted, allScenarios, currentScenarioIndex, onNavigate,
}: {
  executionId: string;
  etcId: string;
  scenario: Scenario;
  onBack: () => void;
  onUpdated: (s: Scenario) => void;
  onDeleted: (issues?: Issue[]) => void;
  allScenarios?: Scenario[];
  currentScenarioIndex?: number;
  onNavigate?: (s: Scenario) => void;
}) {
  const [status, setStatus] = useState(scenario.status);
  const [comments, setComments] = useState(scenario.comments ?? '');
  const initialComments = useRef(scenario.comments ?? '');
  const [issues, setIssues] = useState<Issue[]>(scenario.issues);
  const [savingStatus, setSavingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [jiraUrl, setJiraUrl] = useState('');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(scenario.name);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    jiraApi.getSite().then(({ data }) => setJiraUrl(data.url ?? '')).catch(() => {});
  }, []);

  useEffect(() => {
    setStatus(scenario.status);
    setComments(scenario.comments ?? '');
    initialComments.current = scenario.comments ?? '';
    setIssues(scenario.issues);
    setSavedFeedback(false);
    setEditingName(false);
    setNameInput(scenario.name);
  }, [scenario.id]);

  const isDirty = comments !== initialComments.current;

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || savingStatus) return;
    const prev = status;
    setStatus(newStatus);
    setSavingStatus(true);
    try {
      const { data } = await executionsApi.updateScenario(executionId, etcId, scenario.id, { status: newStatus });
      onUpdated({ ...data, issues });
      addToast('Status atualizado');
    } catch {
      setStatus(prev);
      addToast('Erro ao atualizar status', 'error');
    }
    setSavingStatus(false);
  };

  const handleRename = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === scenario.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const { data } = await executionsApi.updateScenario(executionId, etcId, scenario.id, { name: trimmed });
      onUpdated({ ...data, issues });
      setEditingName(false);
      addToast('Nome atualizado');
    } catch {
      addToast('Erro ao renomear cenário', 'error');
    }
    setSavingName(false);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const { data } = await executionsApi.updateScenario(executionId, etcId, scenario.id, { comments });
      onUpdated({ ...data, issues });
      initialComments.current = comments;
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch {
      addToast('Erro ao salvar', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await executionsApi.deleteScenario(executionId, etcId, scenario.id);
      onDeleted(issues);
    } catch {
      addToast('Erro ao excluir cenário', 'error');
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="drawer-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onBack}
            style={{ paddingLeft: 0, marginBottom: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}
          >
            <CaretLeft size={13} /> Voltar ao caso de teste
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
            <FolderOpen size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
            {editingName ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditingName(false); setNameInput(scenario.name); } }}
                  autoFocus
                  style={{ fontSize: '0.9rem', fontWeight: 600 }}
                />
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleRename} disabled={savingName || !nameInput.trim()} style={{ flex: 1, justifyContent: 'center' }}>
                    {savingName ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <CheckCircle size={13} />}
                    Salvar
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingName(false); setNameInput(scenario.name); }} disabled={savingName}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)', flex: 1 }}>
                  {scenario.name}
                </p>
                <Tooltip content="Renomear" placement="top">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setNameInput(scenario.name); setEditingName(true); }} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Pencil size={13} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
        {allScenarios && allScenarios.length > 1 && onNavigate && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.2rem', flexShrink: 0 }}>
            <Tooltip content="Cenário anterior" placement="top">
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => onNavigate(allScenarios[(currentScenarioIndex ?? 0) - 1])}
                disabled={(currentScenarioIndex ?? 0) <= 0}
              >
                <CaretLeft size={15} />
              </button>
            </Tooltip>
            <Tooltip content="Próximo cenário" placement="top">
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => onNavigate(allScenarios[(currentScenarioIndex ?? 0) + 1])}
                disabled={(currentScenarioIndex ?? 0) >= allScenarios.length - 1}
              >
                <CaretRight size={15} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="drawer-body">
        <div>
          <span className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Status
            {savingStatus && <div className="spinner" style={{ width: 10, height: 10 }} />}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={savingStatus}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: status === s ? STATUS_COLORS[s] : 'var(--bg-elevated)',
                  color: status === s ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${status === s ? STATUS_COLORS[s] : 'var(--border)'}`,
                  opacity: savingStatus ? 0.65 : 1,
                }}
              >
                {STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="drawer-section-title">Observações</p>
          <textarea
            placeholder="Observações, evidências, notas..."
            value={comments}
            onChange={e => setComments(e.target.value)}
            rows={4}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="divider" style={{ margin: 0 }} />

        <IssuePanel
          issues={issues}
          jiraUrl={jiraUrl}
          onAdd={async (d) => {
            const { data } = await executionsApi.addScenarioIssue(executionId, etcId, scenario.id, d);
            const newIssues = [...issues, data];
            setIssues(newIssues);
            onUpdated({ ...scenario, status, comments, issues: newIssues });
          }}
          onUpdate={async (issueId, d) => {
            const { data } = await executionsApi.updateScenarioIssue(executionId, etcId, scenario.id, issueId, d);
            const newIssues = issues.map(i => i.id === issueId ? data : i);
            setIssues(newIssues);
            onUpdated({ ...scenario, status, comments, issues: newIssues });
          }}
          onRemove={async (issueId) => {
            await executionsApi.removeScenarioIssue(executionId, etcId, scenario.id, issueId);
            const newIssues = issues.filter(i => i.id !== issueId);
            setIssues(newIssues);
            onUpdated({ ...scenario, status, comments, issues: newIssues });
          }}
        />
      </div>

      {/* Footer */}
      <div className="drawer-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !isDirty}
          style={{ justifyContent: 'center', width: '100%' }}
        >
          {saving
            ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</>
            : savedFeedback
            ? <><CheckCircle size={16} weight="fill" /> Salvo</>
            : <><CheckCircle size={16} /> Salvar observações</>}
        </button>
        <AnimatePresence>
          {deleteConfirm ? (
            <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem', marginBottom: '0.4rem' }}>
                O cenário será removido apenas desta execução.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1, justifyContent: 'center' }}>
                  {deleting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Trash size={14} />}
                  Confirmar exclusão
                </button>
                <button className="btn btn-ghost" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancelar</button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="delete-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteConfirm(true)}
                style={{ width: '100%', justifyContent: 'center', color: 'var(--status-failed)', fontSize: '0.8rem' }}
              >
                <Trash size={13} /> Excluir cenário
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="toast-area">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} className={`toast toast-${t.type}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── Drawer ──────────────────────────────────────────────────────────────────
function TestCaseDrawer({
  executionId, etc, allTestCases, currentIndex, onClose, onUpdated, onNavigate, onRemoved,
}: {
  executionId: string;
  etc: ExecutionTestCase;
  allTestCases: ExecutionTestCase[];
  currentIndex: number;
  onClose: () => void;
  onUpdated: (updated: ExecutionTestCase) => void;
  onNavigate: (etc: ExecutionTestCase) => void;
  onRemoved: () => void;
}) {
  const [status, setStatus] = useState(etc.status);
  const [comments, setComments] = useState(etc.comments ?? '');
  const initialComments = useRef(etc.comments ?? '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [issues, setIssues] = useState<Issue[]>(etc.issues);
  const [scenarios, setScenarios] = useState<Scenario[]>(etc.scenarios ?? []);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const [jiraUrl, setJiraUrl] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [addingScenario, setAddingScenario] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardScenarioName, setWizardScenarioName] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [addingBatch, setAddingBatch] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);

  useEffect(() => {
    jiraApi.getSite().then(({ data }) => setJiraUrl(data.url ?? '')).catch(() => {});
  }, []);

  useEffect(() => {
    setStatus(etc.status);
    setComments(etc.comments ?? '');
    initialComments.current = etc.comments ?? '';
    setIssues(etc.issues);
    setScenarios(etc.scenarios ?? []);
    setSavedFeedback(false);
    setActiveScenario(null);
    setShowScenarioForm(false);
    setRemoveConfirm(false);
    setSelectedScenarios(new Set());
    setDeleteSelectedConfirm(false);
  }, [etc.id]);

  const hasScenarios = scenarios.length > 0;
  const isDirty = !hasScenarios && comments !== initialComments.current;
  const priority = priorityLabel(etc.testCase.priority);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || savingStatus) return;
    const prev = status;
    setStatus(newStatus);
    setSavingStatus(true);
    try {
      const { data } = await executionsApi.updateTestCase(executionId, etc.id, { status: newStatus });
      onUpdated({ ...data, scenarios });
      addToast('Status atualizado');
    } catch {
      setStatus(prev);
      addToast('Erro ao atualizar status', 'error');
    }
    setSavingStatus(false);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const { data } = await executionsApi.updateTestCase(executionId, etc.id, { comments });
      onUpdated({ ...data, scenarios });
      initialComments.current = comments;
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch {
      addToast('Erro ao salvar', 'error');
    }
    setSaving(false);
  };

  const handleAddScenarioClick = () => {
    if (scenarios.length === 0 && issues.length > 0) {
      setWizardScenarioName('');
      setShowWizardModal(true);
    } else {
      setShowScenarioForm(s => !s);
    }
  };

  const handleAddScenario = async () => {
    if (!scenarioName.trim()) return;
    setAddingScenario(true);
    try {
      const { data } = await executionsApi.createScenario(executionId, etc.id, scenarioName.trim());
      const newScenarios = [...scenarios, data.scenario];
      setScenarios(newScenarios);
      onUpdated({ ...etc, scenarios: newScenarios, issues: [] });
      setScenarioName('');
      setShowScenarioForm(false);
      addToast(data.templateCreated ? 'Cenário adicionado e salvo no caso de teste para execuções futuras' : 'Cenário adicionado');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao adicionar cenário.';
      addToast(Array.isArray(msg) ? msg.join(' ') : msg, 'error');
    }
    setAddingScenario(false);
  };

  const handleWizardConfirm = async () => {
    if (!wizardScenarioName.trim()) return;
    setAddingScenario(true);
    try {
      const { data } = await executionsApi.createScenario(executionId, etc.id, wizardScenarioName.trim());
      const newScenarios = [...scenarios, data.scenario];
      setScenarios(newScenarios);
      setIssues([]);
      onUpdated({ ...etc, scenarios: newScenarios, issues: [] });
      setShowWizardModal(false);
      setWizardScenarioName('');
      addToast(data.templateCreated ? 'Cenário adicionado e salvo no caso de teste para execuções futuras' : 'Cenário adicionado');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao adicionar cenário.';
      addToast(Array.isArray(msg) ? msg.join(' ') : msg, 'error');
    }
    setAddingScenario(false);
  };

  const handleAddBatch = async () => {
    const names = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    if (names.length === 0) return;
    setAddingBatch(true);
    try {
      const { data } = await executionsApi.createScenarioBatch(executionId, etc.id, names);
      const newScenarios = [...scenarios, ...data.created];
      setScenarios(newScenarios);
      const newIssues = scenarios.length === 0 && issues.length > 0 ? [] : issues;
      setIssues(newIssues);
      onUpdated({ ...etc, scenarios: newScenarios, issues: newIssues });
      setBatchText('');
      setShowBatchModal(false);
      const msg = data.skipped.length > 0
        ? `${data.created.length} cenário${data.created.length !== 1 ? 's' : ''} adicionado${data.created.length !== 1 ? 's' : ''}, ${data.skipped.length} ignorado${data.skipped.length !== 1 ? 's (já existiam)' : ' (já existia)'}`
        : `${data.created.length} cenário${data.created.length !== 1 ? 's' : ''} adicionado${data.created.length !== 1 ? 's' : ''}`;
      addToast(msg);
    } catch {
      addToast('Erro ao adicionar cenários', 'error');
    }
    setAddingBatch(false);
  };

  const handleScenarioUpdated = (updated: Scenario) => {
    const newScenarios = scenarios.map(s => s.id === updated.id ? updated : s);
    setScenarios(newScenarios);
    setActiveScenario(updated);

    const statuses = newScenarios.map(s => s.status);
    let etcStatus: string;
    if (statuses.every(s => s === 'PENDING')) etcStatus = 'PENDING';
    else if (statuses.some(s => s === 'FAILED')) etcStatus = 'FAILED';
    else if (statuses.some(s => s === 'BLOCKED')) etcStatus = 'BLOCKED';
    else if (statuses.every(s => s === 'PASSED')) etcStatus = 'PASSED';
    else etcStatus = 'IN_PROGRESS';

    onUpdated({ ...etc, scenarios: newScenarios, status: etcStatus });
  };

  const handleScenarioDeleted = (deletedScenarioIssues?: Issue[]) => {
    if (!activeScenario) return;
    const newScenarios = scenarios.filter(s => s.id !== activeScenario.id);
    const isLast = newScenarios.length === 0;
    const restoredIssues = isLast ? (deletedScenarioIssues ?? []) : issues;
    setScenarios(newScenarios);
    setIssues(restoredIssues);
    setActiveScenario(null);
    onUpdated({ ...etc, scenarios: newScenarios, issues: restoredIssues });
    addToast('Cenário excluído');
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedScenarios);
    if (!ids.length) return;
    setDeletingSelected(true);
    try {
      await executionsApi.deleteScenarioBatch(executionId, etc.id, ids);
      const newScenarios = scenarios.filter(s => !selectedScenarios.has(s.id));
      const isLast = newScenarios.length === 0;
      // When all scenarios are deleted, backend restores issues to test-case level
      const deletedIssues = isLast
        ? scenarios.filter(s => selectedScenarios.has(s.id)).flatMap(s => s.issues)
        : issues;
      setScenarios(newScenarios);
      if (isLast) setIssues(deletedIssues);
      onUpdated({ ...etc, scenarios: newScenarios, issues: isLast ? deletedIssues : issues });
      setSelectedScenarios(new Set());
      setDeleteSelectedConfirm(false);
      addToast(`${ids.length} cenário${ids.length !== 1 ? 's' : ''} excluído${ids.length !== 1 ? 's' : ''}`);
    } catch {
      addToast('Erro ao excluir cenários', 'error');
    }
    setDeletingSelected(false);
  };

  const handleRemoveFromExecution = async () => {
    setRemoving(true);
    try {
      await executionsApi.removeTestCase(executionId, etc.id);
      onClose();
      onRemoved();
    } catch {
      addToast('Erro ao remover caso de teste', 'error');
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <motion.div
        className="drawer"
        initial={{ x: 520 }} animate={{ x: 0 }} exit={{ x: 520 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      >
        {activeScenario ? (
          <ScenarioView
            executionId={executionId}
            etcId={etc.id}
            scenario={activeScenario}
            onBack={() => setActiveScenario(null)}
            onUpdated={handleScenarioUpdated}
            onDeleted={handleScenarioDeleted}
            allScenarios={scenarios}
            currentScenarioIndex={scenarios.findIndex(s => s.id === activeScenario.id)}
            onNavigate={(s) => setActiveScenario(s)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="drawer-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  {etc.testCase.link ? (
                    <a href={etc.testCase.link} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {etc.testCase.jiraKey} <ArrowSquareOut size={11} />
                    </a>
                  ) : <code style={{ fontSize: '0.8rem' }}>{etc.testCase.jiraKey}</code>}
                  {priority !== '—' && (
                    <span className="tag" style={{ background: `${PRIORITY_COLORS[priority]}20`, color: PRIORITY_COLORS[priority], fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                      {priority}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                  {etc.testCase.title}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                <Tooltip content="Caso anterior" placement="top">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onNavigate(allTestCases[currentIndex - 1])} disabled={currentIndex <= 0}>
                    <CaretLeft size={15} />
                  </button>
                </Tooltip>
                <Tooltip content="Próximo caso" placement="top">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onNavigate(allTestCases[currentIndex + 1])} disabled={currentIndex >= allTestCases.length - 1}>
                    <CaretRight size={15} />
                  </button>
                </Tooltip>
                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 0.2rem' }} />
                <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
              </div>
            </div>

            {/* Body */}
            <div className="drawer-body">
              {/* Status — hidden when test case has scenarios */}
              {!hasScenarios && (
                <div>
                  <span className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Status
                    {savingStatus && <div className="spinner" style={{ width: 10, height: 10 }} />}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={savingStatus}
                        style={{
                          padding: '0.4rem 0.9rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: status === s ? STATUS_COLORS[s] : 'var(--bg-elevated)',
                          color: status === s ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${status === s ? STATUS_COLORS[s] : 'var(--border)'}`,
                          opacity: savingStatus ? 0.65 : 1,
                        }}
                      >
                        {STATUS_LABELS[s] ?? s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cenários */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="drawer-section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Cenários
                    {scenarios.length > 0 && <span className="badge">{scenarios.length}</span>}
                  </span>
                  {!hasScenarios && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={handleAddScenarioClick} style={{ fontSize: '0.75rem' }}>
                        <Plus size={13} /> Adicionar Cenário
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowBatchModal(true)} style={{ fontSize: '0.75rem' }}>
                        <Plus size={13} /> Em Lote
                      </button>
                    </div>
                  )}
                  {hasScenarios && scenarios.length > 1 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedScenarios(
                        selectedScenarios.size === scenarios.length ? new Set() : new Set(scenarios.map(s => s.id))
                      )}
                      style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                    >
                      {selectedScenarios.size === scenarios.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showScenarioForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <label className="form-label">Nome do Cenário</label>
                          <input
                            placeholder="Ex: Processamento A"
                            value={scenarioName}
                            onChange={e => setScenarioName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddScenario()}
                            autoFocus
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={handleAddScenario} disabled={addingScenario || !scenarioName.trim()} style={{ flex: 1, justifyContent: 'center' }}>
                            {addingScenario ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <CheckCircle size={13} />}
                            Salvar
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setShowScenarioForm(false); setScenarioName(''); }}>Cancelar</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {scenarios.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>Nenhum cenário adicionado.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {scenarios.map(scenario => {
                      const isSelected = selectedScenarios.has(scenario.id);
                      return (
                        <div
                          key={scenario.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.55rem 0.75rem',
                            background: isSelected ? 'var(--bg-overlay)' : 'var(--bg-elevated)',
                            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                            borderRadius: 'var(--radius-sm)',
                            transition: 'background 0.12s, border-color 0.12s',
                          }}
                        >
                          <button
                            onClick={() => setSelectedScenarios(prev => {
                              const next = new Set(prev);
                              if (next.has(scenario.id)) next.delete(scenario.id);
                              else next.add(scenario.id);
                              return next;
                            })}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                          >
                            {isSelected
                              ? <CheckSquare size={15} weight="fill" style={{ color: 'var(--accent)' }} />
                              : <Square size={15} style={{ color: 'var(--text-muted)' }} />}
                          </button>
                          <button
                            onClick={() => setActiveScenario(scenario)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
                              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0,
                            }}
                          >
                            <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scenario.name}</span>
                            {scenario.issues.length > 0 && (
                              <span style={{ display: 'inline-flex', gap: '0.2rem', flexShrink: 0 }}>
                                {scenario.issues.filter(i => i.type === 'BUG').length > 0 && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--status-failed)', fontWeight: 600 }}>
                                    {scenario.issues.filter(i => i.type === 'BUG').length} bug(s)
                                  </span>
                                )}
                                {scenario.issues.filter(i => i.type === 'IMPROVEMENT').length > 0 && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--status-inprogress)', fontWeight: 600 }}>
                                    {scenario.issues.filter(i => i.type === 'IMPROVEMENT').length} melhoria(s)
                                  </span>
                                )}
                              </span>
                            )}
                            <span style={{ fontSize: '0.72rem', color: STATUS_COLORS[scenario.status] ?? 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                              {STATUS_LABELS[scenario.status] ?? scenario.status}
                            </span>
                            <CaretRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Comments (only when no scenarios) */}
              {!hasScenarios && (
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
              )}

              {/* Bugs & Melhorias (only when no scenarios) */}
              {!hasScenarios && (
                <IssuePanel
                  issues={issues}
                  jiraUrl={jiraUrl}
                  onAdd={async (d) => {
                    const { data } = await executionsApi.addIssue(executionId, etc.id, d);
                    const newIssues = [...issues, data];
                    setIssues(newIssues);
                    onUpdated({ ...etc, issues: newIssues, scenarios });
                  }}
                  onUpdate={async (issueId, d) => {
                    const { data } = await executionsApi.updateIssue(executionId, etc.id, issueId, d);
                    const newIssues = issues.map(i => i.id === issueId ? data : i);
                    setIssues(newIssues);
                    onUpdated({ ...etc, issues: newIssues, scenarios });
                  }}
                  onRemove={async (issueId) => {
                    await executionsApi.removeIssue(executionId, etc.id, issueId);
                    const newIssues = issues.filter(i => i.id !== issueId);
                    setIssues(newIssues);
                    onUpdated({ ...etc, issues: newIssues, scenarios });
                  }}
                />
              )}
            </div>

            {/* Footer */}
            <div className="drawer-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {!hasScenarios && (
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  style={{ justifyContent: 'center', width: '100%' }}
                >
                  {saving
                    ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</>
                    : savedFeedback
                    ? <><CheckCircle size={16} weight="fill" /> Salvo</>
                    : <><CheckCircle size={16} /> Salvar comentários</>}
                </button>
              )}

              {/* Add scenario buttons — shown only when has scenarios (header has them otherwise) */}
              {hasScenarios && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={handleAddScenarioClick} style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}>
                    <Plus size={13} /> Adicionar Cenário
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowBatchModal(true)} style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}>
                    <Plus size={13} /> Em Lote
                  </button>
                </div>
              )}

              {/* Bulk delete — appears when scenarios are selected */}
              <AnimatePresence>
                {selectedScenarios.size > 0 && (
                  <motion.div key="bulk-delete" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    {deleteSelectedConfirm ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          O cenário será removido apenas desta execução.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={handleDeleteSelected}
                            disabled={deletingSelected}
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            {deletingSelected ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Trash size={13} />}
                            Confirmar exclusão ({selectedScenarios.size})
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setDeleteSelectedConfirm(false)} disabled={deletingSelected}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDeleteSelectedConfirm(true)}
                        style={{ width: '100%', justifyContent: 'center', color: 'var(--status-failed)', fontSize: '0.8rem' }}
                      >
                        <Trash size={13} />
                        Excluir {selectedScenarios.size} cenário{selectedScenarios.size !== 1 ? 's' : ''}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remove from execution */}
              <AnimatePresence>
                {removeConfirm ? (
                  <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
                      <button className="btn btn-danger" onClick={handleRemoveFromExecution} disabled={removing} style={{ flex: 1, justifyContent: 'center' }}>
                        {removing ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Trash size={14} />}
                        Confirmar remoção
                      </button>
                      <button className="btn btn-ghost" onClick={() => setRemoveConfirm(false)} disabled={removing}>Cancelar</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="remove-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setRemoveConfirm(true)}
                      style={{ width: '100%', justifyContent: 'center', color: 'var(--status-failed)', fontSize: '0.8rem' }}
                    >
                      <Trash size={13} /> Remover da execução
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toasts */}
            <div className="toast-area">
              <AnimatePresence>
                {toasts.map(t => (
                  <motion.div key={t.id} className={`toast toast-${t.type}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                    {t.message}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>

      {/* Wizard modal — primeiro cenário com issues */}
      <Modal
        open={showWizardModal}
        onClose={() => { if (!addingScenario) setShowWizardModal(false); }}
        title="Criando modo Cenários"
        maxWidth={440}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowWizardModal(false)} disabled={addingScenario}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleWizardConfirm}
              disabled={addingScenario || !wizardScenarioName.trim()}
            >
              {addingScenario ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle size={14} />}
              Criar Cenário
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
          Este caso possui <strong>{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</strong> que {issues.length === 1 ? 'será movida' : 'serão movidas'} automaticamente para o primeiro cenário criado.
        </p>
        <div className="form-group">
          <label className="form-label">Nome do primeiro cenário</label>
          <input
            placeholder="Ex: Processamento A"
            value={wizardScenarioName}
            onChange={e => setWizardScenarioName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleWizardConfirm()}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal de criação em lote */}
      <Modal
        open={showBatchModal}
        onClose={() => { if (!addingBatch) setShowBatchModal(false); }}
        title="Adicionar Cenários em Lote"
        maxWidth={460}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowBatchModal(false)} disabled={addingBatch}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddBatch}
              disabled={addingBatch || !batchText.trim()}
            >
              {addingBatch ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle size={14} />}
              {batchText.trim()
                ? `Criar ${batchText.split('\n').map(l => l.trim()).filter(Boolean).length} Cenários`
                : 'Criar Cenários'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Cole os nomes, um por linha.</p>
        <textarea
          placeholder={'Processamento A\nProcessamento B\nProcessamento C'}
          value={batchText}
          onChange={e => setBatchText(e.target.value)}
          rows={6}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
          autoFocus
        />
        {batchText.trim() && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Preview: {batchText.split('\n').map(l => l.trim()).filter(Boolean).length} cenários serão criados
          </p>
        )}
      </Modal>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ExecutionRunPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const fromDashboard = from === 'dashboard';
  const fromExecutionsList = from === 'executions';
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
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

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
    } catch { navigate('/suites'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchExecution(); }, [fetchExecution]);
  useEffect(() => { setPage(1); }, [statusFilter, search, priorityFilter, pageSize]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await executionsApi.delete(id);
      setDeleteConfirm(false);
      navigate(
        fromDashboard ? '/execucoes'
        : fromExecutionsList ? '/executions'
        : (execution?.batchId ? `/batch/${execution.batchId}` : `/suite/${execution?.suiteId}`)
      );
    } catch {}
    setDeleting(false);
  };

  const handleUpdated = (updated: ExecutionTestCase) => {
    setExecution(prev => {
      if (!prev) return prev;
      const testCases = prev.testCases.map(tc => tc.id === updated.id ? updated : tc);
      const allPending = testCases.every(tc => tc.status === 'PENDING');
      const allDone = testCases.every(tc => tc.status !== 'PENDING');
      const status = allPending ? 'PENDING' : allDone ? 'COMPLETED' : 'IN_PROGRESS';
      return { ...prev, testCases, status };
    });
    setSelectedEtc(updated);
  };

  const handleTestCaseRemoved = (etcId: string) => {
    setSelectedEtc(null);
    setExecution(prev => {
      if (!prev) return prev;
      const testCases = prev.testCases.filter(tc => tc.id !== etcId);
      const allPending = testCases.length > 0 && testCases.every(tc => tc.status === 'PENDING');
      const allDone = testCases.length > 0 && testCases.every(tc => tc.status !== 'PENDING');
      const status = allPending ? 'PENDING' : allDone ? 'COMPLETED' : 'IN_PROGRESS';
      return { ...prev, testCases, status };
    });
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
  const effectiveItems = tcs.flatMap(tc =>
    (tc.scenarios ?? []).length > 0 ? (tc.scenarios ?? []) : [tc]
  );
  const counts = {
    total: effectiveItems.length,
    passed: effectiveItems.filter(t => t.status === 'PASSED').length,
    failed: effectiveItems.filter(t => t.status === 'FAILED').length,
    blocked: effectiveItems.filter(t => t.status === 'BLOCKED').length,
    inProgress: effectiveItems.filter(t => t.status === 'IN_PROGRESS').length,
    pending: effectiveItems.filter(t => t.status === 'PENDING').length,
  };
  const statusCounts: Record<string, number> = {
    all: counts.total,
    PASSED: counts.passed,
    FAILED: counts.failed,
    BLOCKED: counts.blocked,
    PENDING: counts.pending,
  };
  const executed = counts.passed + counts.failed + counts.blocked;
  const pct = counts.total > 0 ? Math.round((executed / counts.total) * 100) : 0;
  const pctColor = pct === 100 ? 'var(--status-passed)' : pct > 50 ? 'var(--secondary)' : 'var(--accent)';
  const availablePriorities = Array.from(new Set(tcs.map(tc => priorityLabel(tc.testCase.priority)).filter(p => p !== '—')));
  const query = normalize(search.trim());
  const filteredTcs = tcs
    .filter(tc => statusFilter === 'all' ? true : tc.status === statusFilter)
    .filter(tc => priorityFilter === 'all' ? true : priorityLabel(tc.testCase.priority) === priorityFilter)
    .filter(tc => {
      if (!query) return true;
      return normalize(tc.testCase.jiraKey).includes(query) || normalize(tc.testCase.title).includes(query);
    });
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredTcs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
  const pageTcs = pageSize === 'all' ? filteredTcs : filteredTcs.slice(pageStartIndex, pageStartIndex + pageSize);
  const isBatch = !!execution.batchId;
  const backTo = fromDashboard ? '/execucoes'
    : fromExecutionsList ? '/executions'
    : (isBatch ? `/batch/${execution.batchId}` : `/suite/${execution.suiteId}`);
  const backLabel = fromDashboard ? 'Voltar às Execuções'
    : fromExecutionsList ? 'Voltar a Todas as Execuções'
    : (isBatch ? 'Voltar ao Lote' : 'Voltar à Suíte');

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(backTo)} style={{ marginBottom: '0.5rem', paddingLeft: 0, fontSize: '1rem' }}>
              <ArrowLeft size={15} /> {backLabel}
            </button>
            {isBatch ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Execução</span>
                  <StatusBadge status={execution.status} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, overflow: 'hidden' }}>
                  {batchSuites.map((suite) => (
                    <Tooltip key={suite.id} content={suite.title} placement="bottom" display="block">
                      <h1 className="page-title" style={{ fontSize: '1rem', fontWeight: 400, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(suite.jiraKey ?? suite.manualKey) && <span style={{ fontWeight: 600 }}>{suite.jiraKey ?? suite.manualKey} · </span>}{suite.title}
                      </h1>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Execução</span>
                  <StatusBadge status={execution.status} />
                </div>
                <h1 className="page-title" style={{ fontSize: '1rem', fontWeight: 400, margin: 0 }}>
                  {(execution.suite?.jiraKey ?? execution.suite?.manualKey) && <span style={{ fontWeight: 600 }}>{execution.suite?.jiraKey ?? execution.suite?.manualKey} · </span>}{execution.suite?.title ?? 'Execução'}
                </h1>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignSelf: 'flex-start' }}>
            <button className="btn" onClick={() => handleExport('xlsx')} disabled={!!exporting} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', height: 48 }}>
              {exporting === 'xlsx' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FileXls size={16} />}
              Excel
            </button>
            <button className="btn" onClick={() => handleExport('pdf')} disabled={!!exporting} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', height: 48 }}>
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
              <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: pctColor }}>{pct}%</span>
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
            gridTemplateColumns: '1fr 210px 210px 150px',
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
            <select value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
              <option value="all">Todos</option>
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
                  <th style={{ width: 140 }}>ID</th>
                  <th>Título</th>
                  <th style={{ width: 120 }}>Prioridade</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 140 }}>Responsável</th>
                  <th style={{ width: 72 }}>B&M</th>
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
                      <td>
                        {(etc.scenarios?.length ?? 0) > 0 ? (
                          <span className="tag">
                            {etc.scenarios.length} cenário{etc.scenarios.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <StatusBadge status={etc.status} />
                        )}
                      </td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{etc.responsible ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {(() => {
                          const allIssues = (etc.scenarios?.length ?? 0) > 0
                            ? (etc.scenarios ?? []).flatMap(s => s.issues)
                            : etc.issues;
                          const bugs = allIssues.filter(i => i.type === 'BUG').length;
                          const improvements = allIssues.filter(i => i.type === 'IMPROVEMENT').length;
                          return bugs > 0 || improvements > 0 ? (
                            <span style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                              {bugs > 0 && <span style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--status-failed)', borderRadius: 99, padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>{bugs}</span>}
                              {improvements > 0 && <span style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--status-inprogress)', borderRadius: 99, padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>{improvements}</span>}
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>;
                        })()}
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
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedEtc && (
          <TestCaseDrawer
            executionId={execution.id}
            etc={selectedEtc}
            allTestCases={filteredTcs}
            currentIndex={filteredTcs.findIndex(tc => tc.id === selectedEtc.id)}
            onClose={() => setSelectedEtc(null)}
            onUpdated={handleUpdated}
            onRemoved={() => handleTestCaseRemoved(selectedEtc.id)}
            onNavigate={tc => {
              setSelectedEtc(tc);
              if (pageSize !== 'all') {
                const idx = filteredTcs.findIndex(t => t.id === tc.id);
                setPage(Math.floor(idx / (pageSize as number)) + 1);
              }
            }}
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
