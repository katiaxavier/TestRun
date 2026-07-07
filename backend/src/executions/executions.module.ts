import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { BatchController } from './batch.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  providers: [ExecutionsService],
  controllers: [ExecutionsController, BatchController],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
