import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { executionsApi } from '../api/client';
import type { Suite } from '../api/client';
import { ChartBar, Flask } from '@phosphor-icons/react';

export function BatchExecutionModal({
  open, onClose, suites, onCreated,
}: { open: boolean; onClose: () => void; suites: Suite[]; onCreated: (batch: any) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setError('');
    }
  }, [open]);

  const totalTests = suites.reduce((s, su) => s + (su._count?.testCases ?? 0), 0);

  const handleSubmit = async () => {
    if (suites.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await executionsApi.createBatch(suites.map(s => s.id), {
        name: name || undefined,
      });
      onCreated(data);
      setName('');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Erro ao criar lote.';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar Lote de Suítes"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || suites.length === 0}>
            {loading ? 'Criando...' : 'Criar Lote'}
          </button>
        </>
      }
    >
      {/* Suites Section */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <ChartBar size={16} />
          <span style={{ fontWeight: 600 }}>Suítes Selecionadas</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <strong>{suites.length}</strong> Suítes
          </div>
          <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <strong>{totalTests}</strong> Casos
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 200, overflow: 'auto' }}>
          {suites.map(s => (
            <div key={s.id} className="card" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="tag" style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--accent-subtle)', color: 'var(--accent)' }}>{s.jiraKey}</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.25rem' }}>{s.title}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Flask size={14} />
                <strong style={{ color: 'var(--text-primary)' }}>{s._count?.testCases ?? 0}</strong> casos
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Section */}
      <div style={{ padding: '1rem' }}>
        {error && (
          <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--status-failed)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '0.75rem' }}>
          <label className="form-label">Nome do lote</label>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && suites.length > 0 && handleSubmit()} placeholder="Ex: Regressão Sprint 25" />
        </div>
      </div>
    </Modal>
  );
}

export default BatchExecutionModal;