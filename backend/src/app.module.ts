import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { JiraModule } from './jira/jira.module';
import { SuitesModule } from './suites/suites.module';
import { ExecutionsModule } from './executions/executions.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JiraModule,
    SuitesModule,
    ExecutionsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
