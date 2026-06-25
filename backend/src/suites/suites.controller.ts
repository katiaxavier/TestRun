import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SuitesService } from './suites.service';

@Controller('suites')
export class SuitesController {
  constructor(private readonly suitesService: SuitesService) {}

  @Get()
  async findAll() {
    return this.suitesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.suitesService.findOne(id);
  }

  @Post()
  async createManual(@Body('title') title: string) {
    if (!title?.trim()) {
      throw new HttpException('O título da suíte é obrigatório.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.createManual(title.trim());
  }

  @Post('import')
  async importSuite(@Body('jiraKey') jiraKey: string) {
    if (!jiraKey) {
      throw new HttpException(
        'A chave do Jira é obrigatória.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.suitesService.importFromJira(jiraKey);
  }

  @Post(':id/test-cases')
  async addTestCase(@Param('id') suiteId: string, @Body('jiraKey') jiraKey: string) {
    if (!jiraKey?.trim()) {
      throw new HttpException('A chave do Jira é obrigatória.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.addTestCase(suiteId, jiraKey);
  }

  @Post('test-cases/:tcId/scenarios')
  async addScenarioTemplate(@Param('tcId') tcId: string, @Body('name') name: string) {
    if (!name?.trim()) {
      throw new HttpException('O nome do cenário é obrigatório.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.addScenarioTemplate(tcId, name.trim());
  }

  @Post('test-cases/:tcId/scenarios/batch')
  async addScenarioTemplateBatch(@Param('tcId') tcId: string, @Body('names') names: string[]) {
    if (!names || names.length === 0) {
      throw new HttpException('Nenhum nome de cenário fornecido.', HttpStatus.BAD_REQUEST);
    }
    return this.suitesService.addScenarioTemplateBatch(tcId, names);
  }

  @Delete(':id')
  async deleteSuite(@Param('id') id: string) {
    return this.suitesService.deleteSuite(id);
  }

  @Delete('test-cases/:id')
  async deleteTestCase(@Param('id') id: string) {
    return this.suitesService.deleteTestCase(id);
  }

  @Delete('test-cases/scenarios/:templateId')
  async deleteScenarioTemplate(@Param('templateId') templateId: string) {
    return this.suitesService.deleteScenarioTemplate(templateId);
  }
}
