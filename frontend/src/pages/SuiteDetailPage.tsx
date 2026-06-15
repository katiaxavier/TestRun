import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Play, Trash, ArrowSquareOut,
  Flask, WarningCircle, MagnifyingGlass,
} from '@phosphor-icons/react';
import { suitesApi, executionsApi } from '../api/client';
import type { Suite, Execution } from '../api/client';
import { Modal } from '../components/Modal';
import { ExecutionList } from '../components/ExecutionList';

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
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function priorityLabel(priority?: string | null): PriorityFilter | string {
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [caseSearch, setCaseSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

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
  const query = normalize(caseSearch.trim());
  const availablePriorities = Array.from(new Set(
    testCases.map(tc => priorityLabel(tc.priority)).filter(p => p !== '—')
  )) as PriorityFilter[];
  const filteredTestCases = testCases.filter(tc => {
    const matchesSearch = !query || normalize(tc.jiraKey).includes(query) || normalize(tc.title).includes(query);
    const matchesPriority = priorityFilter === 'all' || priorityLabel(tc.priority) === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom: '0.5rem', paddingLeft: 0 }}>
              <ArrowLeft size={15} /> Suites de Teste
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

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Execuções</h2>
            <span className="badge">{executions.length}</span>
          </div>

          <ExecutionList
            executions={executions}
            onExecutionClick={exec => navigate(`/executions/${exec.id}`)}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Casos de Teste</h2>
            <span className="badge">{filteredTestCases.length}</span>
          </div>

          {testCases.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem' }}>
              <Flask size={40} />
              <h3>Sem casos de teste</h3>
              <p>Re-importe a suíte para sincronizar os casos do Jira.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <MagnifyingGlass size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    value={caseSearch}
                    onChange={e => setCaseSearch(e.target.value)}
                    placeholder="Buscar por ID ou título"
                    style={{ width: '100%', paddingLeft: '2.4rem' }}
                  />
                </div>
                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)}>
                  <option value="all">Todas</option>
                  {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Key</th>
                      <th>Título</th>
                      <th style={{ width: 120 }}>Prioridade</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTestCases.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum caso encontrado.</td>
                      </tr>
                    ) : filteredTestCases.map(tc => {
                      const priority = priorityLabel(tc.priority);
                      return (
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
                            {priority === '—' ? (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            ) : (
                              <span className="tag" style={{ background: `${PRIORITY_COLORS[priority]}20`, color: PRIORITY_COLORS[priority] }}>{priority}</span>
                            )}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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