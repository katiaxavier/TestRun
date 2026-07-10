import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService, type JiraIssueSummary } from '../jira/jira.service';
import { COMPLETED_EXECUTIONS_LIMIT, SLA_DAYS_BY_PRIORITY } from './dashboard.constants';

// Mesmo sentinela do backfill de projetos (suítes manuais, sem projeto real no Jira) —
// ver MANUAL_PROJECT_JIRA_ID em boards.service.ts.
const MANUAL_PROJECT_JIRA_ID = 'manual';

interface IssueLite {
  jiraKey: string | null;
  jiraPriority: string | null;
  jiraLabels: string[];
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
        testCases: {
          select: {
            issues: { select: { jiraKey: true, jiraPriority: true, jiraLabels: true } },
            scenarios: {
              select: { issues: { select: { jiraKey: true, jiraPriority: true, jiraLabels: true } } },
            },
          },
        },
      },
    });
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
    // Bug distinto (por jiraKey) conta uma vez, no grupo correspondente ao conjunto
    // exato de labels da issue — não distingue programaticamente módulo x
    // funcionalidade (decisão do usuário: uma segunda label é opcional, não
    // obrigatória, e o agrupamento é só pela combinação).
    const seenGlobally = new Set<string>();
    const densityByLabelCombo = new Map<string, { labels: string[]; count: number }>();
    for (const execution of executions) {
      for (const issue of this.issuesOf(execution)) {
        if (!issue.jiraKey || seenGlobally.has(issue.jiraKey)) continue;
        seenGlobally.add(issue.jiraKey);
        const labels = [...issue.jiraLabels].sort();
        const key = labels.length > 0 ? labels.join(' + ') : 'Sem label';
        const entry = densityByLabelCombo.get(key) ?? { labels, count: 0 };
        entry.count += 1;
        densityByLabelCombo.set(key, entry);
      }
    }

    // ── Taxa de sucesso × severidade ─────────────────────────────────────────
    // Por execução, bugs/melhorias distintos (dedupe só dentro da própria execução)
    // agrupados pela severidade real do Jira (jiraPriority).
    const severityByExecution = executions.map((execution) => {
      const seenInExecution = new Set<string>();
      const bySeverity = new Map<string, number>();
      for (const issue of this.issuesOf(execution)) {
        if (!issue.jiraKey || seenInExecution.has(issue.jiraKey)) continue;
        seenInExecution.add(issue.jiraKey);
        const severity = issue.jiraPriority ?? 'Sem severidade';
        bySeverity.set(severity, (bySeverity.get(severity) ?? 0) + 1);
      }
      return {
        executionId: execution.id,
        bySeverity: Array.from(bySeverity.entries()).map(([severity, count]) => ({ severity, count })),
      };
    });

    // ── Cobertura de requisitos + automação ──────────────────────────────────
    // Épico é conceito de projeto (não de quadro) — cobertura sempre no projeto
    // inteiro, mesmo que um board esteja selecionado no resto do dashboard.
    const suites = await this.prisma.suite.findMany({
      where: { projectId },
      select: { epicKey: true },
    });
    const epicsWithSuite = new Set(suites.map((s) => s.epicKey).filter((k): k is string => !!k));

    let totalEpics = 0;
    if (project.jiraProjectId !== MANUAL_PROJECT_JIRA_ID) {
      const epics = await this.jiraService.searchIssuesByProject(userId, project.jiraProjectKey, {
        type: 'Epic',
        all: true,
      });
      totalEpics = epics.total;
    }

    const [totalTestCases, automatedTestCases] = await Promise.all([
      this.prisma.testCase.count({ where: { suite: { projectId } } }),
      this.prisma.testCase.count({ where: { suite: { projectId }, automated: true } }),
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
      const issues: JiraIssueSummary[] = [];
      let page = 1;
      const pageSize = 100;
      // searchIssuesByBoard só pagina uma página por chamada (quem pagina normalmente é
      // o frontend) — laço aqui pra trazer todos os bugs do quadro, não só a 1ª página.
      while (true) {
        const result = await this.jiraService.searchIssuesByBoard(userId, board.jiraBoardId, {
          type: 'Bug',
          page,
          pageSize,
        });
        issues.push(...result.issues);
        if (result.issues.length === 0 || issues.length >= result.total) break;
        page += 1;
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

    const now = Date.now();
    const resolvedDurationsDays: number[] = [];
    const openAgesDays: number[] = [];
    const slaViolations: Array<{ key: string; link: string; priority?: string; ageDays: number }> = [];

    for (const bug of bugs) {
      if (!bug.created) continue;
      const createdMs = new Date(bug.created).getTime();
      if (bug.resolutiondate) {
        const resolvedMs = new Date(bug.resolutiondate).getTime();
        resolvedDurationsDays.push((resolvedMs - createdMs) / 86_400_000);
      } else {
        const ageDays = (now - createdMs) / 86_400_000;
        openAgesDays.push(ageDays);
        const slaDays = bug.priority ? SLA_DAYS_BY_PRIORITY[bug.priority] : undefined;
        if (slaDays !== undefined && ageDays > slaDays) {
          slaViolations.push({ key: bug.key, link: bug.link, priority: bug.priority, ageDays: Math.round(ageDays) });
        }
      }
    }

    const average = (values: number[]) =>
      values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

    return {
      mttrDays: average(resolvedDurationsDays),
      avgAgeDays: average(openAgesDays),
      openBugsCount: openAgesDays.length,
      resolvedBugsCount: resolvedDurationsDays.length,
      slaViolations: slaViolations.sort((a, b) => b.ageDays - a.ageDays),
    };
  }
}
