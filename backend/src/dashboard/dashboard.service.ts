import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService, type JiraIssueSummary } from '../jira/jira.service';
import {
  COMPLETED_EXECUTIONS_LIMIT,
  SLA_DAYS_BY_PRIORITY,
  SLA_WARNING_THRESHOLD,
  MTTR_WINDOW_DAYS,
  canonicalSeverityLabel,
} from './dashboard.constants';

// Mesmo sentinela do backfill de projetos (suítes manuais, sem projeto real no Jira) —
// ver MANUAL_PROJECT_JIRA_ID em boards.service.ts.
const MANUAL_PROJECT_JIRA_ID = 'manual';

// As 6 severidades editáveis na tela de SLA (aba Eficiência) — mesma ordem exibida no front.
const CANONICAL_SEVERITIES = ['Gravíssima', 'Crítica', 'Alta', 'Média', 'Normal', 'Trivial'];

interface IssueLite {
  jiraKey: string | null;
  jiraPriority: string | null;
  jiraLabels: string[];
  type: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
  ) {}

  // Mesmo filtro de board/projeto já usado em ExecutionsService.findRecentExecutions —
  // reaproveitado aqui em vez de importado porque a consulta precisa de um `include`
  // diferente (issues aninhadas de testCases/scenarios, que o widget de home não busca).
  private async findCompletedExecutionsWindow(projectId: string, boardId?: string) {
    const boardFilterSuite =
      boardId === 'none' ? { boards: { none: {} } } : boardId ? { boards: { some: { id: boardId } } } : {};
    const boardFilterBatch = boardId === 'none' ? { boardId: null } : boardId ? { boardId } : {};

    return this.prisma.execution.findMany({
      where: {
        OR: [
          { suite: { projectId, ...boardFilterSuite } },
          { batch: { projectId, ...boardFilterBatch } },
        ],
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: COMPLETED_EXECUTIONS_LIMIT,
      select: {
        id: true,
        suite: { select: { jiraKey: true, title: true } },
        batch: { select: { name: true } },
        testCases: {
          select: {
            status: true,
            issues: { select: { jiraKey: true, jiraPriority: true, jiraLabels: true, type: true } },
            scenarios: {
              select: {
                status: true,
                issues: { select: { jiraKey: true, jiraPriority: true, jiraLabels: true, type: true } },
              },
            },
          },
        },
      },
    });
  }

  // Mesma lógica de frontend/src/pages/dashboard/shared.ts (progressOf) — reimplementada
  // aqui porque não há pacote compartilhado front/back neste repo (mesmo padrão já usado
  // para executionTitle/COMPLETED_EXECUTIONS_LIMIT/SLA_DAYS_BY_PRIORITY).
  private testCounts(execution: {
    testCases: Array<{ status: string; scenarios: Array<{ status: string }> }>;
  }): { total: number; failed: number } {
    const effectiveItems = execution.testCases.flatMap((tc) =>
      tc.scenarios.length > 0 ? tc.scenarios : [tc],
    );
    return {
      total: effectiveItems.length,
      failed: effectiveItems.filter((item) => item.status === 'FAILED').length,
    };
  }

  // Mesma lógica de frontend/src/pages/dashboard/shared.ts (executionTitle) —
  // duplicada aqui porque não há pacote compartilhado front/back neste repo (mesmo
  // padrão de COMPLETED_EXECUTIONS_LIMIT/SLA_DAYS_BY_PRIORITY).
  private executionTitle(execution: {
    id: string;
    suite: { jiraKey: string | null; title: string } | null;
    batch: { name: string | null } | null;
  }): string {
    if (execution.suite) {
      return `${execution.suite.jiraKey ? `${execution.suite.jiraKey} — ` : ''}${execution.suite.title}`;
    }
    if (execution.batch?.name) {
      return `Lote — ${execution.batch.name}`;
    }
    return `Execução ${execution.id.slice(0, 8)}`;
  }

  private issuesOf(execution: {
    testCases: Array<{ issues: IssueLite[]; scenarios: Array<{ issues: IssueLite[] }> }>;
  }): IssueLite[] {
    const issues: IssueLite[] = [];
    for (const tc of execution.testCases) {
      issues.push(...tc.issues);
      for (const scenario of tc.scenarios) issues.push(...scenario.issues);
    }
    return issues;
  }

  async getQuality(userId: string, projectId: string, boardId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpException('Projeto não encontrado.', HttpStatus.NOT_FOUND);
    }

    const executions = await this.findCompletedExecutionsWindow(projectId, boardId);

    // ── Densidade por combinação de labels ──────────────────────────────────
    // Só bugs — melhorias não são "defeitos", ficam de fora desta seção (diferente
    // da Taxa de Sucesso × Severidade, onde os dois entram juntos por outro motivo).
    // Bug distinto (por jiraKey) conta uma vez, no grupo correspondente ao conjunto
    // exato de labels da issue — não distingue programaticamente módulo x
    // funcionalidade (decisão do usuário: uma segunda label é opcional, não
    // obrigatória, e o agrupamento é só pela combinação).
    const seenGlobally = new Set<string>();
    const densityByLabelCombo = new Map<string, { labels: string[]; count: number }>();
    for (const execution of executions) {
      for (const issue of this.issuesOf(execution)) {
        if (issue.type !== 'BUG' || !issue.jiraKey || seenGlobally.has(issue.jiraKey)) continue;
        seenGlobally.add(issue.jiraKey);
        const labels = [...issue.jiraLabels].sort();
        const key = labels.length > 0 ? labels.join(' + ') : 'Sem label';
        const entry = densityByLabelCombo.get(key) ?? { labels, count: 0 };
        entry.count += 1;
        densityByLabelCombo.set(key, entry);
      }
    }

    // ── Taxa de sucesso × severidade ─────────────────────────────────────────
    // Só bugs — mesmo critério da Densidade por Label (melhorias não são "defeitos").
    // Por execução, bugs distintos (dedupe só dentro da própria execução) agrupados
    // pela severidade real do Jira (jiraPriority), com o total/reprovado de testes
    // daquela execução, pro tooltip do gráfico dar mais contexto do que só a contagem.
    const severityByExecution = executions.map((execution) => {
      const seenInExecution = new Set<string>();
      const bySeverity = new Map<string, number>();
      for (const issue of this.issuesOf(execution)) {
        if (issue.type !== 'BUG' || !issue.jiraKey || seenInExecution.has(issue.jiraKey)) continue;
        seenInExecution.add(issue.jiraKey);
        const severity = issue.jiraPriority ?? 'Sem severidade';
        bySeverity.set(severity, (bySeverity.get(severity) ?? 0) + 1);
      }
      const { total, failed } = this.testCounts(execution);
      return {
        executionId: execution.id,
        title: this.executionTitle(execution),
        totalTests: total,
        failedTests: failed,
        bySeverity: Array.from(bySeverity.entries()).map(([severity, count]) => ({ severity, count })),
      };
    });

    // ── Cobertura de requisitos + automação ──────────────────────────────────
    // Épicos são escopados ao quadro selecionado usando o filtro JQL real do board (via
    // JiraService.countEpicsByBoard) quando houver boardId — o filtro de um board pode ter
    // qualquer combinação de critérios (ex. só projeto, ou projeto + status + labels) e
    // raramente restringe issuetype, então Épicos que também atendam a esses critérios
    // entram na conta. Sem boardId (ou "Sem quadro"), mantém o escopo do projeto inteiro.
    // epicsWithSuite usa o mesmo filtro de board das Suítes (boardFilterSuite, reaproveitado
    // abaixo em totalTestCases/automatedTestCases) pra numerador e denominador ficarem no
    // mesmo escopo.
    const boardFilterSuite =
      boardId === 'none' ? { boards: { none: {} } } : boardId ? { boards: { some: { id: boardId } } } : {};
    const suites = await this.prisma.suite.findMany({
      where: { projectId, ...boardFilterSuite },
      select: { epicKey: true },
    });
    const epicsWithSuite = new Set(suites.map((s) => s.epicKey).filter((k): k is string => !!k));

    let totalEpics = 0;
    if (project.jiraProjectId !== MANUAL_PROJECT_JIRA_ID) {
      if (boardId && boardId !== 'none') {
        const board = await this.prisma.board.findUnique({ where: { id: boardId } });
        totalEpics = board ? await this.jiraService.countEpicsByBoard(userId, board.jiraBoardId) : 0;
      } else {
        totalEpics = await this.jiraService.countIssuesByProject(userId, project.jiraProjectKey, { type: 'Epic' });
      }
    }

    const [totalTestCases, automatedTestCases] = await Promise.all([
      this.prisma.testCase.count({ where: { suite: { projectId, ...boardFilterSuite } } }),
      this.prisma.testCase.count({ where: { suite: { projectId, ...boardFilterSuite }, automated: true } }),
    ]);

    return {
      density: Array.from(densityByLabelCombo.entries()).map(([key, value]) => ({
        key,
        labels: value.labels,
        count: value.count,
      })),
      severityByExecution,
      coverage: {
        epicsWithSuite: epicsWithSuite.size,
        totalEpics,
        totalTestCases,
        automatedTestCases,
      },
    };
  }

  // Todos os bugs do quadro (ou do projeto inteiro, se "Sem quadro"/sem board) no Jira —
  // decisão do usuário: MTTR/idade/SLA não se limitam a bugs que passaram por uma
  // execução no TestRun, é o quadro/projeto real no Jira.
  private async fetchAllBugs(
    userId: string,
    project: Project,
    boardId?: string,
  ): Promise<JiraIssueSummary[]> {
    if (project.jiraProjectId === MANUAL_PROJECT_JIRA_ID) return [];

    if (boardId && boardId !== 'none') {
      const board = await this.prisma.board.findUnique({ where: { id: boardId } });
      if (!board) return [];
      const pageSize = 100;
      // searchIssuesByBoard só pagina uma página por chamada (quem pagina normalmente é
      // o frontend) — busca a 1ª página pra saber o total, depois todas as páginas
      // restantes em paralelo (startAt/maxResults dá pra pular direto pra qualquer
      // página, diferente do cursor de searchIssuesByProject). Quadros com centenas de
      // bugs (várias páginas) ficam sequenciais e lentos sem isso.
      const first = await this.jiraService.searchIssuesByBoard(userId, board.jiraBoardId, {
        type: 'Bug',
        page: 1,
        pageSize,
      });
      const issues = [...first.issues];
      const totalPages = Math.ceil(first.total / pageSize);
      if (totalPages > 1) {
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const results = await Promise.all(
          remainingPages.map((page) =>
            this.jiraService.searchIssuesByBoard(userId, board.jiraBoardId, { type: 'Bug', page, pageSize }),
          ),
        );
        for (const result of results) issues.push(...result.issues);
      }
      return issues;
    }

    const result = await this.jiraService.searchIssuesByProject(userId, project.jiraProjectKey, {
      type: 'Bug',
      all: true,
      pageSize: 100,
    });
    return result.issues;
  }

  async getEfficiency(userId: string, projectId: string, boardId?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpException('Projeto não encontrado.', HttpStatus.NOT_FOUND);
    }

    const bugs = await this.fetchAllBugs(userId, project, boardId);
    const slaOverrides = await this.getSlaOverrides(projectId, boardId);

    const now = Date.now();
    const resolvedDurationsDays: number[] = [];
    // Bugs resolvidos entre 91 e 180 dias atrás — usado só pra calcular a tendência (delta)
    // do MTTR contra o período imediatamente anterior, sem detalhamento por severidade.
    const previousResolvedDurationsDays: number[] = [];
    // Soma/contagem por severidade real do Jira, só dos bugs resolvidos dentro da janela do
    // MTTR — mesmo padrão de "backend agrupa pelo valor bruto, frontend normaliza pra exibir"
    // já usado em openBugsBySeverityMap/severityByExecution.
    const mttrBySeverityMap = new Map<string, { totalDays: number; count: number }>();
    const openAgesDays: number[] = [];
    const slaViolations: Array<{
      key: string;
      link: string;
      title: string;
      priority?: string;
      ageDays: number;
      openedAt: string;
      percentOfSla: number;
    }> = [];
    const openBugsBySeverityMap = new Map<string, number>();
    let withinSlaCount = 0;
    let nearSlaCount = 0;
    let noSlaDefinedCount = 0;

    for (const bug of bugs) {
      if (!bug.created) continue;
      const createdMs = new Date(bug.created).getTime();
      // resolutiondate só é setado quando o campo Resolução do Jira é preenchido —
      // muitos projetos (este incluso) fecham bugs só trocando o status, sem tocar
      // nesse campo, e resolutiondate fica sempre vazio. statusCategory "done" é a
      // forma confiável (e independente de idioma) de saber que o bug foi encerrado;
      // na ausência de resolutiondate, usa `updated` como aproximação da data de
      // fechamento.
      const resolvedAt = bug.resolutiondate ?? (bug.statusCategory === 'done' ? bug.updated : undefined);
      if (resolvedAt) {
        const resolvedMs = new Date(resolvedAt).getTime();
        // Só entra no MTTR se a resolução em si aconteceu dentro da janela — bugs resolvidos
        // há mais tempo que isso não contam, mesmo que o cálculo de todos os bugs (SLA/idade
        // dos abertos) continue olhando o histórico inteiro.
        const daysSinceResolved = (now - resolvedMs) / 86_400_000;
        if (daysSinceResolved <= MTTR_WINDOW_DAYS) {
          const durationDays = (resolvedMs - createdMs) / 86_400_000;
          resolvedDurationsDays.push(durationDays);
          const severityKey = bug.priority ?? 'Sem severidade';
          const entry = mttrBySeverityMap.get(severityKey) ?? { totalDays: 0, count: 0 };
          entry.totalDays += durationDays;
          entry.count += 1;
          mttrBySeverityMap.set(severityKey, entry);
        } else if (daysSinceResolved <= MTTR_WINDOW_DAYS * 2) {
          previousResolvedDurationsDays.push((resolvedMs - createdMs) / 86_400_000);
        }
      } else {
        const ageDays = (now - createdMs) / 86_400_000;
        openAgesDays.push(ageDays);
        const severityKey = bug.priority ?? 'Sem severidade';
        openBugsBySeverityMap.set(severityKey, (openBugsBySeverityMap.get(severityKey) ?? 0) + 1);

        // Override por quadro (se existir) vale pela severidade canônica do bug — assim
        // funciona tanto pra sites Jira em português quanto no esquema padrão em inglês.
        // Sem override, cai no padrão de SLA_DAYS_BY_PRIORITY, chaveado pela string bruta
        // do Jira (comportamento inalterado pra quem nunca customizou).
        const canonical = bug.priority ? canonicalSeverityLabel(bug.priority) : undefined;
        const slaDays = canonical && slaOverrides[canonical] !== undefined
          ? slaOverrides[canonical]
          : bug.priority ? SLA_DAYS_BY_PRIORITY[bug.priority] : undefined;
        if (slaDays === undefined) {
          noSlaDefinedCount += 1;
        } else if (ageDays > slaDays) {
          slaViolations.push({
            key: bug.key,
            link: bug.link,
            title: bug.summary,
            priority: bug.priority,
            ageDays: Math.round(ageDays),
            openedAt: bug.created,
            percentOfSla: Math.round((ageDays / slaDays) * 100),
          });
        } else if (ageDays > slaDays * SLA_WARNING_THRESHOLD) {
          nearSlaCount += 1;
        } else {
          withinSlaCount += 1;
        }
      }
    }

    const average = (values: number[]) =>
      values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

    // Média sozinha é sensível a outliers quando a amostra é pequena (poucas dezenas de bugs
    // na janela) — um único bug muito antigo resolvido agora pode distorcer a média sem
    // representar o "bug típico". Mediana e P90 completam o quadro: mediana mostra a
    // experiência típica, P90 mostra o pior caso comum (9 em cada 10 bugs resolveram dentro
    // desse prazo).
    const median = (values: number[]) => {
      if (values.length === 0) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return Math.round(value * 10) / 10;
    };
    const percentile = (values: number[], p: number) => {
      if (values.length === 0) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const rank = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(rank);
      const upper = Math.ceil(rank);
      const value = sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
      return Math.round(value * 10) / 10;
    };

    return {
      mttrDays: average(resolvedDurationsDays),
      mttrMedianDays: median(resolvedDurationsDays),
      mttrP90Days: percentile(resolvedDurationsDays, 90),
      mttrPreviousDays: average(previousResolvedDurationsDays),
      mttrWindowDays: MTTR_WINDOW_DAYS,
      avgAgeDays: average(openAgesDays),
      maxAgeDays: openAgesDays.length > 0 ? Math.round(Math.max(...openAgesDays)) : null,
      minAgeDays: openAgesDays.length > 0 ? Math.round(Math.min(...openAgesDays)) : null,
      openBugsCount: openAgesDays.length,
      resolvedBugsCount: resolvedDurationsDays.length,
      mttrBySeverity: Array.from(mttrBySeverityMap.entries()).map(([priority, { totalDays, count }]) => ({
        priority,
        avgDays: Math.round((totalDays / count) * 10) / 10,
        count,
      })),
      openBugsBySeverity: Array.from(openBugsBySeverityMap.entries()).map(([priority, count]) => ({
        priority,
        count,
      })),
      slaBuckets: {
        withinSla: withinSlaCount,
        nearSla: nearSlaCount,
        aboveSla: slaViolations.length,
        noSlaDefined: noSlaDefinedCount,
      },
      slaViolations: slaViolations.sort((a, b) => b.ageDays - a.ageDays),
      slaConfig: CANONICAL_SEVERITIES.map((label) => ({
        label,
        days: slaOverrides[label] ?? SLA_DAYS_BY_PRIORITY[label],
      })),
    };
  }

  // Chave de BoardSlaConfig: boardId 'none' cobre o pseudo-quadro "Sem quadro" (não é uma
  // linha real de Board); string vazia cobre o caso raro de nenhum boardId informado (dashboard
  // sem filtro de quadro) — nunca colide com um UUID real nem com 'none'.
  private async getSlaOverrides(projectId: string, boardId?: string): Promise<Record<string, number>> {
    const config = await this.prisma.boardSlaConfig.findUnique({
      where: { projectId_boardId: { projectId, boardId: boardId ?? '' } },
    });
    return (config?.slaDays as Record<string, number> | undefined) ?? {};
  }

  async getSlaConfig(projectId: string, boardId?: string) {
    const overrides = await this.getSlaOverrides(projectId, boardId);
    return {
      entries: CANONICAL_SEVERITIES.map((label) => ({
        label,
        days: overrides[label] ?? SLA_DAYS_BY_PRIORITY[label],
      })),
      isCustom: Object.keys(overrides).length > 0,
    };
  }

  async updateSlaConfig(projectId: string, boardId: string | undefined, slaDays: Record<string, number>) {
    const entries = Object.entries(slaDays).filter(([label]) => CANONICAL_SEVERITIES.includes(label));
    if (entries.length === 0) {
      throw new HttpException('Informe ao menos uma severidade válida.', HttpStatus.BAD_REQUEST);
    }
    for (const [label, days] of entries) {
      if (!Number.isInteger(days) || days < 1) {
        throw new HttpException(`Prazo inválido para ${label}: deve ser um número inteiro maior que zero.`, HttpStatus.BAD_REQUEST);
      }
    }
    const key = boardId ?? '';
    await this.prisma.boardSlaConfig.upsert({
      where: { projectId_boardId: { projectId, boardId: key } },
      update: { slaDays: Object.fromEntries(entries) },
      create: { projectId, boardId: key, slaDays: Object.fromEntries(entries) },
    });
    return this.getSlaConfig(projectId, boardId);
  }

  async resetSlaConfig(projectId: string, boardId?: string) {
    await this.prisma.boardSlaConfig.deleteMany({ where: { projectId, boardId: boardId ?? '' } });
    return this.getSlaConfig(projectId, boardId);
  }
}
