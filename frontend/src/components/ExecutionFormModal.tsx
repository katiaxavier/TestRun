import React, { useState, useEffect } from 'react';
import { Play, WarningCircle } from '@phosphor-icons/react';
import { Modal } from './Modal';

export interface ExecutionFormData {
  sprint: string;
  version?: string;
  startDate: string;
  endDate: string;
  responsible: string;
}

interface ExecutionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: ExecutionFormData) => Promise<void>;
  title?: string;
}

export function ExecutionFormModal({ open, onClose, onSubmit, title = 'Novo Ciclo de Execução' }: ExecutionFormModalProps) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [form, setForm] = useState<ExecutionFormData>({ sprint: '', version: '', startDate: today, endDate: today, responsible: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      const n = new Date();
      const t = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      setForm({ sprint: '', version: '', startDate: t, endDate: t, responsible: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { sprint, startDate, endDate, responsible } = form;
    if (!sprint || !startDate || !endDate || !responsible) {
      setError('Preencha todos os campos obrigatórios.'); return;
    }
    setLoading(true); setError('');
    try {
      await onSubmit({ ...form, version: form.version || undefined });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao criar execução.';
      setError(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally { setLoading(false); }
  };

  const set = (k: keyof ExecutionFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => {
      const updated = { ...f, [k]: e.target.value };
      if (k === 'startDate' && updated.endDate && updated.endDate < e.target.value) {
        updated.endDate = '';
      }
      return updated;
    });

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={580}
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
        <button type="submit" style={{ display: 'none' }} aria-hidden />
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Sprint *</label>
            <input autoFocus placeholder="Ex: Sprint 42" value={form.sprint} onChange={set('sprint')} />
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
            <input type="date" value={form.endDate} min={form.startDate} onChange={set('endDate')} />
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
