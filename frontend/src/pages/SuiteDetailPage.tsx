import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Play, Trash, ArrowSquareOut,
  Flask, Clock, WarningCircle,
} from '@phosphor-icons/react';
import { suitesApi, executionsApi } from '../api/client';
import type { Suite, Execution } from '../api/client';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';



function NewExecutionModal({ open, suiteId, onClose, onCreated }: {
  open: boolean; suiteId: string; onClose: () => void; onCreated: (e: Execution) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ sprint: '', version: '', startDate: today, endDate: '', testedFeature: '', responsible: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { sprint, version, startDate, endDate, testedFeature, responsible } = form;
    if (!sprint || !version || !startDate || !endDate || !testedFeature || !responsible) {
      setError('Preencha todos os campos obrigatórios.'); return;
    }
    setLoading(true); setError('');
    try {
      const { data } = await executionsApi.create({ suiteId, ...form });
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
            <label className="form-label">Versão do sistema *</label>
            <input placeholder="Ex: 2.5.1" value={form.version} onChange={set('version')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Funcionalidade testada *</label>
          <input placeholder="Ex: Módulo de pagamentos" value={form.testedFeature} onChange={set('testedFeature')} />
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!confirm('Excluir este caso de teste localmente?')) return;
    setDeletingId(tcId);
    try {
      await suitesApi.deleteTestCase(tcId);
      setSuite(prev => prev ? { ...prev, testCases: prev.testCases!.filter(t => t.id !== tcId) } : prev);
    } catch {}
    setDeletingId(null);
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
        {/* Header */}
        <div className="page-header">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom: '0.5rem', paddingLeft: 0 }}>
              <ArrowLeft size={15} /> Dashboard
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="tag" style={{ fontFamily: 'monospace' }}>{suite.jiraKey}</span>
              <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{suite.title}</h1>
            </div>
            <p className="page-subtitle">{testCases.length} casos de teste · {executions.length} execuções</p>
          </div>
          <button className="btn btn-primary" onClick={() => setNewExecOpen(true)} disabled={testCases.length === 0}>
            <Play size={16} /> Nova Execução
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Test Cases */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Casos de Teste</h2>
              <span className="badge">{testCases.length}</span>
            </div>

            {testCases.length === 0 ? (
              <div className="empty-state" style={{ padding: '2.5rem' }}>
                <Flask size={40} />
                <h3>Sem casos de teste</h3>
                <p>Re-importe a suíte para sincronizar os casos do Jira.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Título</th>
                        <th style={{ width: 60 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {testCases.map(tc => (
                        <tr key={tc.id}>
                          <td style={{ width: 110 }}>
                            {tc.link ? (
                              <a href={tc.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                {tc.jiraKey} <ArrowSquareOut size={11} />
                              </a>
                            ) : (
                              <code>{tc.jiraKey}</code>
                            )}
                          </td>
                          <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{tc.title}</td>
                          <td>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleDeleteTestCase(tc.id)}
                              disabled={deletingId === tc.id}
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {deletingId === tc.id ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <Trash size={14} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Executions */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Execuções</h2>
              <span className="badge">{executions.length}</span>
            </div>

            {executions.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <Clock size={32} />
                  <h3 style={{ fontSize: '0.9rem' }}>Sem execuções</h3>
                  <p style={{ fontSize: '0.8rem' }}>Inicie um novo ciclo de execução.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {executions.map(exec => (
                  <div
                    key={exec.id}
                    className="card card-clickable"
                    onClick={() => navigate(`/executions/${exec.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {exec.sprint}
                      </span>
                      <StatusBadge status={exec.status} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{exec.testedFeature}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
                      <span>{exec.version}</span>
                      <span>{new Date(exec.startDate).toLocaleDateString('pt-BR')}</span>
                      <span>({(exec as any)._count?.testCases ?? '?'} casos)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
