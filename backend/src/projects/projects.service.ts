import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jiraService: JiraService,
  ) {}

  async listForUser(userId: string) {
    const jiraProjects = await this.jiraService.listProjects(userId);

    const projects = await Promise.all(
      jiraProjects.map(async (jp) => {
        const project = await this.prisma.project.upsert({
          where: { jiraProjectId: jp.jiraProjectId },
          update: { jiraProjectKey: jp.jiraProjectKey, name: jp.name },
          create: {
            jiraProjectId: jp.jiraProjectId,
            jiraProjectKey: jp.jiraProjectKey,
            name: jp.name,
          },
        });

        await this.prisma.projectMembership.upsert({
          where: { userId_projectId: { userId, projectId: project.id } },
          update: { lastCheckedAt: new Date() },
          create: { userId, projectId: project.id },
        });

        return project;
      }),
    );

    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }
}
