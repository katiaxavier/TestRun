import { useState, useMemo } from 'react';
import { Clock } from '@phosphor-icons/react';
import type { Execution } from '../api/client';
import { ExecutionCard } from './ExecutionCard';

interface ExecutionListProps {
  executions: Execution[];
  onExecutionClick?: (execution: Execution) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'PENDING', label: 'Não Iniciado' },
];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function ExecutionList({ executions, onExecutionClick }: ExecutionListProps) {
  const [status, setStatus] = useState('');
  const [responsible, setResponsible] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const filtered = useMemo(() => {
    const r = normalize(responsible.trim());
    return executions.filter(exec => {
      if (status && exec.status.toUpperCase() !== status) return false;
      if (r && !normalize(exec.responsible ?? '').includes(r)) return false;
      if (periodStart && exec.startDate < periodStart) return false;
      if (periodEnd && exec.endDate > periodEnd) return false;
      return true;
    });
  }, [executions, status, responsible, periodStart, periodEnd]);

  const hasFilters = status || responsible || periodStart || periodEnd;

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.6rem',
        marginBottom: '1rem',
        padding: '1rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
      }}>
        {/* Status */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{ flex: '0 1 170px', minWidth: 140 }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Responsible */}
        <input
          value={responsible}
          onChange={e => setResponsible(e.target.value)}
          placeholder="Responsável"
          style={{ flex: '0 1 160px', minWidth: 120 }}
        />

        {/* Period */}
        <input
          type="date"
          value={periodStart}
          onChange={e => setPeriodStart(e.target.value)}
          title="Data de início"
          style={{ flex: '0 1 150px', minWidth: 130 }}
        />
        <input
          type="date"
          value={periodEnd}
          onChange={e => setPeriodEnd(e.target.value)}
          title="Data de fim"
          style={{ flex: '0 1 150px', minWidth: 130 }}
        />

        {hasFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setStatus(''); setResponsible(''); setPeriodStart(''); setPeriodEnd(''); }}
            style={{ whiteSpace: 'nowrap' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <Clock size={32} />
            <h3 style={{ fontSize: '0.9rem' }}>
              {executions.length === 0 ? 'Sem execuções' : 'Nenhuma execução encontrada'}
            </h3>
            <p style={{ fontSize: '0.8rem' }}>
              {executions.length === 0
                ? 'Inicie um novo ciclo de execução.'
                : 'Tente ajustar os filtros aplicados.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(exec => (
            <ExecutionCard
              key={exec.id}
              execution={exec}
              onClick={onExecutionClick ? () => onExecutionClick(exec) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
