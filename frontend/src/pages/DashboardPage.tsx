import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Flask, MagnifyingGlass,
  WarningCircle, CloudArrowDown, ChartBar,
  GridFourIcon, FlaskIcon, CopyIcon,
} from '@phosphor-icons/react';
import { suitesApi, executionsApi } from '../api/client';
import BatchExecutionModal from '../components/BatchExecutionModal';
import type { Suite } from '../api/client';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { SuiteCard } from '../components/SuiteCard';
import { BatchCard } from '../components/BatchCard';
import { Tooltip } from '../components/Tooltip';

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


export default function DashboardPage() {
  const navigate = useNavigate();
  const [suites, setSuites] = useState<Suite[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTargetSuite, setDeleteTargetSuite] = useState<Suite | null>(null);
  const [deleteSuiteError, setDeleteSuiteError] = useState<string | null>(null);
  const [deleteTargetBatch, setDeleteTargetBatch] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'suites' | 'batches'>('all');
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const fetchSuites = useCallback(async () => {
    try {
      const { data } = await suitesApi.list();
      setSuites(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await executionsApi.getAllBatches();
      setBatches(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchSuites();
    fetchBatches();
  }, [fetchSuites, fetchBatches]);

  const handleImportSuccess = (suite: Suite) => {
    setSuites(prev => {
      const exists = prev.find(s => s.id === suite.id);
      return exists ? prev.map(s => s.id === suite.id ? suite : s) : [suite, ...prev];
    });
  };

  const handleDeleteSuite = async () => {
    if (!deleteTargetSuite) return;
    try {
      await suitesApi.delete(deleteTargetSuite.id);
      setSuites(prev => prev.filter(s => s.id !== deleteTargetSuite.id));
      setDeleteTargetSuite(null);
      setDeleteSuiteError(null);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Erro ao excluir a suíte.';
      setDeleteSuiteError(message);
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleteTargetBatch) return;
    await executionsApi.deleteBatch(deleteTargetBatch.id);
    setBatches(prev => prev.filter(b => b.id !== deleteTargetBatch.id));
    setDeleteTargetBatch(null);
  };

  const filteredSuites = suites.filter(s =>
    s.jiraKey.toLowerCase().includes(search.toLowerCase()) ||
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBatches = batches.filter(b =>
    (b.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (b.sprint?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const combinedItems = [
    ...(filter !== 'suites' ? filteredBatches.map(b => ({ type: 'batch' as const, data: b })) : []),
    ...(filter !== 'batches' ? filteredSuites.map(s => ({ type: 'suite' as const, data: s })) : []),
  ];

  const filterCounts = {
    all: { suites: suites.length, batches: batches.length, total: suites.length + batches.length },
    suites: { suites: filteredSuites.length, batches: 0, total: filteredSuites.length },
    batches: { suites: 0, batches: filteredBatches.length, total: filteredBatches.length },
  };

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Suítes de Teste</h1>
            <p className="page-subtitle">Gerencie suas suítes de teste e lotes de suítes</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlass size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                placeholder="Buscar suíte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 220, paddingLeft: '2.25rem', height: 48 }}
              />
            </div>
            <Tooltip content={selectedSuites.length < 2 ? 'Selecione pelo menos duas suítes para criar um lote.' : undefined} placement="top">
              <button className={`btn-create-batch ${selectedSuites.length >= 2 ? 'active' : ''}`} onClick={() => setBatchModalOpen(true)} disabled={selectedSuites.length < 2}>
                <ChartBar size={16} /> Criar Lote de Suítes
              </button>
            </Tooltip>
            <button className="btn btn-primary" style={{ height: 48 }} onClick={() => setImportOpen(true)}>
              <Plus size={16} /> Importar Suíte do Jira
            </button>
          </div>
        </div>

        <div className="filters" style={{ marginBottom: '2rem' }}>
          <button className={`filter-item ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            <GridFourIcon size={16} /> Todas <span className="filter-count">{filterCounts.all.total}</span>
          </button>
          <button className={`filter-item ${filter === 'suites' ? 'active' : ''}`} onClick={() => setFilter('suites')}>
            <FlaskIcon size={16} /> Suítes <span className="filter-count">{filterCounts.suites.suites}</span>
          </button>
          <button className={`filter-item ${filter === 'batches' ? 'active' : ''}`} onClick={() => setFilter('batches')}>
            <CopyIcon size={16} /> Lotes <span className="filter-count">{filterCounts.batches.batches}</span>
          </button>
        </div>
        <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: '1.5rem' }}></div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /> Carregando...</div>
        ) : combinedItems.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Flask size={56} />
            <h3>{search ? 'Nenhum item encontrado' : 'Nenhuma suíte ou lote importado'}</h3>
            <p>{search ? 'Tente outro termo de busca.' : 'Clique em "Importar Suíte do Jira" para começar. Informe o ID da suíte de testes no Jira.'}</p>
            {!search && (
              <button className="btn btn-primary" onClick={() => setImportOpen(true)} style={{ marginTop: '0.5rem' }}>
                <Plus size={16} /> Importar Suíte do Jira
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            <AnimatePresence>
              {combinedItems.map((item, i) => (
                <motion.div
                  key={item.type === 'batch' ? `batch-${item.data.id}` : `suite-${item.data.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="card card-clickable"
                  style={{
                    background: selectedSuites.includes(item.data.id) ? 'var(--accent-subtle)' : undefined,
                    borderColor: selectedSuites.includes(item.data.id) ? 'var(--accent)' : undefined,
                  }}
                  onClick={() => navigate(item.type === 'batch' ? `/batch/${item.data.id}` : `/suite/${item.data.id}`)}
                >
                  {item.type === 'suite' ? (
                    <SuiteCard suite={item.data} selected={selectedSuites.includes(item.data.id)} onSelect={(id, checked) => {
                      if (checked) setSelectedSuites(prev => [...prev, id]);
                      else setSelectedSuites(prev => prev.filter(i => i !== id));
                    }} onDelete={(s) => setDeleteTargetSuite(s)} />
                  ) : (
                    <BatchCard batch={item.data} onDelete={(b) => setDeleteTargetBatch(b)} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />
      <ConfirmModal
        open={!!deleteTargetSuite}
        title="Excluir Suíte"
        confirmLabel="Excluir"
        error={deleteSuiteError}
        onClose={() => { setDeleteTargetSuite(null); setDeleteSuiteError(null); }}
        onConfirm={handleDeleteSuite}
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Tem certeza que deseja excluir a suíte{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{deleteTargetSuite?.jiraKey} — {deleteTargetSuite?.title}</strong>?
          <br /><br />
          <span style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}>
            Esta ação excluirá também todos os casos de teste e execuções vinculadas. Esta operação não pode ser desfeita.
          </span>
        </p>
      </ConfirmModal>
      <ConfirmModal
        open={!!deleteTargetBatch}
        title="Excluir Lote de Suítes"
        confirmLabel="Excluir"
        onClose={() => setDeleteTargetBatch(null)}
        onConfirm={handleDeleteBatch}
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Tem certeza que deseja excluir o lote{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{deleteTargetBatch?.name || deleteTargetBatch?.id}</strong>?
          <br /><br />
          <span style={{ color: 'var(--status-failed)', fontSize: '0.85rem' }}>
            Esta ação excluirá também todas as execuções vinculadas. Esta operação não pode ser desfeita.
          </span>
        </p>
      </ConfirmModal>
      <BatchExecutionModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        suites={suites.filter(s => selectedSuites.includes(s.id))}
        onCreated={(batch) => {
          setSelectedSuites([]);
          setBatchModalOpen(false);
          fetchBatches();
          navigate(`/batch/${batch.id}`);
        }}
      />
    </div>
  );
}

