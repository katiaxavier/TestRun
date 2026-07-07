import { Module } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { JiraModule } from '../jira/jira.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [JiraModule, ProjectsModule],
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [BoardsService],
})
export class BoardsModule {}
