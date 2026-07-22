import { useState, useEffect } from 'react';
import { ArrowCounterClockwiseIcon, FloppyDiskIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Modal } from '../../components/Modal';
import { dashboardApi } from '../../api/client';
import { PRIORITY_COLORS } from '../../utils/priority';

interface SlaConfigModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  boardId: string;
  onSaved: () => void;
}

export function SlaConfigModal({ open, onClose, projectId, boardId, onSaved }: SlaConfigModalProps) {
  const [entries, setEntries] = useState<{ label: string; days: number }[]>([]);
  const [isCustom, setIsCustom] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    dashboardApi.getSlaConfig(projectId, boardId)
      .then(({ data }) => {
        setEntries(data.entries);
        setIsCustom(data.isCustom);
        setValues(Object.fromEntries(data.entries.map(({ label, days }) => [label, days])));
      })
      .catch(() => setError('Erro ao carregar os prazos de SLA.'))
      .finally(() => setLoading(false));
  }, [open, projectId, boardId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await dashboardApi.updateSlaConfig(projectId, boardId, values);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar os prazos de SLA.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setError('');
    try {
      await dashboardApi.resetSlaConfig(projectId, boardId);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao restaurar os prazos padrão.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar prazos de SLA"
      maxWidth={420}
      footer={
        <>
          {isCustom && (
            <button className="btn btn-secondary" onClick={handleRestore} disabled={saving || restoring || loading}>
              {restoring ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <ArrowCounterClockwiseIcon size={16} />}
              Restaurar padrão
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || restoring || loading}>
            {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FloppyDiskIcon size={16} />}
            Salvar
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Prazo, em dias, para resolver um bug de acordo com a severidade — vale só para este quadro.
      </p>
      {loading ? (
        <div className="loading-page" style={{ padding: '1rem 0' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {entries.map(({ label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: PRIORITY_COLORS[label], flexShrink: 0 }} />
                {label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={values[label] ?? ''}
                  onChange={(e) => setValues(v => ({ ...v, [label]: Number(e.target.value) }))}
                  style={{ width: 70, textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>dias</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" style={{ fontSize: '0.83rem', marginTop: '1rem' }}>
          <WarningCircleIcon size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
        </div>
      )}
    </Modal>
  );
}
