import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

const MEMBERSHIP_TTL_MS = 15 * 60 * 1000;

// Sentinela criado por backend/scripts/backfill-projects.ts para suítes manuais
// (sem projeto real no Jira). Nunca aparece em project/search, então nunca ganha
// ProjectMembership pelo fluxo normal — liberado para qualquer usuário autenticado.
const MANUAL_PROJECT_JIRA_ID = 'manual';

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async hasAccess(userId: string, projectId: string): Promise<boolean> {
    const membership = await this.prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (membership && Date.now() - membership.lastCheckedAt.getTime() < MEMBERSHIP_TTL_MS) {
      return true;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { jiraProjectId: true },
    });
    if (project?.jiraProjectId === MANUAL_PROJECT_JIRA_ID) {
      return true;
    }

    // Sem cache ou expirado: revalida contra o Jira. Reaproveita o resync completo
    // de ProjectsService (upserta Project + ProjectMembership com lastCheckedAt atual).
    try {
      const projects = await this.projectsService.listForUser(userId);
      return projects.some((p) => p.id === projectId);
    } catch {
      // Jira indisponível: não derruba quem já tinha acesso confirmado antes.
      return !!membership;
    }
  }

  async resolveSuiteProject(suiteId: string): Promise<string | null> {
    const suite = await this.prisma.suite.findUnique({
      where: { id: suiteId },
      select: { projectId: true },
    });
    return suite?.projectId ?? null;
  }

  async resolveTestCaseProject(testCaseId: string): Promise<string | null> {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      select: { suite: { select: { projectId: true } } },
    });
    return testCase?.suite.projectId ?? null;
  }

  async resolveScenarioTemplateProject(templateId: string): Promise<string | null> {
    const template = await this.prisma.testCaseScenario.findUnique({
      where: { id: templateId },
      select: { testCase: { select: { suite: { select: { projectId: true } } } } },
    });
    return template?.testCase.suite.projectId ?? null;
  }

  async resolveBatchProject(batchId: string): Promise<string | null> {
    const batch = await this.prisma.executionBatch.findUnique({
      where: { id: batchId },
      select: { projectId: true },
    });
    return batch?.projectId ?? null;
  }

  async resolveBoardProject(boardId: string): Promise<string | null> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { projectId: true },
    });
    return board?.projectId ?? null;
  }

  async resolveExecutionProject(executionId: string): Promise<string | null> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      select: {
        suite: { select: { projectId: true } },
        batch: { select: { projectId: true } },
      },
    });
    return execution?.suite?.projectId ?? execution?.batch?.projectId ?? null;
  }
}
