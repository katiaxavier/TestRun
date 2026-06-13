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

  @Delete(':id')
  async deleteSuite(@Param('id') id: string) {
    return this.suitesService.deleteSuite(id);
  }

  @Delete('test-cases/:id')
  async deleteTestCase(@Param('id') id: string) {
    return this.suitesService.deleteTestCase(id);
  }
}
