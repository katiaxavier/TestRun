import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, WarningCircle } from '@phosphor-icons/react';
import { executionsApi, suitesApi } from '../api/client';
import type { Suite, Execution } from '../api/client';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { ExecutionList } from '../components/ExecutionList';
import { TestCaseList } from '../components/TestCaseList';

function NewBatchExecutionModal({ open, batchId, onClose, onCreated }: {
  open: boolean;
  batchId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ sprint: '', version: '', startDate: today, endDate: '', responsible: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { sprint, startDate, endDate, responsible } = form;
    if (!sprint || !startDate || !endDate || !responsible) {
      setError('Preencha todos os campos obrigatórios.'); return;
    }
    setLoading(true); setError('');
    try {
      await executionsApi.createBatchExecution(batchId, {
        ...form,
        version: form.version || undefined,
      });
      onCreated();
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

export default function BatchExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<any>(null);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExecOpen, setNewExecOpen] = useState(false);

  const fetchBatch = useCallback(async () => {
    if (!id) return;
    try {
      const { data: batchData } = await executionsApi.getBatch(id);
      setBatch(batchData);
      const suiteIds: string[] = batchData.suiteIds ?? [];
      if (suiteIds.length > 0) {
        const results = await Promise.all(
          suiteIds.map(sid => suitesApi.get(sid).then(r => r.data).catch(() => null))
        );
        setSuites(results.filter((s): s is Suite => !!s));
      }
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);

  useEffect(() => {
    const executions: Execution[] = batch?.executions ?? [];
    if (!executions.some(e => e.status === 'IN_PROGRESS')) return;
    const interval = setInterval(fetchBatch, 15_000);
    return () => clearInterval(interval);
  }, [batch?.executions, fetchBatch]);

  if (loading) return <div className="page"><div className="loading-page"><div className="spinner" /> Carregando...</div></div>;
  if (!batch) return null;

  const executions: Execution[] = batch.executions ?? [];
  const excluded: string[] = batch.excludedTestCaseIds ?? [];
  const allTestCases = suites.flatMap(s => s.testCases ?? []).filter(tc => !excluded.includes(tc.id));
  const suiteMap = Object.fromEntries(suites.map(s => [s.id, s]));
  const batchTitle = batch.name || `Lote de ${suites.length} ${suites.length === 1 ? 'suite' : 'suites'}`;

  const handleRemoveTestCase = async (tcId: string) => {
    if (!id) return;
    await executionsApi.removeTestCaseFromBatch(id, tcId);
    setBatch((prev: any) => ({
      ...prev,
      excludedTestCaseIds: [...(prev.excludedTestCaseIds ?? []), tcId],
      executions: prev.executions.map((ex: any) => ({
        ...ex,
        testCases: ex.testCases.filter((etc: any) => etc.testCaseId !== tcId),
      })),
    }));
  };

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader
          backLabel="Suites de Teste"
          onBack={() => navigate('/')}
          eyebrow="LOTE"
          title={batchTitle}
        />

        {suites.length > 0 && (
          <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, marginBottom: '0.5rem' }}>Suites</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {suites.map(s => (
              <span key={s.id} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {s.jiraKey} — {s.title}
              </span>
            ))}
          </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Execuções</h2>
            <span className="badge">{executions.length}</span>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setNewExecOpen(true)}
              disabled={allTestCases.length === 0}
            >
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
            <span className="badge">{allTestCases.length}</span>
          </div>
          <TestCaseList testCases={allTestCases} suiteMap={suiteMap} onDelete={handleRemoveTestCase} />
        </div>
      </motion.div>

      {id && (
        <NewBatchExecutionModal
          open={newExecOpen}
          batchId={id}
          onClose={() => setNewExecOpen(false)}
          onCreated={fetchBatch}
        />
      )}
    </div>
  );
}
