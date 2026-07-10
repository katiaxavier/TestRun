import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';

// Mesmo sentinela do backfill de projetos (suítes manuais, sem projeto real no Jira) —
// ver MANUAL_PROJECT_JIRA_ID em boards.service.ts.
const MANUAL_PROJECT_JIRA_ID = 'manual';

@Injectable()
export class JiraIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
  ) {}

  // Sem "Sem quadro" aqui: diferente de execuções/lotes (que podem ter boardId nulo no
  // Postgres), esta tela sempre consulta um quadro real no Jira via jiraBoardId.
  async listByBoard(
    userId: string,
    projectId: string,
    boardId: string,
    opts: {
      page?: number;
      pageSize?: number;
      type?: string;
      status?: string;
      priority?: string;
      search?: string;
    } = {},
  ) {
    if (!boardId || boardId === 'none') {
      throw new HttpException(
        'Selecione um quadro real do Jira para ver bugs e melhorias (não disponível para "Sem quadro").',
        HttpStatus.BAD_REQUEST,
      );
    }

    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board || board.projectId !== projectId) {
      throw new HttpException('Quadro não encontrado.', HttpStatus.NOT_FOUND);
    }

    const result = await this.jiraService.searchIssuesByBoard(userId, board.jiraBoardId, opts);

    return {
      data: result.issues,
      total: result.total,
      page: Math.floor(result.startAt / result.maxResults) + 1,
      pageSize: result.maxResults,
    };
  }

  // Busca usada pelo picker de vínculo de bug/melhoria (ExecutionRunPage.tsx) — projeto
  // inteiro, não escopada a um quadro (uma Suíte pode ter 0/N boards, então não há um
  // boardId único e confiável disponível ali). Página pequena, sem paginação de UI.
  async searchForPicker(
    userId: string,
    projectId: string,
    opts: { type?: 'Bug' | 'Improvement'; search?: string } = {},
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpException('Projeto não encontrado.', HttpStatus.NOT_FOUND);
    }
    if (project.jiraProjectId === MANUAL_PROJECT_JIRA_ID) {
      return { data: [] };
    }
    const result = await this.jiraService.searchIssuesByProject(userId, project.jiraProjectKey, {
      type: opts.type,
      search: opts.search,
      pageSize: 8,
    });
    return { data: result.issues };
  }

  // Opções pros três filtros da tela: tipo é fixo (só Bug/Improvement existem nesta
  // busca), status/priority vêm do Jira (workflow por projeto / lista global do site).
  async listFilters(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpException('Projeto não encontrado.', HttpStatus.NOT_FOUND);
    }

    if (project.jiraProjectId === MANUAL_PROJECT_JIRA_ID) {
      return {
        types: [
          { value: 'Bug', label: 'Bug' },
          { value: 'Improvement', label: 'Melhoria' },
        ],
        statuses: [],
        priorities: [],
      };
    }

    const [statuses, priorities] = await Promise.all([
      this.jiraService.listIssueStatuses(userId, project.jiraProjectKey),
      this.jiraService.listIssuePriorities(userId),
    ]);

    return {
      types: [
        { value: 'Bug', label: 'Bug' },
        { value: 'Improvement', label: 'Melhoria' },
      ],
      statuses,
      priorities,
    };
  }
}
