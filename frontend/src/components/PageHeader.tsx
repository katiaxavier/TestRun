import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';

interface PageHeaderProps {
  backLabel: React.ReactNode;
  onBack: () => void;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ backLabel, onBack, eyebrow, title, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div style={{ flex: 1 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '1.5rem', paddingLeft: 0, fontSize: '0.95rem' }}>
          <ArrowLeft size={15} /> {backLabel}
        </button>
        <div>
          {eyebrow != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent)', opacity: 0.85, display: 'inline-block', marginBottom: '0.35rem' }}>
              {eyebrow}
            </span>
          )}
          <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{title}</h1>
        </div>
      </div>
      {actions}
    </div>
  );
}
