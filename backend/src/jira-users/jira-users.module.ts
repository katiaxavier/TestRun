import { Module } from '@nestjs/common';
import { JiraUsersService } from './jira-users.service';
import { JiraUsersController } from './jira-users.controller';
import { JiraModule } from '../jira/jira.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [JiraModule, ProjectsModule],
  providers: [JiraUsersService],
  controllers: [JiraUsersController],
})
export class JiraUsersModule {}
