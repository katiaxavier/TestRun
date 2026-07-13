import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';
import {
  GaugeIcon,
  PlayIcon,
  ClockCounterClockwiseIcon,
  FlaskIcon,
  BugIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
  XCircleIcon,
  ProhibitIcon,
  ChartLineUpIcon,
  WarningIcon,
  PlusCircleIcon,
} from '@phosphor-icons/react';
import { executionsApi, jiraIssuesApi } from '../../api/client';
import type { Execution, JiraIssue } from '../../api/client';
import { useProject } from '../../context/ProjectContext';
import { useBoard } from '../../context/BoardContext';
import { typeColor } from '../../utils/priority';
import { progressOf, bandColor, executionTitle, computeSuccessRate, COMPLETED_EXECUTIONS_LIMIT } from './shared';
import { InfoTooltip } from '../../components/InfoTooltip';

const ACTIVE_EXECUTIONS_LIMIT = 50; // teto do endpoint; cobre o caso de várias execuções simultâneas
const RECENT_COMPLETED_DISPLAY = 3; // quantas aparecem na lista "Últimas Execuções Concluídas"
const RECENT_ISSUES_LIMIT = 5; // últimos bugs/melhorias criados, por quantidade (não por janela de dias)
const READY_FOR_TEST_LIMIT = 100; // mostra todos os itens do status; 100 é o teto de pageSize do endpoint

function QualityTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; rate: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { name, rate } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)',
      padding: '0.5rem 0.75rem', fontSize: '0.8rem', maxWidth: 220,
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.15rem' }}>{name}</div>
      <div style={{ color: bandColor(rate), fontWeight: 700 }}>{rate}% de sucesso</div>
    </div>
  );
}

// Conteúdo original do Dashboard, movido para uma aba própria ("Operação") sem
// alteração de comportamento — ver PLANO-DASHBOARD-QUALIDADE-V2.md.
interface OperacaoTabProps {
  active: boolean;
}

