import { Flask, Play, Check, DotsThreeVertical, Trash } from '@phosphor-icons/react';
import { DropdownMenu } from './DropdownMenu';
import { Tooltip } from './Tooltip';
import type { Suite } from '../api/client';

function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: 'var(--radius-sm)',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
      background: checked ? 'var(--accent)' : 'transparent',
      cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      {checked && <Check size={12} weight="bold" style={{ color: '#fff' }} />}
    </label>
  );
}

interface SuiteCardProps {
  suite: Suite;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onDelete: (s: Suite) => void;
}

export function SuiteCard({ suite, selected, onSelect, onDelete }: SuiteCardProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
    return new Date(typeof date === 'string' ? date.slice(0, 10) + 'T00:00:00' : date).toLocaleDateString('pt-BR');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <span className="tag" style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: 'var(--accent-subtle)', color: 'var(--accent)', flexShrink: 0 }}>
          SUITE
        </span>
        {suite.jiraKey ? (
          <span className="tag" style={{ fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}>
            {suite.jiraKey}
          </span>
        ) : suite.isManual ? (
          <span className="tag" style={{ fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}>
            {suite.manualKey ?? 'Manual'}
          </span>
        ) : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {onSelect && (
            <CustomCheckbox checked={!!selected} onChange={checked => onSelect(suite.id, checked)} />
          )}
          <DropdownMenu
            trigger={<DotsThreeVertical size={18} style={{ color: 'var(--text-secondary)' }} />}
            items={[{ label: 'Excluir', icon: <Trash size={14} />, danger: true, onClick: () => onDelete(suite) }]}
          />
        </div>
      </div>

      <Tooltip content={suite.title} placement="top" display="block">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 0 }}>
          {suite.title}
        </h3>
      </Tooltip>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Flask size={14} style={{ color: 'var(--accent)' }} />
          <strong style={{ color: 'var(--text-primary)' }}>{suite._count?.testCases ?? 0}</strong> casos
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Play size={14} style={{ color: 'var(--status-inprogress)' }} />
          <strong style={{ color: 'var(--text-primary)' }}>{suite._count?.executions ?? 0}</strong> execuções
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Criado em {formatDate(suite.createdAt)}
        </div>
      </div>
    </div>
  );
}
