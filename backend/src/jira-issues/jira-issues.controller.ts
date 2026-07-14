import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { JiraIssuesService } from './jira-issues.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { ProjectAccess } from '../projects/project-access.decorator';

@Controller('jira-issues')
@UseGuards(ProjectAccessGuard)
export class JiraIssuesController {
  constructor(private readonly jiraIssuesService: JiraIssuesService) {}

  @Get()
  @ProjectAccess('direct')
  async list(
    @Query('projectId') projectId: string,
    @Query('boardId') boardId: string,
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.jiraIssuesService.listByBoard(user.id, projectId, boardId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      type,
      status,
      priority,
      search,
    });
  }

  @Get('filters')
  @ProjectAccess('direct')
  async filters(@Query('projectId') projectId: string, @CurrentUser() user: User) {
    return this.jiraIssuesService.listFilters(user.id, projectId);
  }

  @Get('picker')
  @ProjectAccess('direct')
  async picker(
    @Query('projectId') projectId: string,
    @Query('type') type: 'Bug' | 'Improvement' | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.jiraIssuesService.searchForPicker(user.id, projectId, { type, search });
  }
}
