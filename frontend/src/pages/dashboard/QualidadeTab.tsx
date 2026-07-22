import { useState, useEffect } from 'react';
import { CountUp } from '../../components/CountUp';
import { BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';
import { ChartBarIcon, GaugeIcon, TargetIcon } from '@phosphor-icons/react';
import { dashboardApi } from '../../api/client';
import type { DashboardQuality } from '../../api/client';
import { priorityLabel, PRIORITY_COLORS } from '../../utils/priority';
import { bandColor } from './shared';
import { InfoTooltip } from '../../components/InfoTooltip';

interface QualidadeTabProps {
  projectId: string;
  boardId: string;
}

const SEVERITY_KEYS = ['Gravíssima', 'Crítica', 'Alta', 'Média', 'Normal', 'Trivial', 'Sem severidade'] as const;
const SEVERITY_KEY_COLORS: Record<string, string> = { ...PRIORITY_COLORS, 'Sem severidade': 'var(--chart-muted)' };

function pct(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

function SeverityTooltip({ active, payload, label }: {
  active?: boolean;
  label?: string;
  payload?: {
    dataKey: string;
    value: number;
    color: string;
    payload: { totalTests: number; failedTests: number };
  }[];
}) {
  if (!active || !payload?.length) return null;
  const nonZero = payload.filter(p => p.value > 0);
  if (nonZero.length === 0) return null;
  const { totalTests, failedTests } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)',
      padding: '0.5rem 0.75rem', fontSize: '0.8rem', maxWidth: 240,
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.4rem' }}>
        {totalTests} teste(s) · {failedTests} reprovado(s)
      </div>
      {nonZero.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: p.color }}>
          <span>{p.dataKey}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function QualidadeTab({ projectId, boardId }: QualidadeTabProps) {
  const [data, setData] = useState<DashboardQuality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardApi.getQuality(projectId, boardId)
      .then((qualityRes) => {
        if (cancelled) return;
        setData(qualityRes.data);
      })
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
        <ChartBarIcon size={40} />
        <h3>Não foi possível carregar os dados de qualidade</h3>
      </div>
    );
  }

  const sortedDensity = [...data.density].sort((a, b) => b.count - a.count);

  const severityChartData = [...data.severityByExecution].reverse().map((exec) => {
    const row: Record<string, unknown> = {
      id: exec.executionId,
      name: exec.title,
      totalTests: exec.totalTests,
      failedTests: exec.failedTests,
    };
    for (const key of SEVERITY_KEYS) row[key] = 0;
    for (const { severity, count } of exec.bySeverity) {
      const key = severity === 'Sem severidade' ? 'Sem severidade' : priorityLabel(severity);
      row[key] = (row[key] as number) + count;
    }
    return row;
  });
  const severitiesPresent = SEVERITY_KEYS.filter(key => severityChartData.some(row => (row[key] as number) > 0));

  const { totalTestCases, automatedTestCases } = data.coverage;
  const automationPct = pct(automatedTestCases, totalTestCases);

  return (
    <div>
      {/* Densidade de defeitos por combinação de labels */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ChartBarIcon size={18} weight="duotone" style={{ color: 'var(--status-failed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Densidade de Defeitos por Label</h2>
          <InfoTooltip>
            Bugs das últimas execuções, agrupados pela combinação exata de labels do Jira. Cada bug conta
            uma vez. Só bugs — melhorias não entram.
          </InfoTooltip>
        </div>
        {sortedDensity.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <ChartBarIcon size={40} />
            <h3>Sem bugs vinculados a issues do Jira</h3>
            <p>O gráfico aparece assim que houver bugs vinculados a uma issue real do Jira, com labels.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: 480 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Bugs</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDensity.map(group => (
                    <tr key={group.key}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{group.key}</td>
                      <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {group.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Taxa de sucesso × severidade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <GaugeIcon size={18} weight="duotone" style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Taxa de Sucesso × Severidade</h2>
          <InfoTooltip>
            Uma barra por execução, com os bugs de cada severidade que apareceram nela. Mostra se os
            defeitos recentes estão mais ou menos graves. Só bugs — melhorias não entram.
          </InfoTooltip>
        </div>
        {severityChartData.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <GaugeIcon size={40} />
            <h3>Sem dados suficientes</h3>
            <p>O gráfico aparece assim que houver execuções concluídas.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="name" tick={false} axisLine={{ stroke: 'var(--border-subtle)' }} tickLine={false} />
                  <RechartsTooltip content={<SeverityTooltip />} cursor={{ fill: 'var(--bg-elevated)' }} />
                  {severitiesPresent.map(key => (
                    <Bar key={key} dataKey={key} stackId="severity" fill={SEVERITY_KEY_COLORS[key]} maxBarSize={32} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {severitiesPresent.map(key => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: SEVERITY_KEY_COLORS[key] }} /> {key}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Casos de teste + automação */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TargetIcon size={18} weight="duotone" style={{ color: 'var(--secondary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Casos de Teste + Automação</h2>
          <InfoTooltip>
            Casos de Teste e Automação seguem o quadro selecionado.
          </InfoTooltip>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="Casos de Teste">Casos de Teste</p>
            <p className="stat-value"><CountUp value={totalTestCases} /></p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Automação">Automação</p>
            <p className="stat-value" style={{ color: automationPct !== null ? bandColor(automationPct) : undefined }}>
              {automationPct !== null ? <CountUp value={automationPct} suffix="%" /> : '—'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{automatedTestCases} de {totalTestCases} casos</p>
          </div>
        </div>
      </section>
    </div>
  );
}
