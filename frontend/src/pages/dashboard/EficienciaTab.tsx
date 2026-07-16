import { Fragment, useState, useEffect } from 'react';
import { CountUp } from '../../components/CountUp';
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

  // Reagrupa por severidade canônica (o backend manda o valor bruto do Jira, que pode variar
  // de idioma) — mesmo padrão de severityChartData em QualidadeTab. Cada severidade conhecida
  // é comparada contra o próprio prazo de SLA; o que sobra vira o grupo "Sem severidade".
  const bySeverity = new Map<string, { totalDays: number; count: number }>();
  for (const { priority, avgDays, count } of data.mttrBySeverity) {
    const label = priority === 'Sem severidade' ? 'Sem severidade' : priorityLabel(priority);
    const entry = bySeverity.get(label) ?? { totalDays: 0, count: 0 };
    entry.totalDays += avgDays * count;
    entry.count += count;
    bySeverity.set(label, entry);
  }
  const mttrSeverityRows = SLA_DAYS_BY_SEVERITY.map(({ label, days }) => {
    const entry = bySeverity.get(label);
    bySeverity.delete(label);
    return {
      label,
      slaDays: days,
      avgDays: entry ? Math.round((entry.totalDays / entry.count) * 10) / 10 : null,
      count: entry?.count ?? 0,
    };
  }).filter((row) => row.count > 0);
  const semSeveridade = Array.from(bySeverity.values()).reduce(
    (acc, { totalDays, count }) => ({ totalDays: acc.totalDays + totalDays, count: acc.count + count }),
    { totalDays: 0, count: 0 },
  );
  // Uma lista só (severidades conhecidas + "Sem severidade" no fim), pra renderizar tudo
  // com o mesmo grid de colunas em vez de duplicar o bloco.
  const mttrRows: { label: string; slaDays?: number; avgDays: number | null; count: number; dotColor: string }[] = [
    ...mttrSeverityRows.map((row) => ({ ...row, dotColor: PRIORITY_COLORS[row.label] })),
    ...(semSeveridade.count > 0
      ? [{
          label: 'Sem severidade',
          avgDays: Math.round((semSeveridade.totalDays / semSeveridade.count) * 10) / 10,
          count: semSeveridade.count,
          dotColor: 'var(--chart-muted)',
        }]
      : []),
  ];

  return (
    <div>
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ClockIcon size={18} weight="duotone" style={{ color: 'var(--secondary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>MTTR / Idade dos Defeitos</h2>
          <InfoTooltip>
            <strong>MTTR:</strong> tempo para resolver bugs fechados nos últimos {data.mttrWindowDays} dias.
            Média, mediana (o bug "típico") e P90 (9 em cada 10 bugs resolveram até esse prazo) — a média
            sozinha oscila muito quando a amostra é pequena.<br />
            <strong>Idade Média:</strong> há quantos dias, em média, os bugs abertos estão parados.
          </InfoTooltip>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="MTTR (Média)">MTTR (Média)</p>
            <p className="stat-value">{data.mttrDays !== null ? `${data.mttrDays} dias` : '—'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {data.resolvedBugsCount} bug(s) resolvido(s) nos últimos {data.mttrWindowDays} dias
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="MTTR Mediana">Mediana</p>
            <p className="stat-value">{data.mttrMedianDays !== null ? `${data.mttrMedianDays} dias` : '—'}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="MTTR Percentil 90">P90</p>
            <p className="stat-value">{data.mttrP90Days !== null ? `${data.mttrP90Days} dias` : '—'}</p>
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

        {mttrRows.length > 0 && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1.25rem',
              width: 'fit-content',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>
              MTTR por severidade
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 1fr) auto auto auto', alignItems: 'center', columnGap: '0.75rem', rowGap: '0.3rem' }}>
              {mttrRows.map(({ label, slaDays, avgDays, count, dotColor }) => {
                const withinSla = slaDays !== undefined && avgDays !== null && avgDays <= slaDays;
                return (
                  <Fragment key={label}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: dotColor, flexShrink: 0 }} />
                      {label}
                    </span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'var(--text-primary)' }}>
                      {avgDays} d
                    </span>
                    <span style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: slaDays === undefined ? 'var(--text-muted)' : withinSla ? 'var(--status-passed)' : 'var(--status-failed)' }}>
                      {slaDays !== undefined ? `meta ≤${slaDays}d` : '—'}
                    </span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {count} bug(s)
                    </span>
                  </Fragment>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HourglassIcon size={18} weight="duotone" style={{ color: 'var(--status-failed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>SLA</h2>
          <InfoTooltip>
            Prazo para resolver um bug, por severidade (as faixas em dias estão na seção abaixo).<br />
            <strong>🟢 Dentro:</strong> até {SLA_WARNING_THRESHOLD_PCT}% do prazo<br />
            <strong>🟡 Próximo:</strong> passou de {SLA_WARNING_THRESHOLD_PCT}%, ainda no prazo<br />
            <strong>🔴 Acima:</strong> prazo estourado<br />
            <strong>Sem SLA:</strong> severidade sem prazo configurado
          </InfoTooltip>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="Dentro do SLA">🟢 Dentro do SLA</p>
            <p className="stat-value" style={{ color: 'var(--status-passed)' }}><CountUp value={data.slaBuckets.withinSla} /></p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Próximo do SLA">🟡 Próximo do SLA</p>
            <p className="stat-value" style={{ color: data.slaBuckets.nearSla > 0 ? 'var(--status-blocked)' : undefined }}>
              <CountUp value={data.slaBuckets.nearSla} />
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Acima do SLA">🔴 Acima do SLA</p>
            <p className="stat-value" style={{ color: data.slaBuckets.aboveSla > 0 ? 'var(--status-failed)' : undefined }}>
              <CountUp value={data.slaBuckets.aboveSla} />
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
            Bugs abertos que já passaram do prazo da severidade deles. "% do SLA" acima de 100% mostra o
            quanto estourou.
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
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
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
