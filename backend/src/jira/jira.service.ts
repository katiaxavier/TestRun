import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

export interface JiraImportResult {
  suiteKey: string;
  suiteTitle: string;
  testCases: Array<{
    key: string;
    title: string;
    link: string;
  }>;
}

@Injectable()
export class JiraService {
  constructor(private readonly configService: ConfigService) {}

  private getAuthHeader(email: string, token: string): string {
    const creds = `${email}:${token}`;
    return `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  async testConnection(): Promise<boolean> {
    const config = this.configService.getJiraConfig();
    if (!config.url || !config.email || !config.token) {
      throw new HttpException(
        'Configurações do Jira incompletas. Por favor, configure a URL, e-mail e API Token.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const auth = this.getAuthHeader(config.email, config.token);
      // Fazer uma requisição simples de teste para obter informações do usuário atual
      const response = await fetch(`${config.url}/rest/api/3/myself`, {
        method: 'GET',
        headers: {
          Authorization: auth,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Jira connection test failed:', error);
      return false;
    }
  }

  async importSuite(suiteKey: string): Promise<JiraImportResult> {
    const config = this.configService.getJiraConfig();
    if (!config.url || !config.email || !config.token) {
      throw new HttpException(
        'Configurações do Jira incompletas. Por favor, configure a URL, e-mail e API Token.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const auth = this.getAuthHeader(config.email, config.token);
    const issueUrl = `${config.url}/rest/api/3/issue/${suiteKey}`;

    try {
      const response = await fetch(issueUrl, {
        method: 'GET',
        headers: {
          Authorization: auth,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException(
            `Suíte de teste com chave '${suiteKey}' não encontrada no Jira.`,
            HttpStatus.NOT_FOUND,
          );
        }
        throw new HttpException(
          `Erro ao consultar Jira (${response.statusText}). Verifique as credenciais.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const issueData = await response.json();
      const suiteTitle = issueData.fields?.summary || `Suíte ${suiteKey}`;

      const testCases: Array<{ key: string; title: string; link: string }> = [];

      // Buscar casos de teste vinculados por links de relacionamento
      const links = issueData.fields?.issuelinks || [];

      for (const link of links) {
        const type = link.type;
        const inward = type?.inward?.toLowerCase() || '';
        const outward = type?.outward?.toLowerCase() || '';
        const typeName = type?.name?.toLowerCase() || '';

        // O usuário informou que o relacionamento aparece como "is parent of"
        const isParentRelation =
          inward.includes('parent') ||
          outward.includes('parent') ||
          typeName.includes('parent') ||
          inward.includes('mãe') ||
          outward.includes('mãe') ||
          inward.includes('pai') ||
          outward.includes('pai');

        if (isParentRelation) {
          // Precisamos descobrir qual issue é a filha.
          // Se a relação externa do link indica "is parent of" do ponto de vista deste ticket (a suite),
          // então o outwardIssue é o filho.
          // Se a relação interna do link indica "is parent of" (o que significa que a suite é filha de outro?),
          // na verdade, dependendo de como o Jira registra, vamos olhar as duas pontas.
          // Vamos adicionar o ticket associado que não seja a própria suíte.
          
          let targetIssue = link.outwardIssue || link.inwardIssue;
          
          // Se o outward description for "is parent of", a issue de fora é a filha (test case).
          // Se o inward description for "is parent of", a issue de dentro (que é referenciada) é a filha.
          // Para garantir consistência com o que o Jira API retorna, vamos mapear:
          if (link.outwardIssue && (outward.includes('parent') || outward.includes('pai') || outward.includes('mãe'))) {
            targetIssue = link.outwardIssue;
          } else if (link.inwardIssue && (inward.includes('parent') || inward.includes('pai') || inward.includes('mãe'))) {
            targetIssue = link.inwardIssue;
          }

          if (targetIssue && targetIssue.key !== suiteKey) {
            testCases.push({
              key: targetIssue.key,
              title: targetIssue.fields?.summary || `Caso de Teste ${targetIssue.key}`,
              link: `${config.url}/browse/${targetIssue.key}`,
            });
          }
        }
      }

      // Se nenhum caso foi encontrado usando o filtro específico, vamos tentar recuperar qualquer link como fallback
      // caso o tipo de relacionamento não tenha o nome exato "parent".
      if (testCases.length === 0 && links.length > 0) {
        console.warn('Nenhum relacionamento do tipo "parent" identificado. Importando links disponíveis como fallback...');
        for (const link of links) {
          const targetIssue = link.outwardIssue || link.inwardIssue;
          if (targetIssue && targetIssue.key !== suiteKey) {
            testCases.push({
              key: targetIssue.key,
              title: targetIssue.fields?.summary || `Caso de Teste ${targetIssue.key}`,
              link: `${config.url}/browse/${targetIssue.key}`,
            });
          }
        }
      }

      return {
        suiteKey,
        suiteTitle,
        testCases,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error importing suite from Jira:', error);
      throw new HttpException(
        `Falha ao conectar com o Jira: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
