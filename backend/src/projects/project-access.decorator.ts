import { SetMetadata } from '@nestjs/common';

export type ProjectResourceType =
  | 'direct'
  | 'suite'
  | 'testCase'
  | 'scenarioTemplate'
  | 'batch'
  | 'execution';

export interface ProjectAccessMeta {
  resource: ProjectResourceType;
  param?: string;
  source?: 'params' | 'body';
}

export const PROJECT_ACCESS_KEY = 'projectAccess';

/**
 * Anota uma rota para ser checada pelo ProjectAccessGuard.
 * - 'direct': lê projectId de query/body diretamente (rotas de listagem/criação).
 * - 'suite' | 'testCase' | 'scenarioTemplate' | 'batch': resolve o projeto a partir
 *   do id do recurso (param, ou body quando source='body').
 * - 'execution': resolve via :executionId ou :id da rota (todas as rotas de
 *   ExecutionsController/relatórios de execução seguem esse padrão).
 */
export const ProjectAccess = (
  resource: ProjectResourceType,
  param?: string,
  source: 'params' | 'body' = 'params',
) => SetMetadata(PROJECT_ACCESS_KEY, { resource, param, source } as ProjectAccessMeta);
