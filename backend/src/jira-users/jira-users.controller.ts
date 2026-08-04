import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { JiraUsersService } from './jira-users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { ProjectAccess } from '../projects/project-access.decorator';

@Controller('jira-users')
@UseGuards(ProjectAccessGuard)
export class JiraUsersController {
  constructor(private readonly jiraUsersService: JiraUsersService) {}

  @Get('picker')
  @ProjectAccess('direct')
  async picker(
    @Query('projectId') projectId: string,
    @Query('search') search: string,
    @CurrentUser() user: User,
  ) {
    return this.jiraUsersService.searchForPicker(user.id, projectId, search);
  }
}
