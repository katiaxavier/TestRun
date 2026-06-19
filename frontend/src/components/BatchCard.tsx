import { Flask, ChartBar, DotsThreeVertical, Trash } from '@phosphor-icons/react';
import { DropdownMenu } from './DropdownMenu';
import { Tooltip } from './Tooltip';

interface BatchCardProps {
  batch: any;
  onDelete: (b: any) => void;
}

export function BatchCard({ batch, onDelete }: BatchCardProps) {
  const totalCases = batch.executions.length > 0
    ? batch.executions.reduce(
        (s: number, e: any) => s + (e._count?.testCases ?? e.testCases?.length ?? 0),
        0,
      )
    : (batch.suites ?? []).reduce(
        (s: number, suite: any) => s + (suite._count?.testCases ?? 0),
        0,
      ) - ((batch.excludedTestCaseIds as string[] | undefined)?.length ?? 0);

  const suiteKeys: string[] = (batch.suites ?? [])
    .map((s: any) => s.jiraKey)
    .filter(Boolean);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
    return new Date(typeof date === 'string' ? date.slice(0, 10) + 'T00:00:00' : date).toLocaleDateString('pt-BR');
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <span className="tag" style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: 'rgba(255, 209, 90, 0.18)', color: 'var(--tertiary)', flexShrink: 0 }}>
          LOTE
        </span>
        {suiteKeys.map((key, i) => (
          <span key={i} className="tag" style={{ fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}>
            {key}
          </span>
        ))}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <DropdownMenu
            trigger={<DotsThreeVertical size={18} style={{ color: 'var(--text-secondary)' }} />}
            items={[{ label: 'Excluir', icon: <Trash size={14} />, danger: true, onClick: () => onDelete(batch) }]}
          />
        </div>
      </div>

      <div>
        <Tooltip content={batch.name || undefined} placement="top" display="block">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {batch.name || 'Batch ' + batch.id.substring(0, 8)}
          </h3>
        </Tooltip>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {suiteKeys.length} {suiteKeys.length === 1 ? 'suíte' : 'suítes'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Flask size={14} style={{ color: 'var(--accent)' }} />
          <strong style={{ color: 'var(--text-primary)' }}>{totalCases}</strong> casos
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <ChartBar size={14} style={{ color: 'var(--status-inprogress)' }} />
          <strong style={{ color: 'var(--text-primary)' }}>{batch.executions.length}</strong> execuções
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Criado em {formatDate(batch.createdAt)}
        </div>
      </div>
    </>
  );
}
