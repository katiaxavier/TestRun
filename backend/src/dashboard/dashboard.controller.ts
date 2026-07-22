import { Body, Controller, Delete, Get, Put, Query, UseGuards } from '@nestjs/common';
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

  @Get('sla-config')
  @ProjectAccess('direct')
  async getSlaConfig(
    @Query('projectId') projectId: string,
    @Query('boardId') boardId: string | undefined,
  ) {
    return this.dashboardService.getSlaConfig(projectId, boardId);
  }

  @Put('sla-config')
  @ProjectAccess('direct')
  async updateSlaConfig(
    @Body('projectId') projectId: string,
    @Body('boardId') boardId: string | undefined,
    @Body('slaDays') slaDays: Record<string, number>,
  ) {
    return this.dashboardService.updateSlaConfig(projectId, boardId, slaDays);
  }

  @Delete('sla-config')
  @ProjectAccess('direct')
  async resetSlaConfig(
    @Query('projectId') projectId: string,
    @Query('boardId') boardId: string | undefined,
  ) {
    return this.dashboardService.resetSlaConfig(projectId, boardId);
  }
}
