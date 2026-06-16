import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { BatchController } from './batch.controller';

@Module({
  providers: [ExecutionsService],
  controllers: [ExecutionsController, BatchController],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
