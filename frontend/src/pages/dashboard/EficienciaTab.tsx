import { useState, useEffect } from 'react';
import { ClockIcon, ArrowSquareOutIcon, HourglassIcon } from '@phosphor-icons/react';
import { dashboardApi } from '../../api/client';
import type { DashboardEfficiency } from '../../api/client';
import { priorityLabel, PRIORITY_COLORS } from '../../utils/priority';

interface EficienciaTabProps {
  projectId: string;
  boardId: string;
}

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

  return (
    <div>
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ClockIcon size={18} weight="duotone" style={{ color: 'var(--secondary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>MTTR / Idade dos Defeitos / SLA</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="MTTR">MTTR</p>
            <p className="stat-value">{data.mttrDays !== null ? `${data.mttrDays} dias` : '—'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{data.resolvedBugsCount} bug(s) resolvido(s)</p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Idade Média dos Bugs Abertos">Idade Média (Abertos)</p>
            <p className="stat-value">{data.avgAgeDays !== null ? `${data.avgAgeDays} dias` : '—'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{data.openBugsCount} bug(s) em aberto</p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Bugs Acima do SLA">Bugs Acima do SLA</p>
            <p className="stat-value" style={{ color: data.slaViolations.length > 0 ? 'var(--status-failed)' : undefined }}>
              {data.slaViolations.length}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HourglassIcon size={18} weight="duotone" style={{ color: 'var(--status-failed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Bugs Acima do SLA</h2>
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
                    <th style={{ width: 130 }}>Severidade</th>
                    <th>Dias em aberto</th>
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
                        <td>
                          {severity === '—' ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : (
                            <span className="tag" style={{ background: `${PRIORITY_COLORS[severity]}20`, color: PRIORITY_COLORS[severity] }}>
                              {severity}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--status-failed)', fontWeight: 700 }}>{bug.ageDays}</td>
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
