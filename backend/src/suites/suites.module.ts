import { Module } from '@nestjs/common';
import { SuitesService } from './suites.service';
import { SuitesController } from './suites.controller';
import { JiraModule } from '../jira/jira.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [JiraModule, ProjectsModule],
  providers: [SuitesService],
  controllers: [SuitesController],
  exports: [SuitesService],
})
export class SuitesModule {}
