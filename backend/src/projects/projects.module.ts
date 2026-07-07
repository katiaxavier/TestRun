import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectAccessService } from './project-access.service';
import { ProjectAccessGuard } from './project-access.guard';
import { JiraModule } from '../jira/jira.module';

@Module({
  imports: [JiraModule],
  providers: [ProjectsService, ProjectAccessService, ProjectAccessGuard],
  controllers: [ProjectsController],
  exports: [ProjectsService, ProjectAccessService, ProjectAccessGuard],
})
export class ProjectsModule {}
