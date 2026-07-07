import { Module } from '@nestjs/common';
import { JiraService } from './jira.service';
import { JiraController } from './jira.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [JiraService],
  controllers: [JiraController],
  exports: [JiraService],
})
export class JiraModule {}
