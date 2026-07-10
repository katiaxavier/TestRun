import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Trash, WarningCircle, ListBullets } from '@phosphor-icons/react';
import { suitesApi, executionsApi } from '../api/client';
import type { Suite, TestCase, TestCaseScenario } from '../api/client';
import { ExecutionList } from '../components/ExecutionList';
import { TestCaseList } from '../components/TestCaseList';
import { PageHeader } from '../components/PageHeader';
import { ExecutionFormModal } from '../components/ExecutionFormModal';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

function AddTestCaseModal({ open, suiteId, onClose, onSuccess }: {
  open: boolean; suiteId: string; onClose: () => void; onSuccess: (tc: TestCase) => void;
}) {
  const [jiraKey, setJiraKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!open) { setJiraKey(''); setError(''); } }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jiraKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await suitesApi.addTestCase(suiteId, jiraKey.trim());
      onSuccess(data);
      setJiraKey('');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao adicionar caso de teste.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar Caso de Teste"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit as any} disabled={loading || !jiraKey.trim()}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Buscando...</> : <><Plus size={16} /> Adicionar</>}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <button type="submit" style={{ display: 'none' }} aria-hidden />
        <div className="form-group">
          <label className="form-label">ID do ticket no Jira</label>
          <input
            autoFocus
            type="text"
            placeholder="Ex: PD-20767"
            value={jiraKey}
            onChange={e => setJiraKey(e.target.value.toUpperCase())}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            O ticket será buscado no Jira e adicionado como caso de teste nesta suíte.
          </p>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.83rem', color: 'var(--status-failed)' }}>
            <WarningCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

function ScenarioTemplatePanel({ tc, onUpdate }: {
  tc: TestCase;
  onUpdate: (tc: TestCase) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newName, setNewName] = useState('');
  const [batchText, setBatchText] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [skippedInfo, setSkippedInfo] = useState<string | null>(null);
  const templates = tc.scenarioTemplates ?? [];

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const { data } = await suitesApi.addScenarioTemplate(tc.id, newName.trim());
      onUpdate({ ...tc, scenarioTemplates: [...templates, data] });
      setNewName('');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao adicionar cenário.';
      setAddError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setAdding(false); }
  };

  const handleBatch = async () => {
    const names = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    if (names.length === 0) return;
    setAdding(true);
    setSkippedInfo(null);
    try {
      const { data } = await suitesApi.addScenarioTemplateBatch(tc.id, names);
      onUpdate({ ...tc, scenarioTemplates: [...templates, ...data.created] });
      setBatchText('');
      setShowBatch(false);
      if (data.skipped.length > 0) {
        setSkippedInfo(`${data.skipped.length} cenário${data.skipped.length !== 1 ? 's ignorados (já existem)' : ' ignorado (já existe)'}: ${data.skipped.join(', ')}`);
      }
    } finally { setAdding(false); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await suitesApi.deleteScenarioTemplate(confirmDeleteId);
      onUpdate({ ...tc, scenarioTemplates: templates.filter(t => t.id !== confirmDeleteId) });
    } finally { setDeletingId(null); }
  };

  const batchNames = batchText.split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
        onClick={() => setExpanded(e => !e)}
      >
        <ListBullets size={14} />
        {templates.length > 0 ? `${templates.length} cenário${templates.length !== 1 ? 's' : ''}` : 'Cenários'}
        <span style={{ fontSize: '0.7rem', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.name}</span>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => setConfirmDeleteId(t.id)}
                    disabled={deletingId === t.id}
                  >
                    {deletingId === t.id ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Trash size={12} />}
                  </button>
                </div>
              ))}

              {skippedInfo && (
                <p style={{ fontSize: '0.75rem', color: 'var(--status-blocked)', margin: '0.25rem 0' }}>
                  {skippedInfo}
                </p>
              )}
              {!showBatch ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      placeholder="Nome do cenário"
                      value={newName}
                      onChange={e => { setNewName(e.target.value); setAddError(null); }}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding || !newName.trim()}>
                      {adding ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Plus size={13} />}
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => setShowBatch(true)}>
                      Lote
                    </button>
                  </div>
                  {addError && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--status-failed)', margin: 0 }}>{addError}</p>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <textarea
                    placeholder="Um cenário por linha&#10;Processamento A&#10;Processamento B"
                    value={batchText}
                    onChange={e => setBatchText(e.target.value)}
                    rows={4}
                    style={{ fontSize: '0.8rem', resize: 'vertical' }}
                  />
                  {batchNames.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {batchNames.length} cenário{batchNames.length !== 1 ? 's' : ''} serão criados
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleBatch} disabled={adding || batchNames.length === 0}>
                      {adding ? <div className="spinner" style={{ width: 12, height: 12 }} /> : `Criar ${batchNames.length > 0 ? batchNames.length : ''} Cenário${batchNames.length !== 1 ? 's' : ''}`}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowBatch(false); setBatchText(''); }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Remover Cenário"
        confirmLabel="Remover"
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Tem certeza que deseja remover este cenário da suíte?
          <br /><br />
          Execuções já criadas não serão afetadas — o cenário permanecerá nelas como registro histórico. Para removê-lo de uma execução específica, acesse o caso de teste dentro da execução e exclua o cenário por lá.
          <br /><br />
          <span style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}>
            Esta ação não pode ser desfeita.
          </span>
        </p>
      </ConfirmModal>
    </div>
  );
}

