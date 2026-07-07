import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';

// Mesmo sentinela criado por backend/scripts/backfill-projects.ts para suítes manuais
// (sem projeto real no Jira) — não tem quadros, não faz sentido chamar a API do Jira.
const MANUAL_PROJECT_JIRA_ID = 'manual';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
  ) {}

  async listForProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpException('Projeto não encontrado.', HttpStatus.NOT_FOUND);
    }

    if (project.jiraProjectId === MANUAL_PROJECT_JIRA_ID) {
      return { boards: [], hasUnassignedSuites: false };
    }

    const jiraBoards = await this.jiraService.listBoards(userId, project.jiraProjectKey);

    const boards = await Promise.all(
      jiraBoards.map((jb) =>
        this.prisma.board.upsert({
          where: { jiraBoardId: jb.jiraBoardId },
          update: { name: jb.name, type: jb.type, projectId },
          create: { jiraBoardId: jb.jiraBoardId, name: jb.name, type: jb.type, projectId },
        }),
      ),
    );

    const unassignedCount = await this.prisma.suite.count({
      where: { projectId, boards: { none: {} } },
    });

    return {
      boards: boards.sort((a, b) => a.name.localeCompare(b.name)),
      hasUnassignedSuites: unassignedCount > 0,
    };
  }
}
