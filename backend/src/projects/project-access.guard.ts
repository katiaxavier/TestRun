import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@prisma/client';
import { PROJECT_ACCESS_KEY, ProjectAccessMeta } from './project-access.decorator';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<ProjectAccessMeta | undefined>(
      PROJECT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    if (!user) {
      throw new UnauthorizedException('Não autenticado.');
    }

    const projectId = await this.resolveProjectId(meta, request);
    const allowed = await this.projectAccess.hasAccess(user.id, projectId);
    if (!allowed) {
      throw new ForbiddenException('Você não tem acesso a este projeto.');
    }
    return true;
  }

  private async resolveProjectId(meta: ProjectAccessMeta, request: any): Promise<string> {
    if (meta.resource === 'direct') {
      const projectId = request.body?.projectId || request.query?.projectId;
      if (!projectId) {
        throw new BadRequestException('O projeto é obrigatório.');
      }
      return projectId;
    }

    if (meta.resource === 'execution') {
      const executionId = request.params?.executionId ?? request.params?.id;
      if (!executionId) {
        throw new NotFoundException('Ciclo de execução não encontrado.');
      }
      const projectId = await this.projectAccess.resolveExecutionProject(executionId);
      if (!projectId) throw new NotFoundException('Ciclo de execução não encontrado.');
      return projectId;
    }

    const source = meta.source === 'body' ? request.body : request.params;
    const resourceId = source?.[meta.param!];
    if (!resourceId) {
      throw new NotFoundException('Recurso não encontrado.');
    }

    const projectId = await (() => {
      switch (meta.resource) {
        case 'suite':
          return this.projectAccess.resolveSuiteProject(resourceId);
        case 'testCase':
          return this.projectAccess.resolveTestCaseProject(resourceId);
        case 'scenarioTemplate':
          return this.projectAccess.resolveScenarioTemplateProject(resourceId);
        case 'batch':
          return this.projectAccess.resolveBatchProject(resourceId);
      }
    })();

    if (!projectId) {
      throw new NotFoundException('Recurso não encontrado.');
    }
    return projectId;
  }
}
