import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, WarningCircle } from '@phosphor-icons/react';
import { suitesApi, executionsApi } from '../api/client';
import type { Suite, Execution } from '../api/client';
import { Modal } from '../components/Modal';
import { ExecutionList } from '../components/ExecutionList';
import { TestCaseList } from '../components/TestCaseList';
import { PageHeader } from '../components/PageHeader';

function NewExecutionModal({ open, suiteId, onClose, onCreated }: {
  open: boolean; suiteId: string; onClose: () => void; onCreated: (e: Execution) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ sprint: '', version: '', startDate: today, endDate: '', responsible: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { sprint, version, startDate, endDate, responsible } = form;
    if (!sprint || !startDate || !endDate || !responsible) {
      setError('Preencha todos os campos obrigatórios.'); return;
    }
    setLoading(true); setError('');
    try {
      const { data } = await executionsApi.create({ suiteId, ...form, version: version || undefined });
      onCreated(data);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao criar execução.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setLoading(false); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Novo Ciclo de Execução" maxWidth={580}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit as any} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Play size={16} />}
            Iniciar Execução
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Sprint *</label>
            <input placeholder="Ex: Sprint 42" value={form.sprint} onChange={set('sprint')} />
          </div>
          <div className="form-group">
            <label className="form-label">Versão do sistema</label>
            <input placeholder="Ex: 2.5.1" value={form.version} onChange={set('version')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Responsável pela execução *</label>
          <input placeholder="Nome do QA responsável" value={form.responsible} onChange={set('responsible')} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data de início *</label>
            <input type="date" value={form.startDate} onChange={set('startDate')} />
          </div>
          <div className="form-group">
            <label className="form-label">Data de fim *</label>
            <input type="date" value={form.endDate} onChange={set('endDate')} />
          </div>
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

export default function SuiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [loading, setLoading] = useState(true);
  const [newExecOpen, setNewExecOpen] = useState(false);

  const fetchSuite = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await suitesApi.get(id);
      setSuite(data);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchSuite(); }, [fetchSuite]);

  const handleDeleteTestCase = async (tcId: string) => {
    await suitesApi.deleteTestCase(tcId);
    setSuite(prev => prev ? { ...prev, testCases: prev.testCases!.filter(t => t.id !== tcId) } : prev);
  };

  const handleExecutionCreated = (exec: Execution) => {
    navigate(`/executions/${exec.id}`);
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
          onBack={() => navigate('/')}
          eyebrow={suite.jiraKey}
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
            onExecutionClick={exec => navigate(`/executions/${exec.id}`)}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Casos de Teste</h2>
            <span className="badge">{testCases.length}</span>
          </div>
          <TestCaseList testCases={testCases} onDelete={handleDeleteTestCase} />
        </div>
      </motion.div>

      <NewExecutionModal
        open={newExecOpen}
        suiteId={suite.id}
        onClose={() => setNewExecOpen(false)}
        onCreated={handleExecutionCreated}
      />
    </div>
  );
}
