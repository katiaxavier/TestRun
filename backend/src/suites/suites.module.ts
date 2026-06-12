import { Module } from '@nestjs/common';
import { SuitesService } from './suites.service';
import { SuitesController } from './suites.controller';
import { JiraModule } from '../jira/jira.module';

@Module({
  imports: [JiraModule],
  providers: [SuitesService],
  controllers: [SuitesController],
  exports: [SuitesService],
})
export class SuitesModule {}
