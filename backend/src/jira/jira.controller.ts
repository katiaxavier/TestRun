import { Controller, Get, Post, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { JiraService } from './jira.service';

@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get('test')
  async testConnection() {
    const success = await this.jiraService.testConnection();
    if (!success) {
      throw new HttpException(
        'Falha na conexão com o Jira. Verifique a URL, usuário e API Token.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return { success: true, message: 'Conexão com o Jira estabelecida com sucesso!' };
  }

  @Post('import')
  async importSuite(@Body('key') key: string) {
    if (!key) {
      throw new HttpException('A chave da suíte é obrigatória.', HttpStatus.BAD_REQUEST);
    }
    return await this.jiraService.importSuite(key.trim().toUpperCase());
  }
}
