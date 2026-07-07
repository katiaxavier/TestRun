import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Flask, MagnifyingGlass,
  WarningCircle, CloudArrowDown,
  GridFourIcon, FlaskIcon, CopyIcon, PencilSimple,
  ArrowsClockwiseIcon, CheckCircleIcon,
} from '@phosphor-icons/react';
import { suitesApi, executionsApi } from '../api/client';
import BatchExecutionModal from '../components/BatchExecutionModal';
import type { Suite } from '../api/client';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { SuiteCard } from '../components/SuiteCard';
import { BatchCard } from '../components/BatchCard';
import { Tooltip } from '../components/Tooltip';
import { useProject } from '../context/ProjectContext';
import { useBoard } from '../context/BoardContext';

type CreateMode = 'jira' | 'manual';

function CreateSuiteModal({ open, onClose, onSuccess, projectId, boardId }: { open: boolean; onClose: () => void; onSuccess: (s: Suite) => void; projectId: string; boardId?: string }) {
  const [mode, setMode] = useState<CreateMode>('jira');
  const [jiraKey, setJiraKey] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setJiraKey(''); setTitle(''); setError(''); setMode('jira'); }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'jira') {
        if (!jiraKey.trim()) return;
        const { data } = await suitesApi.importFromJira(jiraKey.trim(), projectId, boardId);
        onSuccess(data);
      } else {
        if (!title.trim()) return;
        const { data } = await suitesApi.create(title.trim(), projectId, boardId);
        onSuccess(data);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao criar suíte.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = mode === 'jira' ? !!jiraKey.trim() : !!title.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova Suíte de Teste"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit as any} disabled={loading || !canSubmit}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> {mode === 'jira' ? 'Importando...' : 'Criando...'}</> : mode === 'jira' ? <><CloudArrowDown size={16} /> Importar</> : <><Plus size={16} /> Criar</>}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <button type="submit" style={{ display: 'none' }} aria-hidden />
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'jira' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('jira'); setError(''); }}
          >
            <CloudArrowDown size={15} /> Importar do Jira
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('manual'); setError(''); }}
          >
            <PencilSimple size={15} /> Criar Manualmente
          </button>
        </div>

        {mode === 'jira' ? (
          <div className="form-group">
            <label className="form-label">ID da suíte no Jira</label>
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
        ) : (
          <div className="form-group">
            <label className="form-label">Nome da suíte</label>
            <input
              autoFocus
              type="text"
              placeholder="Ex: Suíte Sprint 42"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Você poderá adicionar casos de teste manualmente pelo ID do Jira após criar a suíte.
            </p>
          </div>
        )}

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
  const { selectedProject, loading: projectLoading } = useProject();
  const { selectedBoard, loading: boardLoading } = useBoard();
  const realBoardId = selectedBoard && selectedBoard.id !== 'none' ? selectedBoard.id : undefined;
  const [suites, setSuites] = useState<Suite[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTargetSuite, setDeleteTargetSuite] = useState<Suite | null>(null);
  const [deleteSuiteError, setDeleteSuiteError] = useState<string | null>(null);
  const [deleteTargetBatch, setDeleteTargetBatch] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'suites' | 'batches'>('all');
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total: number; synced: string[]; failed: { key: string; error: string }[] } | null>(null);

  const fetchSuites = useCallback(async (projectId: string, boardId?: string) => {
    try {
      const { data } = await suitesApi.list(projectId, boardId);
      setSuites(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchBatches = useCallback(async (projectId: string, boardId?: string) => {
    try {
      const { data } = await executionsApi.getAllBatches(projectId, boardId);
      setBatches(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!selectedProject || !selectedBoard) {
      setSuites([]);
      setBatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSuites(selectedProject.id, selectedBoard.id);
    fetchBatches(selectedProject.id, selectedBoard.id);
  }, [selectedProject, selectedBoard, fetchSuites, fetchBatches]);

  const handleSync = async () => {
    if (!realBoardId || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await suitesApi.sync(realBoardId);
      setSyncResult(data);
      if (selectedProject && selectedBoard) fetchSuites(selectedProject.id, selectedBoard.id);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao sincronizar suítes.';
      setSyncResult({ total: 0, synced: [], failed: [{ key: '', error: Array.isArray(msg) ? msg.join(' ') : msg }] });
    }
    setSyncing(false);
  };

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
    (s.jiraKey ?? '').toLowerCase().includes(search.toLowerCase()) ||
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
                <CopyIcon size={16} /> Criar Lote de Suítes
              </button>
            </Tooltip>
            <Tooltip content={!realBoardId ? 'Selecione um quadro real para sincronizar (não disponível para "Sem quadro").' : undefined} placement="top">
              <button className="btn btn-secondary" style={{ height: 48 }} onClick={handleSync} disabled={!realBoardId || syncing}>
                {syncing
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Sincronizando...</>
                  : <><ArrowsClockwiseIcon size={16} /> Sincronizar</>}
              </button>
            </Tooltip>
            <button className="btn btn-primary" style={{ height: 48 }} onClick={() => setCreateOpen(true)} disabled={!selectedProject}>
              <Plus size={16} /> Nova Suíte
            </button>
          </div>
        </div>

        {syncResult && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem',
              marginBottom: '1.25rem', borderRadius: 'var(--radius-sm)', fontSize: '0.83rem',
              background: syncResult.failed.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${syncResult.failed.length > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
            }}
          >
            {syncResult.failed.length > 0
              ? <WarningCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--status-failed)' }} />
              : <CheckCircleIcon size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--status-passed)' }} />}
            <div style={{ flex: 1 }}>
              <span>
                Sincronização concluída: {syncResult.synced.length} de {syncResult.total} suíte(s) atualizada(s).
              </span>
              {syncResult.failed.length > 0 && (
                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', color: 'var(--status-failed)' }}>
                  {syncResult.failed.map((f, i) => (
                    <li key={i}>{f.key ? `${f.key}: ` : ''}{f.error}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSyncResult(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          </div>
        )}

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

        {projectLoading ? (
          <div className="loading-page"><div className="spinner" /> Carregando...</div>
        ) : !selectedProject ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Flask size={56} />
            <h3>Nenhum projeto selecionado</h3>
            <p>Selecione um projeto no menu lateral para ver suas suítes e lotes.</p>
          </div>
        ) : boardLoading ? (
          <div className="loading-page"><div className="spinner" /> Carregando...</div>
        ) : !selectedBoard ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Flask size={56} />
            <h3>Nenhum quadro encontrado</h3>
            <p>Este projeto não tem quadros no Jira nem suítes sem quadro.</p>
          </div>
        ) : loading ? (
          <div className="loading-page"><div className="spinner" /> Carregando...</div>
        ) : combinedItems.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <Flask size={56} />
            <h3>{search ? 'Nenhum item encontrado' : 'Nenhuma suíte ou lote cadastrado'}</h3>
            <p>{search ? 'Tente outro termo de busca.' : 'Crie uma suíte importando do Jira ou manualmente.'}</p>
            {!search && (
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)} style={{ marginTop: '0.5rem' }}>
                <Plus size={16} /> Nova Suíte
              </button>
            )}
          </div>
        ) : (
          <div className="cards-grid">
            <AnimatePresence mode="popLayout">
              {combinedItems.map((item) => (
                <motion.div
                  key={item.type === 'batch' ? `batch-${item.data.id}` : `suite-${item.data.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
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

      {selectedProject && (
        <CreateSuiteModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={handleImportSuccess}
          projectId={selectedProject.id}
          boardId={realBoardId}
        />
      )}
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
          <strong style={{ color: 'var(--text-primary)' }}>{deleteTargetSuite?.jiraKey ? `${deleteTargetSuite.jiraKey} — ` : ''}{deleteTargetSuite?.title}</strong>?
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
        boardId={realBoardId}
        onCreated={(batch) => {
          setSelectedSuites([]);
          setBatchModalOpen(false);
          if (selectedProject && selectedBoard) fetchBatches(selectedProject.id, selectedBoard.id);
          navigate(`/batch/${batch.id}`);
        }}
      />
    </div>
  );
}

