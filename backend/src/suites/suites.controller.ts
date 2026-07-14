import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { SuitesService } from './suites.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { ProjectAccess } from '../projects/project-access.decorator';

@Controller('suites')
@UseGuards(ProjectAccessGuard)
export class SuitesController {
  constructor(private readonly suitesService: SuitesService) {}

  @Get()
  @ProjectAccess('direct')
  async findAll(@Query('projectId') projectId?: string, @Query('boardId') boardId?: string) {
    return this.suitesService.findAll(projectId, boardId);
  }

  @Get(':id')
  @ProjectAccess('suite', 'id')
  async findOne(@Param('id') id: string) {
    return this.suitesService.findOne(id);
  }

  @Post()
  @ProjectAccess('direct')
  async createManual(
    @Body('title') title: string,
    @Body('projectId') projectId: string,
    @Body('boardId') boardId: string | undefined,
  ) {
    if (!title?.trim()) {
      throw new HttpException('O título da suíte é obrigatório.', HttpStatus.BAD_REQUEST);
    }
    if (!projectId) {
      throw new HttpException('O projeto é obrigatório.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.createManual(title.trim(), projectId, boardId);
  }

  @Post('sync')
  @ProjectAccess('board', 'boardId', 'body')
  async syncBoard(@Body('boardId') boardId: string, @CurrentUser() user: User) {
    if (!boardId) {
      throw new HttpException('O quadro é obrigatório.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.syncBoardSuites(user.id, boardId);
  }

  @Post('import')
  @ProjectAccess('direct')
  async importSuite(
    @Body('jiraKey') jiraKey: string,
    @Body('projectId') projectId: string,
    @Body('boardId') boardId: string | undefined,
    @CurrentUser() user: User,
  ) {
    if (!jiraKey) {
      throw new HttpException(
        'A chave do Jira é obrigatória.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!projectId) {
      throw new HttpException('O projeto é obrigatório.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.importFromJira(jiraKey, user.id, projectId, boardId);
  }

  @Post(':id/test-cases')
  @ProjectAccess('suite', 'id')
  async addTestCase(
    @Param('id') suiteId: string,
    @Body('jiraKey') jiraKey: string,
    @CurrentUser() user: User,
  ) {
    if (!jiraKey?.trim()) {
      throw new HttpException('A chave do Jira é obrigatória.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.addTestCase(suiteId, jiraKey, user.id);
  }

  @Post('test-cases/:tcId/scenarios')
  @ProjectAccess('testCase', 'tcId')
  async addScenarioTemplate(@Param('tcId') tcId: string, @Body('name') name: string) {
    if (!name?.trim()) {
      throw new HttpException('O nome do cenário é obrigatório.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.addScenarioTemplate(tcId, name.trim());
  }

  @Post('test-cases/:tcId/scenarios/batch')
  @ProjectAccess('testCase', 'tcId')
  async addScenarioTemplateBatch(@Param('tcId') tcId: string, @Body('names') names: string[]) {
    if (!names || names.length === 0) {
      throw new HttpException('Nenhum nome de cenário fornecido.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.addScenarioTemplateBatch(tcId, names);
  }

  @Delete(':id')
  @ProjectAccess('suite', 'id')
  async deleteSuite(@Param('id') id: string) {
    return this.suitesService.deleteSuite(id);
  }

  @Patch('test-cases/:id')
  @ProjectAccess('testCase', 'id')
  async updateTestCase(@Param('id') id: string, @Body('automated') automated: boolean) {
    return this.suitesService.updateTestCase(id, { automated });
  }

  @Delete('test-cases/:id')
  @ProjectAccess('testCase', 'id')
  async deleteTestCase(@Param('id') id: string) {
    return this.suitesService.deleteTestCase(id);
  }

  @Delete('test-cases/scenarios/:templateId')
  @ProjectAccess('scenarioTemplate', 'templateId')
  async deleteScenarioTemplate(@Param('templateId') templateId: string) {
    return this.suitesService.deleteScenarioTemplate(templateId);
  }
}
