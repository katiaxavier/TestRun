import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { BatchController } from './batch.controller';
import { ProjectsModule } from '../projects/projects.module';
import { JiraModule } from '../jira/jira.module';
import { SuitesModule } from '../suites/suites.module';

@Module({
  imports: [ProjectsModule, JiraModule, SuitesModule],
  providers: [ExecutionsService],
  controllers: [ExecutionsController, BatchController],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
