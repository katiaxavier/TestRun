import { useState, useEffect } from 'react';
import { ClockIcon, ArrowSquareOutIcon, HourglassIcon } from '@phosphor-icons/react';
import { dashboardApi } from '../../api/client';
import type { DashboardEfficiency } from '../../api/client';
import { priorityLabel, PRIORITY_COLORS } from '../../utils/priority';
import { InfoTooltip } from '../../components/InfoTooltip';

interface EficienciaTabProps {
  projectId: string;
  boardId: string;
}

// Mesmos prazos de backend/src/dashboard/dashboard.constants.ts (SLA_DAYS_BY_PRIORITY,
// lado em português) — mantidos em sincronia manual, sem fonte única compartilhada
// front/back neste repo (mesmo padrão de COMPLETED_EXECUTIONS_LIMIT).
const SLA_DAYS_BY_SEVERITY: { label: string; days: number }[] = [
  { label: 'Gravíssima', days: 3 },
  { label: 'Crítica', days: 7 },
  { label: 'Alta', days: 15 },
  { label: 'Média', days: 21 },
  { label: 'Normal', days: 30 },
  { label: 'Trivial', days: 45 },
];

// Mesmo limiar de backend/src/dashboard/dashboard.constants.ts (SLA_WARNING_THRESHOLD) —
// mesma sincronia manual front/back já usada acima.
const SLA_WARNING_THRESHOLD_PCT = 80;

export function EficienciaTab({ projectId, boardId }: EficienciaTabProps) {
  const [data, setData] = useState<DashboardEfficiency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardApi.getEfficiency(projectId, boardId)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, boardId]);

  if (loading) {
    return <div className="loading-page"><div className="spinner" /> Carregando...</div>;
  }

  if (!data) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <ClockIcon size={40} />
        <h3>Não foi possível carregar os dados de eficiência</h3>
      </div>
    );
  }

  const mttrOverTarget = data.mttrDays !== null && data.mttrDays > data.mttrTargetDays;

  return (
    <div>
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ClockIcon size={18} weight="duotone" style={{ color: 'var(--secondary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>MTTR / Idade dos Defeitos</h2>
          <InfoTooltip>
            <strong>MTTR:</strong> tempo médio, em dias, entre a criação e a resolução dos bugs já corrigidos,
            comparado com a meta configurada.<br />
            <strong>Idade Média:</strong> há quanto tempo, em média, os bugs ainda abertos estão parados,
            junto com o mais antigo e o mais recente.
          </InfoTooltip>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="MTTR">MTTR</p>
            <p className="stat-value" style={{ color: data.mttrDays !== null ? (mttrOverTarget ? 'var(--status-failed)' : 'var(--status-passed)') : undefined }}>
              {data.mttrDays !== null ? `${data.mttrDays} dias` : '—'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Meta: {data.mttrTargetDays} dias · {data.resolvedBugsCount} bug(s) resolvido(s)
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Idade Média dos Bugs Abertos">Idade Média (Abertos)</p>
            <p className="stat-value">{data.avgAgeDays !== null ? `${data.avgAgeDays} dias` : '—'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {data.openBugsCount} bug(s) em aberto
              {data.minAgeDays !== null && data.maxAgeDays !== null && (
                <> · menor {data.minAgeDays}d · maior {data.maxAgeDays}d</>
              )}
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HourglassIcon size={18} weight="duotone" style={{ color: 'var(--status-failed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>SLA</h2>
          <InfoTooltip>
            <strong>SLA:</strong> prazo máximo esperado para resolver um bug, de acordo com a severidade
            dele (bugs mais graves têm prazos mais curtos) — ver as faixas de dias por severidade
            logo abaixo do gráfico.<br />
            <strong>🟢 Dentro do SLA:</strong> bugs abertos cuja idade ainda não passou de{' '}
            {SLA_WARNING_THRESHOLD_PCT}% do prazo esperado para a severidade deles.<br />
            <strong>🟡 Próximo do SLA:</strong> já passou de {SLA_WARNING_THRESHOLD_PCT}% do prazo, mas
            ainda não ultrapassou.<br />
            <strong>🔴 Acima do SLA:</strong> já ultrapassou o prazo esperado para a severidade.<br />
            <strong>Sem SLA definido:</strong> severidade do bug não tem prazo configurado — não entra em
            nenhuma das faixas acima, em vez de simplesmente sumir da contagem.
          </InfoTooltip>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="Dentro do SLA">🟢 Dentro do SLA</p>
            <p className="stat-value" style={{ color: 'var(--status-passed)' }}>{data.slaBuckets.withinSla}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Próximo do SLA">🟡 Próximo do SLA</p>
            <p className="stat-value" style={{ color: data.slaBuckets.nearSla > 0 ? 'var(--status-blocked)' : undefined }}>
              {data.slaBuckets.nearSla}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Acima do SLA">🔴 Acima do SLA</p>
            <p className="stat-value" style={{ color: data.slaBuckets.aboveSla > 0 ? 'var(--status-failed)' : undefined }}>
              {data.slaBuckets.aboveSla}
            </p>
          </div>
        </div>
        {data.slaBuckets.noSlaDefined > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            {data.slaBuckets.noSlaDefined} bug(s) sem SLA definido para a severidade (não entram nas faixas acima).
          </p>
        )}
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HourglassIcon size={18} weight="duotone" style={{ color: 'var(--status-failed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Bugs Acima do SLA</h2>
          <InfoTooltip>
            Bugs abertos cujo tempo decorrido desde a criação já passou do prazo esperado para a
            severidade deles. "% do SLA" acima de 100% indica quanto o prazo foi ultrapassado.
          </InfoTooltip>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {SLA_DAYS_BY_SEVERITY.map(({ label, days }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: PRIORITY_COLORS[label] }} />
              {label}: {days} dias
            </span>
          ))}
        </div>
        {data.slaViolations.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <HourglassIcon size={40} />
            <h3>Nenhum bug acima do SLA</h3>
            <p>Bugs abertos há mais tempo do que o prazo definido para a severidade aparecem aqui.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Chave</th>
                    <th>Título</th>
                    <th style={{ width: 130 }}>Severidade</th>
                    <th style={{ width: 130 }}>Data de Abertura</th>
                    <th>Dias em aberto</th>
                    <th style={{ width: 100 }}>% do SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slaViolations.map(bug => {
                    const severity = bug.priority ? priorityLabel(bug.priority) : '—';
                    return (
                      <tr key={bug.key}>
                        <td>
                          <a
                            href={bug.link}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                          >
                            {bug.key} <ArrowSquareOutIcon size={11} />
                          </a>
                        </td>
                        <td style={{ fontSize: '0.85rem', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bug.title}>
                          {bug.title}
                        </td>
                        <td>
                          {severity === '—' ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : (
                            <span className="tag" style={{ background: `${PRIORITY_COLORS[severity]}20`, color: PRIORITY_COLORS[severity] }}>
                              {severity}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(bug.openedAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--status-failed)', fontWeight: 700 }}>{bug.ageDays}</td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--status-failed)', fontWeight: 700 }}>{bug.percentOfSla}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
