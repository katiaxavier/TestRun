import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { JiraModule } from '../jira/jira.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [JiraModule, ProjectsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
