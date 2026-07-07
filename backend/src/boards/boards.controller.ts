import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { BoardsService } from './boards.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { ProjectAccess } from '../projects/project-access.decorator';

@Controller('boards')
@UseGuards(ProjectAccessGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  @ProjectAccess('direct')
  async findAll(@Query('projectId') projectId: string, @CurrentUser() user: User) {
    return this.boardsService.listForProject(user.id, projectId);
  }
}
