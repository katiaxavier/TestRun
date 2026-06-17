import React, { useState } from 'react';
import { Trash, WarningCircle } from '@phosphor-icons/react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  icon?: React.ReactNode;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  icon = <Trash size={16} />,
  error,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          {!error && (
            <button className={`btn btn-${variant}`} onClick={handleConfirm} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : icon}
              {confirmLabel}
            </button>
          )}
        </>
      }
    >
      {error ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--status-failed)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <WarningCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      ) : children}
    </Modal>
  );
}