export default function SuiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [loading, setLoading] = useState(true);
  const [newExecOpen, setNewExecOpen] = useState(false);
  const [addTcOpen, setAddTcOpen] = useState(false);

  const fetchSuite = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await suitesApi.get(id);
      setSuite(data);
    } catch { navigate('/suites'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchSuite(); }, [fetchSuite]);

  useEffect(() => {
    const executions = suite?.executions ?? [];
    if (!executions.some(e => e.status === 'IN_PROGRESS')) return;
    const interval = setInterval(fetchSuite, 15_000);
    return () => clearInterval(interval);
  }, [suite?.executions, fetchSuite]);

  const handleDeleteTestCase = async (tcId: string) => {
    await suitesApi.deleteTestCase(tcId);
    setSuite(prev => prev ? { ...prev, testCases: prev.testCases!.filter(t => t.id !== tcId) } : prev);
  };

  const handleTcAdded = (tc: TestCase) => {
    setSuite(prev => prev ? { ...prev, testCases: [...(prev.testCases ?? []), tc] } : prev);
  };

  const handleTcUpdate = (updated: TestCase) => {
    setSuite(prev => prev ? {
      ...prev,
      testCases: (prev.testCases ?? []).map(t => t.id === updated.id ? updated : t),
    } : prev);
  };

  const handleToggleAutomated = async (tcId: string, automated: boolean) => {
    const { data } = await suitesApi.updateTestCase(tcId, { automated });
    handleTcUpdate(data);
  };

  if (loading) return <div className="page"><div className="loading-page"><div className="spinner" /> Carregando...</div></div>;
  if (!suite) return null;

  const executions = suite.executions ?? [];
  const testCases = suite.testCases ?? [];

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader
          backLabel="Suites de Teste"
          onBack={() => navigate('/suites')}
          eyebrow={suite.jiraKey ?? (suite.isManual ? (suite.manualKey ?? 'Manual') : undefined)}
          title={suite.title}
        />

        <div style={{ marginTop: '32px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Execuções</h2>
            <span className="badge">{executions.length}</span>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setNewExecOpen(true)} disabled={testCases.length === 0}>
              <Play size={15} /> Nova Execução
            </button>
          </div>
          <ExecutionList
            executions={executions}
            onExecutionClick={exec => navigate(`/execution/${exec.id}`)}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Casos de Teste</h2>
            <span className="badge">{testCases.length}</span>
            {suite.isManual && (
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setAddTcOpen(true)}>
                <Plus size={14} /> Adicionar Caso de Teste
              </button>
            )}
          </div>
          <TestCaseList
            testCases={testCases}
            onDelete={handleDeleteTestCase}
            onToggleAutomated={handleToggleAutomated}
            renderExtra={tc => <ScenarioTemplatePanel tc={tc} onUpdate={handleTcUpdate} />}
            isManual={suite.isManual}
          />
        </div>
      </motion.div>

      <ExecutionFormModal
        open={newExecOpen}
        onClose={() => setNewExecOpen(false)}
        onSubmit={async (form) => {
          const { data } = await executionsApi.create({ suiteId: suite.id, ...form });
          navigate(`/execution/${data.id}`);
        }}
      />

      {suite.isManual && (
        <AddTestCaseModal
          open={addTcOpen}
          suiteId={suite.id}
          onClose={() => setAddTcOpen(false)}
          onSuccess={handleTcAdded}
        />
      )}
    </div>
  );
}
