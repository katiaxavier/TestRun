import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { JiraService } from './jira.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get('site')
  async getSite(@CurrentUser() user: User) {
    return { url: await this.jiraService.getSiteUrl(user.id) };
  }

  @Get('test')
  async testConnection(@CurrentUser() user: User) {
    const success = await this.jiraService.testConnection(user.id);
    if (!success) {
      throw new HttpException(
        'Falha na conexão com o Jira.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return {
      success: true,
      message: 'Conexão com o Jira estabelecida com sucesso!',
    };
  }

  @Post('import')
  async importSuite(@Body('key') key: string, @CurrentUser() user: User) {
    if (!key) {
      throw new HttpException(
        'A chave da suíte é obrigatória.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.jiraService.importSuite(user.id, key.trim().toUpperCase());
  }
}
