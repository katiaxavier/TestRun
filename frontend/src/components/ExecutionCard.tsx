import { CalendarBlank, Lightning, Tag, User } from '@phosphor-icons/react';
import type { Execution } from '../api/client';

interface ExecutionCardProps {
  execution: Execution;
  title?: string;
  onClick?: () => void;
}

const EXECUTION_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  IN_PROGRESS: {
    label: 'Em Andamento',
    color: 'var(--secondary)',
    bg: 'var(--secondary-subtle)',
    border: 'rgba(0, 102, 255, 0.25)',
  },
  COMPLETED: {
    label: 'Finalizado',
    color: 'var(--status-passed)',
    bg: 'var(--status-passed-bg)',
    border: 'rgba(34, 197, 94, 0.25)',
  },
  PENDING: {
    label: 'Não Iniciado',
    color: 'var(--text-muted)',
    bg: 'rgba(107, 114, 128, 0.10)',
    border: 'rgba(107, 114, 128, 0.2)',
  },
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function ExecutionCard({ execution, title, onClick }: ExecutionCardProps) {
  const tcs = execution.testCases ?? [];
  const total = tcs.length;
  const passed = tcs.filter(t => t.status === 'PASSED').length;
  const failed = tcs.filter(t => t.status === 'FAILED').length;
  const blocked = tcs.filter(t => t.status === 'BLOCKED').length;
  const executed = passed + failed + blocked;
  const progressPct = total > 0 ? Math.round((executed / total) * 100) : 0;

  const statusKey = (execution.status ?? 'PENDING').toUpperCase();
  const statusInfo = EXECUTION_STATUS_MAP[statusKey] ?? EXECUTION_STATUS_MAP.PENDING;

  const cardTitle =
    title ??
    (execution.suite
      ? `${execution.suite.jiraKey} — ${execution.suite.title}`
      : `Execução ${formatDate(execution.startDate)}`);

  const dateRange = `${formatDate(execution.startDate)} - ${formatDate(execution.endDate)}`;

  const progressColor =
    progressPct === 100
      ? 'var(--status-passed)'
      : progressPct > 50
      ? 'var(--secondary)'
      : 'var(--accent)';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem 1.5rem',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Top row: title + badge / stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        {/* Left: title, badge, meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
              {cardTitle}
            </h3>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: statusInfo.color,
                background: statusInfo.bg,
                border: `1px solid ${statusInfo.border}`,
                flexShrink: 0,
              }}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CalendarBlank size={14} color="white" />
              {dateRange}
            </span>
            {execution.sprint && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lightning size={14} />
                {execution.sprint}
              </span>
            )}
            {execution.version && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Tag size={14} />
                {execution.version}
              </span>
            )}
            {execution.responsible && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={14} />
                {execution.responsible}
              </span>
            )}
          </div>
        </div>

        {/* Right: stat counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <StatPill label="Total" value={total} />
          <Divider />
          <StatPill label="Passou" value={passed} color="var(--status-passed)" />
          <Divider />
          <StatPill label="Falhou" value={failed} color="var(--status-failed)" />
          <Divider />
          <StatPill label="Bloqueado" value={blocked} color="var(--status-blocked)" />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Progresso da Execução
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progressColor, fontFamily: "'JetBrains Mono', monospace" }}>
            {progressPct}% Completo
          </span>
        </div>
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: progressColor,
              borderRadius: 99,
              transition: 'width 0.6s ease',
              boxShadow: progressPct > 0 ? `0 0 8px ${progressColor}66` : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: '0 0.85rem', textAlign: 'center' }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: color ?? 'var(--text-muted)', opacity: 0.75, marginBottom: '0.15rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em', color: color ?? 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 36, background: 'var(--border-subtle)' }} />;
}
