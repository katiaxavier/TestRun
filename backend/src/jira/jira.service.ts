import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

export interface JiraImportResult {
  suiteKey: string;
  suiteTitle: string;
  testCases: Array<{
    key: string;
    title: string;
    link: string;
    priority?: string;
  }>;
}

@Injectable()
export class JiraService {
  constructor(private readonly authService: AuthService) {}

  private async authContext(userId: string) {
    const accessToken = await this.authService.getValidAccessToken(userId);
    const { cloudId, url } = await this.authService.resolveSite(accessToken);
    return {
      accessToken,
      siteUrl: url,
      apiBaseUrl: `https://api.atlassian.com/ex/jira/${cloudId}`,
    };
  }

  async getSiteUrl(userId: string): Promise<string> {
    const { siteUrl } = await this.authContext(userId);
    return siteUrl;
  }

  async listProjects(
    userId: string,
  ): Promise<Array<{ jiraProjectId: string; jiraProjectKey: string; name: string }>> {
    const { accessToken, apiBaseUrl } = await this.authContext(userId);

    const projects: Array<{ jiraProjectId: string; jiraProjectKey: string; name: string }> = [];
    let startAt = 0;
    let isLast = false;

    while (!isLast) {
      const response = await fetch(
        `${apiBaseUrl}/rest/api/3/project/search?startAt=${startAt}&maxResults=50`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        throw new HttpException(
          `Erro ao listar projetos do Jira (${response.statusText}).`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = await response.json();
      for (const project of data.values ?? []) {
        projects.push({
          jiraProjectId: project.id,
          jiraProjectKey: project.key,
          name: project.name,
        });
      }

      isLast = data.isLast ?? true;
      startAt += data.values?.length ?? 0;
    }

    return projects;
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      const { accessToken, apiBaseUrl } = await this.authContext(userId);
      const response = await fetch(`${apiBaseUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Jira connection test failed:', error);
      return false;
    }
  }

  async fetchIssue(
    userId: string,
    key: string,
  ): Promise<{ key: string; title: string; link: string; priority?: string }> {
    const { accessToken, apiBaseUrl, siteUrl } = await this.authContext(userId);

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}/rest/api/3/issue/${key}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
    } catch (error) {
      throw new HttpException(
        `Falha ao conectar com o Jira: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new HttpException(`Issue '${key}' não encontrada no Jira.`, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Erro ao consultar Jira (${response.statusText}).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await response.json();
    return {
      key,
      title: data.fields?.summary || key,
      link: `${siteUrl}/browse/${key}`,
      priority: data.fields?.priority?.name,
    };
  }

  async importSuite(userId: string, suiteKey: string): Promise<JiraImportResult> {
    const { accessToken, apiBaseUrl, siteUrl } = await this.authContext(userId);
    const issueUrl = `${apiBaseUrl}/rest/api/3/issue/${suiteKey}`;

    try {
      const response = await fetch(issueUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException(
            `Suíte de teste com chave '${suiteKey}' não encontrada no Jira.`,
            HttpStatus.NOT_FOUND,
          );
        }
        throw new HttpException(
          `Erro ao consultar Jira (${response.statusText}).`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const issueData = await response.json();
      const suiteTitle = issueData.fields?.summary || `Suíte ${suiteKey}`;

      const testCases: Array<{ key: string; title: string; link: string; priority?: string }> = [];

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
          if (
            link.outwardIssue &&
            (outward.includes('parent') ||
              outward.includes('pai') ||
              outward.includes('mãe'))
          ) {
            targetIssue = link.outwardIssue;
          } else if (
            link.inwardIssue &&
            (inward.includes('parent') ||
              inward.includes('pai') ||
              inward.includes('mãe'))
          ) {
            targetIssue = link.inwardIssue;
          }

if (targetIssue && targetIssue.key !== suiteKey) {
             testCases.push({
               key: targetIssue.key,
               title:
                 targetIssue.fields?.summary ||
                 `Caso de Teste ${targetIssue.key}`,
               link: `${siteUrl}/browse/${targetIssue.key}`,
               priority: targetIssue.fields?.priority?.name,
             });
           }
        }
      }

// Se nenhum caso foi encontrado usando o filtro específico, vamos tentar recuperar qualquer link como fallback
       // caso o tipo de relacionamento não tenha o nome exato "parent".
       if (testCases.length === 0 && links.length > 0) {
         console.warn(
           'Nenhum relacionamento do tipo "parent" identificado. Importando links disponíveis como fallback...',
         );
         for (const link of links) {
           const targetIssue = link.outwardIssue || link.inwardIssue;
           if (targetIssue && targetIssue.key !== suiteKey) {
             testCases.push({
               key: targetIssue.key,
               title:
                 targetIssue.fields?.summary ||
                 `Caso de Teste ${targetIssue.key}`,
               link: `${siteUrl}/browse/${targetIssue.key}`,
               priority: targetIssue.fields?.priority?.name,
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
