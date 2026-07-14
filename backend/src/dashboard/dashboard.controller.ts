import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { ProjectAccess } from '../projects/project-access.decorator';

@Controller('dashboard')
@UseGuards(ProjectAccessGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('quality')
  @ProjectAccess('direct')
  async getQuality(
    @Query('projectId') projectId: string,
    @Query('boardId') boardId: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getQuality(user.id, projectId, boardId);
  }

  @Get('efficiency')
  @ProjectAccess('direct')
  async getEfficiency(
    @Query('projectId') projectId: string,
    @Query('boardId') boardId: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getEfficiency(user.id, projectId, boardId);
  }
}
