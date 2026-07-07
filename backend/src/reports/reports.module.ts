import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { JiraModule } from '../jira/jira.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [JiraModule, ProjectsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
