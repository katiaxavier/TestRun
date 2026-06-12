import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService, JiraConfig } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig() {
    const config = this.configService.getJiraConfig();
    return {
      url: config.url,
      email: config.email,
      // Retorna o token como está, já que é uma aplicação 100% local
      token: config.token,
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  saveConfig(@Body() body: JiraConfig) {
    this.configService.saveJiraConfig(body);
    return { message: 'Configuração salva com sucesso!' };
  }
}
