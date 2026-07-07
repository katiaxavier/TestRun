import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { JiraModule } from './jira/jira.module';
import { SuitesModule } from './suites/suites.module';
import { ExecutionsModule } from './executions/executions.module';
import { ReportsModule } from './reports/reports.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    JiraModule,
    ProjectsModule,
    SuitesModule,
    ExecutionsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
