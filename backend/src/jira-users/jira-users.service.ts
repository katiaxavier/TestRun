import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';

// ver MANUAL_PROJECT_JIRA_ID em boards.service.ts.
const MANUAL_PROJECT_JIRA_ID = 'manual';

@Injectable()
export class JiraUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
  ) {}

  async searchForPicker(userId: string, projectId: string, search: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpException('Projeto não encontrado.', HttpStatus.NOT_FOUND);
    }
    if (project.jiraProjectId === MANUAL_PROJECT_JIRA_ID) {
      return { data: [] };
    }
    if (!search || search.trim().length < 2) {
      return { data: [] };
    }

    const data = await this.jiraService.searchAssignableUsers(
      userId,
      project.jiraProjectKey,
      search.trim(),
    );
    return { data };
  }
}
