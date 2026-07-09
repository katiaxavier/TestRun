import { Module } from '@nestjs/common';
import { JiraIssuesService } from './jira-issues.service';
import { JiraIssuesController } from './jira-issues.controller';
import { JiraModule } from '../jira/jira.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [JiraModule, ProjectsModule],
  providers: [JiraIssuesService],
  controllers: [JiraIssuesController],
})
export class JiraIssuesModule {}