export function OperacaoTab({ active }: OperacaoTabProps) {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { selectedBoard } = useBoard();

  const [activeExecutions, setActiveExecutions] = useState<Execution[]>([]);
  const [completedExecutions, setCompletedExecutions] = useState<Execution[]>([]);
  const [bugsTotal, setBugsTotal] = useState(0);
  const [improvementsTotal, setImprovementsTotal] = useState(0);
  const [readyForTestIssues, setReadyForTestIssues] = useState<JiraIssue[]>([]);
  // null = ainda não resolvido, true = status existe no workflow, false = workflow não tem "Ready for test"
  const [readyForTestStatusFound, setReadyForTestStatusFound] = useState<boolean | null>(null);
  const [recentIssues, setRecentIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const isNoneBoard = selectedBoard?.id === 'none';

  const fetchData = useCallback(async (projectId: string, boardId: string) => {
    try {
      const [activeRes, completedRes] = await Promise.all([
        executionsApi.getRecent(projectId, boardId, { status: 'IN_PROGRESS', limit: ACTIVE_EXECUTIONS_LIMIT }),
        executionsApi.getRecent(projectId, boardId, { status: 'COMPLETED', limit: COMPLETED_EXECUTIONS_LIMIT }),
      ]);
      setActiveExecutions(activeRes.data);
      setCompletedExecutions(completedRes.data);
    } catch {}

    // Bugs/melhorias do Jira não existem para o pseudo-quadro "Sem quadro"
    if (boardId === 'none') {
      setBugsTotal(0);
      setImprovementsTotal(0);
      setReadyForTestIssues([]);
      setReadyForTestStatusFound(null);
      setRecentIssues([]);
      setLoading(false);
      return;
    }

    try {
      const [{ data: filters }, recentIssuesRes] = await Promise.all([
        jiraIssuesApi.getFilters(projectId),
        // Sem filtro de status/tipo: backend já traz Bug+Improvement ordenados por
        // key desc (proxy de ordem de criação); reordenamos por `created` no cliente
        // pra não depender disso.
        jiraIssuesApi.list(projectId, boardId, { pageSize: RECENT_ISSUES_LIMIT }),
      ]);
      setRecentIssues(
        [...recentIssuesRes.data.data].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      );

      const readyStatus = filters.statuses.find(s => s.name.trim().toLowerCase() === 'ready for test');
      if (!readyStatus) {
        setBugsTotal(0);
        setImprovementsTotal(0);
        setReadyForTestIssues([]);
        setReadyForTestStatusFound(false);
      } else {
        const [bugsRes, improvementsRes, tableRes] = await Promise.all([
          jiraIssuesApi.list(projectId, boardId, { status: readyStatus.id, type: 'Bug', pageSize: 1 }),
          jiraIssuesApi.list(projectId, boardId, { status: readyStatus.id, type: 'Improvement', pageSize: 1 }),
          jiraIssuesApi.list(projectId, boardId, { status: readyStatus.id, pageSize: READY_FOR_TEST_LIMIT }),
        ]);
        setBugsTotal(bugsRes.data.total);
        setImprovementsTotal(improvementsRes.data.total);
        setReadyForTestIssues(tableRes.data.data);
        setReadyForTestStatusFound(true);
      }
    } catch {
      setBugsTotal(0);
      setImprovementsTotal(0);
      setReadyForTestIssues([]);
      setReadyForTestStatusFound(false);
      setRecentIssues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProject || !selectedBoard) {
      setActiveExecutions([]);
      setCompletedExecutions([]);
      setBugsTotal(0);
      setImprovementsTotal(0);
      setReadyForTestIssues([]);
      setReadyForTestStatusFound(null);
      setRecentIssues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchData(selectedProject.id, selectedBoard.id);
  }, [selectedProject, selectedBoard, fetchData]);

  useEffect(() => {
    if (!active || !selectedProject || !selectedBoard) return;
    if (activeExecutions.length === 0) return;
    const interval = setInterval(() => fetchData(selectedProject.id, selectedBoard.id), 15_000);
    return () => clearInterval(interval);
  }, [active, selectedProject, selectedBoard, activeExecutions.length, fetchData]);

  const navigateToExecution = (execution: Execution) =>
    navigate(`/execution/${execution.id}`, { state: { from: 'home' } });

  const successRate = computeSuccessRate(completedExecutions);

  const failedExecutionsCount = completedExecutions.filter(ex => progressOf(ex).failed > 0).length;
  const blockedExecutionsCount = completedExecutions.filter(ex => progressOf(ex).blocked > 0).length;

  // Mais antiga → mais recente, da esquerda pra direita, como uma linha do tempo.
  const chartData = [...completedExecutions].reverse().map(ex => {
    const p = progressOf(ex);
    const rate = p.executed > 0 ? Math.round((p.passed / p.executed) * 100) : 0;
    return { id: ex.id, name: executionTitle(ex), rate };
  });

  type Alert = { text: string; color: string; Icon: typeof XCircleIcon };
  const alerts: Alert[] = [];
  if (!isNoneBoard && readyForTestStatusFound && bugsTotal > 0) {
    alerts.push({
      text: `${bugsTotal} bug${bugsTotal > 1 ? 's' : ''} aguardando validação`,
      color: 'var(--status-failed)',
      Icon: BugIcon,
    });
  }
  if (failedExecutionsCount > 0) {
    alerts.push({
      text: `${failedExecutionsCount} execuç${failedExecutionsCount > 1 ? 'ões' : 'ão'} com falha`,
      color: 'var(--status-failed)',
      Icon: XCircleIcon,
    });
  }
  if (blockedExecutionsCount > 0) {
    alerts.push({
      text: `${blockedExecutionsCount} execuç${blockedExecutionsCount > 1 ? 'ões' : 'ão'} com ${blockedExecutionsCount > 1 ? 'itens bloqueados' : 'item bloqueado'}`,
      color: 'var(--status-blocked)',
      Icon: ProhibitIcon,
    });
  }

  if (loading) {
    return <div className="loading-page"><div className="spinner" /> Carregando...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Atenção */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <WarningIcon size={18} weight="duotone" style={{ color: 'var(--status-blocked)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Atenção</h2>
          <InfoTooltip>
            Alertas que pedem ação agora: bugs Ready for Test aguardando validação, e execuções concluídas
            (das últimas {COMPLETED_EXECUTIONS_LIMIT}) com item(ns) reprovado(s) ou bloqueado(s).
          </InfoTooltip>
        </div>
        {alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <CheckCircleIcon size={40} style={{ color: 'var(--status-passed)' }} />
            <h3>Tudo certo</h3>
            <p>Nenhum alerta no momento.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {alerts.map(({ text, color, Icon }) => (
              <span
                key={text}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.4rem 0.75rem', borderRadius: '999px',
                  fontSize: '0.8rem', fontWeight: 600, color,
                  border: `1px solid ${color}`,
                }}
              >
                <Icon size={16} weight="fill" style={{ flexShrink: 0 }} />
                {text}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label" title="Execuções em Andamento">Execuções em Andamento</p>
          <p className="stat-value progress">{activeExecutions.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label" title="Bugs Ready for Test">Bugs Ready for Test</p>
          <p className="stat-value">{isNoneBoard ? '—' : bugsTotal}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label" title="Melhorias Ready for Test">Melhorias Ready for Test</p>
          <p className="stat-value">{isNoneBoard ? '—' : improvementsTotal}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label" title="Taxa de Sucesso">Taxa de Sucesso</p>
          <p className="stat-value" style={{ color: successRate !== null ? bandColor(successRate) : undefined }}>
            {successRate !== null ? `${successRate}%` : '—'}
          </p>
        </div>
      </div>

      {/* Ready for Test */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <BugIcon size={18} weight="duotone" style={{ color: 'var(--status-failed)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Ready for Test</h2>
          <InfoTooltip>
            Bugs e melhorias do quadro selecionado cujo status no Jira é "Ready for Test" — itens já
            corrigidos/implementados, aguardando validação.
          </InfoTooltip>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/jira-issues')}>
            Ver todas
          </button>
        </div>
        {isNoneBoard ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <BugIcon size={40} />
            <h3>Não disponível para "Sem quadro"</h3>
            <p>Selecione um quadro real do Jira no menu lateral para ver bugs e melhorias.</p>
          </div>
        ) : readyForTestStatusFound === false ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <BugIcon size={40} />
            <h3>Nenhum status "Ready for test" neste quadro</h3>
            <p>O workflow do Jira deste projeto não tem esse status configurado.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Bugs <strong style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{bugsTotal}</strong>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Melhorias <strong style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{improvementsTotal}</strong>
              </span>
            </div>
            {readyForTestIssues.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <BugIcon size={40} />
                <h3>Nenhum item Ready for Test</h3>
                <p>Bugs e melhorias com esse status aparecem aqui.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 130 }}>Chave</th>
                        <th>Título</th>
                        <th style={{ width: 110 }}>Tipo</th>
                        <th style={{ width: 160 }}>Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readyForTestIssues.map(issue => (
                        <tr key={issue.key}>
                          <td>
                            <a
                              href={issue.link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                            >
                              {issue.key} <ArrowSquareOutIcon size={11} />
                            </a>
                          </td>
                          <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{issue.summary}</td>
                          <td>
                            {(() => {
                              const c = typeColor(issue.issuetype);
                              return (
                                <span className="tag" style={c ? { background: c.bg, color: c.color } : undefined}>
                                  {issue.issuetype}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{issue.assignee ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Últimos Bugs e Melhorias Criados */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <PlusCircleIcon size={18} weight="duotone" style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Últimos Bugs e Melhorias Criados</h2>
          <InfoTooltip>
            Os {RECENT_ISSUES_LIMIT} bugs/melhorias mais recentes do quadro selecionado, ordenados pela
            data de criação no Jira (não é uma janela por dias, é sempre a quantidade mais recente).
          </InfoTooltip>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/jira-issues')}>
            Ver todas
          </button>
        </div>
        {isNoneBoard ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <BugIcon size={40} />
            <h3>Não disponível para "Sem quadro"</h3>
            <p>Selecione um quadro real do Jira no menu lateral para ver bugs e melhorias.</p>
          </div>
        ) : recentIssues.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <PlusCircleIcon size={40} />
            <h3>Nenhum bug ou melhoria registrado</h3>
            <p>Itens criados no Jira deste quadro aparecem aqui.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Chave</th>
                    <th>Título</th>
                    <th style={{ width: 110 }}>Tipo</th>
                    <th style={{ width: 150 }}>Status</th>
                    <th style={{ width: 120 }}>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIssues.map(issue => (
                    <tr key={issue.key}>
                      <td>
                        <a
                          href={issue.link}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                        >
                          {issue.key} <ArrowSquareOutIcon size={11} />
                        </a>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{issue.summary}</td>
                      <td>
                        {(() => {
                          const c = typeColor(issue.issuetype);
                          return (
                            <span className="tag" style={c ? { background: c.bg, color: c.color } : undefined}>
                              {issue.issuetype}
                            </span>
                          );
                        })()}
                      </td>
                      <td><span className="tag" style={{ whiteSpace: 'nowrap' }}>{issue.status}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {issue.created ? new Date(issue.created).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Execuções em Andamento */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <PlayIcon size={18} weight="duotone" style={{ color: 'var(--secondary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Execuções em Andamento</h2>
          <InfoTooltip>
            Execuções com status "Em Andamento". A barra mostra o percentual de casos de teste (ou
            cenários, quando existem) já executados em relação ao total da execução.
          </InfoTooltip>
        </div>
        {activeExecutions.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <GaugeIcon size={40} />
            <h3>Nenhuma execução em andamento</h3>
            <p>Inicie uma execução em uma suíte ou lote para acompanhar o progresso aqui.</p>
            <button className="btn btn-primary" onClick={() => navigate('/suites')} style={{ marginTop: '0.5rem' }}>
              <FlaskIcon size={16} /> Ver Suítes
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: '0.25rem 0' }}>
            {activeExecutions.map((execution, i) => {
              const p = progressOf(execution);
              const pct = p.total > 0 ? Math.round((p.executed / p.total) * 100) : 0;
              return (
                <div
                  key={execution.id}
                  onClick={() => navigateToExecution(execution)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem',
                    cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                  }}
                >
                  <span style={{ flex: '0 0 auto', maxWidth: '40%', fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {executionTitle(execution)}
                  </span>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--secondary)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ flex: '0 0 auto', minWidth: 38, textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Últimas Execuções Concluídas */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ClockCounterClockwiseIcon size={18} weight="duotone" style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Últimas Execuções Concluídas</h2>
          <InfoTooltip>
            As {RECENT_COMPLETED_DISPLAY} execuções concluídas mais recentes. O ícone indica se a execução
            teve algum item reprovado (✖ vermelho), bloqueado (⊘ amarelo), ou se tudo foi aprovado (✔ verde).
          </InfoTooltip>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/executions')}>
            Ver todas
          </button>
        </div>
        {completedExecutions.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <ClockCounterClockwiseIcon size={40} />
            <h3>Nenhuma execução recente</h3>
            <p>O histórico de execuções concluídas aparece aqui assim que você concluir a primeira.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: '0.25rem 0' }}>
            {completedExecutions.slice(0, RECENT_COMPLETED_DISPLAY).map((execution, i) => {
              const p = progressOf(execution);
              return (
                <div
                  key={execution.id}
                  onClick={() => navigateToExecution(execution)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem',
                    cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                  }}
                >
                  {p.failed > 0
                    ? <XCircleIcon size={18} weight="fill" style={{ color: 'var(--status-failed)', flexShrink: 0 }} />
                    : p.blocked > 0
                    ? <ProhibitIcon size={18} weight="fill" style={{ color: 'var(--status-blocked)', flexShrink: 0 }} />
                    : <CheckCircleIcon size={18} weight="fill" style={{ color: 'var(--status-passed)', flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {executionTitle(execution)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Qualidade */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ChartLineUpIcon size={18} weight="duotone" style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Qualidade</h2>
          <InfoTooltip>
            Taxa de aprovação de cada uma das últimas {COMPLETED_EXECUTIONS_LIMIT} execuções concluídas — casos
            de teste (ou cenários, quando existem) marcados como Aprovado dividido pelo total já executado
            (Aprovado + Reprovado + Bloqueado) naquela execução.
          </InfoTooltip>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <ChartLineUpIcon size={40} />
            <h3>Sem dados suficientes</h3>
            <p>O gráfico aparece assim que houver execuções concluídas.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="name" tick={false} axisLine={{ stroke: 'var(--border-subtle)' }} tickLine={false} />
                  <RechartsTooltip content={<QualityTooltip />} cursor={{ fill: 'var(--bg-elevated)' }} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {chartData.map(d => <Cell key={d.id} fill={bandColor(d.rate)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--status-passed)' }} /> ≥ 80%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--status-blocked)' }} /> 50–79%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--status-failed)' }} /> &lt; 50%
              </span>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
}
