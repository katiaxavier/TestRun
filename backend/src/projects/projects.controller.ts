import { Controller, Get } from '@nestjs/common';
import type { User } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.projectsService.listForUser(user.id);
  }
}
