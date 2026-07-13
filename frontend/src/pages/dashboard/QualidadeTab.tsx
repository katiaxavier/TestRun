import { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';
import { ChartBarIcon, GaugeIcon, TargetIcon, HeartbeatIcon } from '@phosphor-icons/react';
import { dashboardApi, executionsApi } from '../../api/client';
import type { DashboardQuality, DashboardEfficiency } from '../../api/client';
import { priorityLabel, PRIORITY_COLORS } from '../../utils/priority';
import { bandColor, computeSuccessRate, COMPLETED_EXECUTIONS_LIMIT } from './shared';
import { InfoTooltip } from '../../components/InfoTooltip';

interface QualidadeTabProps {
  projectId: string;
  boardId: string;
}

// Mesmas duas faixas de topo usadas em SLA_DAYS_BY_PRIORITY/PRIORITY_COLORS pra "crítico".
const CRITICAL_SEVERITIES = ['Gravíssima', 'Crítica'];

const SEVERITY_KEYS = ['Gravíssima', 'Crítica', 'Alta', 'Média', 'Normal', 'Trivial', 'Sem severidade'] as const;
const SEVERITY_KEY_COLORS: Record<string, string> = { ...PRIORITY_COLORS, 'Sem severidade': '#555e76' };

function pct(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

interface SeverityDetail { bugs: number; improvements: number }

function SeverityTooltip({ active, payload, label }: {
  active?: boolean;
  label?: string;
  payload?: {
    dataKey: string;
    value: number;
    color: string;
    payload: { totalTests: number; failedTests: number; detail: Record<string, SeverityDetail> };
  }[];
}) {
  if (!active || !payload?.length) return null;
  const nonZero = payload.filter(p => p.value > 0);
  if (nonZero.length === 0) return null;
  const { totalTests, failedTests, detail } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)',
      padding: '0.5rem 0.75rem', fontSize: '0.8rem', maxWidth: 240,
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.4rem' }}>
        {totalTests} teste(s) · {failedTests} reprovado(s)
      </div>
      {nonZero.map(p => {
        const d = detail[p.dataKey];
        return (
          <div key={p.dataKey} style={{ marginBottom: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: p.color }}>
              <span>{p.dataKey}</span>
              <strong>{p.value}</strong>
            </div>
            {d && (d.bugs > 0 || d.improvements > 0) && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {[d.bugs > 0 ? `${d.bugs} bug(s)` : null, d.improvements > 0 ? `${d.improvements} melhoria(s)` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function QualidadeTab({ projectId, boardId }: QualidadeTabProps) {
  const [data, setData] = useState<DashboardQuality | null>(null);
  const [efficiency, setEfficiency] = useState<DashboardEfficiency | null>(null);
  const [successRate, setSuccessRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      dashboardApi.getQuality(projectId, boardId),
      // Chamadas independentes só pra alimentar os KPIs do topo — getEfficiency já é
      // usado pela aba Eficiência, reaproveitado aqui em vez de duplicar a busca ao
      // vivo de bugs no Jira dentro de getQuality.
      dashboardApi.getEfficiency(projectId, boardId).catch(() => ({ data: null })),
      executionsApi.getRecent(projectId, boardId, { status: 'COMPLETED', limit: COMPLETED_EXECUTIONS_LIMIT }).catch(() => ({ data: [] })),
    ])
      .then(([qualityRes, efficiencyRes, executionsRes]) => {
        if (cancelled) return;
        setData(qualityRes.data);
        setEfficiency(efficiencyRes.data);
        setSuccessRate(computeSuccessRate(executionsRes.data));
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

  const maxDensity = Math.max(1, ...data.density.map(d => d.count));
  const sortedDensity = [...data.density].sort((a, b) => b.count - a.count);

  const severityChartData = [...data.severityByExecution].reverse().map((exec) => {
    const row: Record<string, unknown> = {
      id: exec.executionId,
      name: exec.title,
      totalTests: exec.totalTests,
      failedTests: exec.failedTests,
    };
    const detail: Record<string, SeverityDetail> = {};
    for (const key of SEVERITY_KEYS) {
      row[key] = 0;
      detail[key] = { bugs: 0, improvements: 0 };
    }
    for (const { severity, count, bugs, improvements } of exec.bySeverity) {
      const key = severity === 'Sem severidade' ? 'Sem severidade' : priorityLabel(severity);
      row[key] = (row[key] as number) + count;
      detail[key] = {
        bugs: detail[key].bugs + bugs,
        improvements: detail[key].improvements + improvements,
      };
    }
    row.detail = detail;
    return row;
  });
  const severitiesPresent = SEVERITY_KEYS.filter(key => severityChartData.some(row => (row[key] as number) > 0));

  const { epicsWithSuite, totalEpics, totalTestCases, automatedTestCases } = data.coverage;
  const coveragePct = pct(epicsWithSuite, totalEpics);
  const automationPct = pct(automatedTestCases, totalTestCases);

  const criticalOpenBugs = (efficiency?.openBugsBySeverity ?? [])
    .filter(({ priority }) => CRITICAL_SEVERITIES.includes(priorityLabel(priority)))
    .reduce((sum, { count }) => sum + count, 0);

  return (
    <div>
      {/* Health KPIs */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HeartbeatIcon size={18} weight="duotone" style={{ color: 'var(--status-passed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Resumo</h2>
          <InfoTooltip>
            Estado geral da qualidade antes de entrar no detalhe dos gráficos abaixo. Taxa de Aprovação e
            Bugs Críticos consideram as últimas {COMPLETED_EXECUTIONS_LIMIT} execuções/bugs em aberto no
            Jira; Cobertura de Requisitos e Automação são os mesmos dados detalhados mais abaixo.
          </InfoTooltip>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="Taxa de Aprovação">Taxa de Aprovação</p>
            <p className="stat-value" style={{ color: successRate !== null ? bandColor(successRate) : undefined }}>
              {successRate !== null ? `${successRate}%` : '—'}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Bugs Críticos em Aberto">Bugs Críticos em Aberto</p>
            <p className="stat-value" style={{ color: criticalOpenBugs > 0 ? 'var(--status-failed)' : undefined }}>
              {efficiency ? criticalOpenBugs : '—'}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Cobertura de Requisitos">Cobertura de Requisitos</p>
            <p className="stat-value" style={{ color: coveragePct !== null ? bandColor(coveragePct) : undefined }}>
              {coveragePct !== null ? `${coveragePct}%` : '—'}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Cobertura de Automação">Cobertura de Automação</p>
            <p className="stat-value" style={{ color: automationPct !== null ? bandColor(automationPct) : undefined }}>
              {automationPct !== null ? `${automationPct}%` : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* Densidade de defeitos por combinação de labels */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ChartBarIcon size={18} weight="duotone" style={{ color: 'var(--status-failed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Densidade de Defeitos por Label</h2>
          <InfoTooltip>
            Quantidade de bugs/melhorias distintos (das últimas execuções concluídas) agrupados pela combinação
            exata de labels do Jira — cada issue conta uma única vez, no grupo do conjunto de labels que ela tem.
          </InfoTooltip>
        </div>
        {sortedDensity.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <ChartBarIcon size={40} />
            <h3>Sem bugs vinculados a issues do Jira</h3>
            <p>O gráfico aparece assim que houver bugs/melhorias vinculados a uma issue real do Jira, com labels.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sortedDensity.map(group => (
              <div key={group.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ flex: '0 0 240px', fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group.key}>
                  {group.key}
                </span>
                <div style={{ flex: 1, height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(group.count / maxDensity) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                </div>
                <span style={{ flex: '0 0 auto', minWidth: 24, textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {group.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Taxa de sucesso × severidade */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <GaugeIcon size={18} weight="duotone" style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Taxa de Sucesso × Severidade</h2>
          <InfoTooltip>
            Uma barra por execução concluída, mostrando quantos bugs/melhorias distintos de cada severidade
            apareceram naquela execução — dá pra ver se as execuções mais recentes estão trazendo defeitos
            mais ou menos graves que as anteriores.
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

      {/* Cobertura de requisitos + automação */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TargetIcon size={18} weight="duotone" style={{ color: 'var(--secondary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Cobertura de Requisitos + Automação</h2>
          <InfoTooltip>
            Épicos são sempre do projeto inteiro, mesmo com um quadro selecionado no resto do dashboard.
            Casos de Teste e Automação já são filtrados pelo quadro selecionado.
          </InfoTooltip>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label" title="Épicos com Suíte Vinculada">Épicos com Suíte Vinculada</p>
            <p className="stat-value" style={{ color: coveragePct !== null ? bandColor(coveragePct) : undefined }}>
              {coveragePct !== null ? `${coveragePct}%` : '—'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{epicsWithSuite} de {totalEpics} épicos</p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Épicos sem Cobertura">Épicos sem Cobertura</p>
            <p className="stat-value">{Math.max(0, totalEpics - epicsWithSuite)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Casos de Teste">Casos de Teste</p>
            <p className="stat-value">{totalTestCases}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label" title="Automação">Automação</p>
            <p className="stat-value" style={{ color: automationPct !== null ? bandColor(automationPct) : undefined }}>
              {automationPct !== null ? `${automationPct}%` : '—'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{automatedTestCases} de {totalTestCases} casos</p>
          </div>
        </div>
      </section>
    </div>
  );
}
