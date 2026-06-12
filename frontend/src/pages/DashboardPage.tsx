import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ArrowSquareOut, Trash, Flask, MagnifyingGlass,
  WarningCircle, CloudArrowDown, ChartBar,
} from '@phosphor-icons/react';
import { suitesApi } from '../api/client';
import type { Suite } from '../api/client';
import { Modal } from '../components/Modal';

function ImportModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (s: Suite) => void }) {
  const [jiraKey, setJiraKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jiraKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await suitesApi.importFromJira(jiraKey.trim());
      onSuccess(data);
      setJiraKey('');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao importar suíte. Verifique a key e as credenciais Jira.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar Suíte do Jira"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit as any} disabled={loading || !jiraKey.trim()}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Importando...</> : <><CloudArrowDown size={16} /> Importar</>}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Key da suíte no Jira</label>
          <input
            autoFocus
            type="text"
            placeholder="Ex: PROJ-1234"
            value={jiraKey}
            onChange={e => setJiraKey(e.target.value.toUpperCase())}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Informe o ID da task pai (suíte) no Jira. Os casos de teste filhos serão importados automaticamente.
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

function DeleteConfirmModal({ open, suite, onClose, onConfirm }: { open: boolean; suite: Suite | null; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    <Modal open={open} onClose={onClose} title="Excluir Suíte"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Trash size={16} />}
            Excluir
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Tem certeza que deseja excluir a suíte <strong style={{ color: 'var(--text-primary)' }}>{suite?.jiraKey} — {suite?.title}</strong>?
        <br /><br />
        <span style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}>
          Esta ação excluirá também todos os casos de teste e execuções vinculadas. Esta operação não pode ser desfeita.
        </span>
      </p>
    </Modal>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Suite | null>(null);
  const [search, setSearch] = useState('');

  const fetchSuites = useCallback(async () => {
    try {
      const { data } = await suitesApi.list();
      setSuites(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuites(); }, [fetchSuites]);

  const handleImportSuccess = (suite: Suite) => {
    setSuites(prev => {
      const exists = prev.find(s => s.id === suite.id);
      return exists ? prev.map(s => s.id === suite.id ? suite : s) : [suite, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await suitesApi.delete(deleteTarget.id);
    setSuites(prev => prev.filter(s => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const filtered = suites.filter(s =>
    s.jiraKey.toLowerCase().includes(search.toLowerCase()) ||
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Gerencie suas suítes de teste importadas do Jira</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlass size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                placeholder="Buscar suíte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 220, paddingLeft: '2.25rem' }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setImportOpen(true)}>
              <Plus size={16} /> Importar do Jira
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading-page"><div className="spinner" /> Carregando suítes...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Flask size={56} />
            <h3>{search ? 'Nenhuma suíte encontrada' : 'Nenhuma suíte importada'}</h3>
            <p>{search ? 'Tente outro termo de busca.' : 'Clique em "Importar do Jira" para começar. Informe o ID da suíte de testes no Jira.'}</p>
            {!search && (
              <button className="btn btn-primary" onClick={() => setImportOpen(true)} style={{ marginTop: '0.5rem' }}>
                <Plus size={16} /> Importar do Jira
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            <AnimatePresence>
              {filtered.map((suite, i) => (
                <motion.div
                  key={suite.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="card card-clickable"
                  onClick={() => navigate(`/suites/${suite.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span className="tag" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{suite.jiraKey}</span>
                      </div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {suite.title}
                      </h3>
                    </div>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(suite); }}
                      style={{ flexShrink: 0 }}
                    >
                      <Trash size={15} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Flask size={14} style={{ color: 'var(--accent)' }} />
                      <strong style={{ color: 'var(--text-primary)' }}>{suite._count?.testCases ?? 0}</strong> casos
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <ChartBar size={14} style={{ color: 'var(--status-inprogress)' }} />
                      <strong style={{ color: 'var(--text-primary)' }}>{suite._count?.executions ?? 0}</strong> execuções
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <ArrowSquareOut size={12} />
                      Ver detalhes
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />
      <DeleteConfirmModal open={!!deleteTarget} suite={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </div>
  );
}
