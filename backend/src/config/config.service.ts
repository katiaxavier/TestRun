import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export class JiraConfig {
  url!: string;
  email!: string;
  token!: string;
}

@Injectable()
export class ConfigService {
  private readonly configPath = path.resolve(process.cwd(), 'config.json');

  private readConfig(): { jira: JiraConfig } {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error('Error reading config.json:', error);
    }
    return { jira: { url: '', email: '', token: '' } };
  }

  private writeConfig(config: { jira: JiraConfig }) {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf8',
      );
    } catch (error) {
      console.error('Error writing config.json:', error);
      throw new Error('Failed to save configuration locally.');
    }
  }

  getJiraConfig(): JiraConfig {
    return this.readConfig().jira;
  }

  saveJiraConfig(config: JiraConfig): void {
    // Normalizar a URL do Jira para garantir que não tenha barra no final
    let normalizedUrl = config.url.trim();
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }

    const current = this.readConfig();
    current.jira = {
      url: normalizedUrl,
      email: config.email.trim(),
      token: config.token.trim(),
    };
    this.writeConfig(current);
  }
}
