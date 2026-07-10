import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

export interface JiraImportResult {
  suiteKey: string;
  suiteTitle: string;
  epicKey?: string;
  epicSummary?: string;
  testCases: Array<{
    key: string;
    title: string;
    link: string;
    priority?: string;
  }>;
}

export interface JiraIssueSummary {
  key: string;
  summary: string;
  status: string;
  // Categoria padrão do Jira (new/indeterminate/done) — independe de idioma/nome de
  // status customizado, ao contrário de comparar o texto de `status` diretamente.
  statusCategory?: string;
  issuetype: string;
  priority?: string;
  labels?: string[];
  created: string;
  updated: string;
  resolutiondate?: string;
  assignee?: string;
  link: string;
}

export interface JiraIssuePage {
  issues: JiraIssueSummary[];
  total: number;
  startAt: number;
  maxResults: number;
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

  // Escapa aspas duplas e barra invertida antes de interpolar um valor não confiável
  // (query string) dentro de um literal JQL — usado por filtros de status/priority/busca.
  private escapeJql(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  // `text ~` (full-text) não pesquisa o campo `key` — buscar "PD-20790" com `text ~`
  // não acha a issue PD-20790 (o hífen/números não batem como texto livre). Se o termo
  // parece uma chave de issue (LETRAS-NÚMEROS), busca por `key =` (exata); senão, cai
  // no full-text de sempre.
  private buildSearchClause(search: string): string {
    const trimmed = search.trim();
    const looksLikeKey = /^[A-Za-z][A-Za-z0-9]*-\d+$/.test(trimmed);
    return looksLikeKey
      ? `key = "${this.escapeJql(trimmed.toUpperCase())}"`
      : `text ~ "${this.escapeJql(trimmed)}*"`;
  }

  // Retenta em 429 respeitando o header Retry-After (com backoff exponencial como
  // fallback) — usado principalmente pela sincronização em lote (Fase 4), que faz
  // várias chamadas seguidas e é o cenário mais provável de esbarrar em rate limit.
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retries = 3,
  ): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, init);
      if (response.status !== 429 || attempt >= retries) {
        return response;
      }
      const retryAfter = Number(response.headers.get('Retry-After'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
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
      const response = await this.fetchWithRetry(
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

  // Lista os quadros (boards) de um projeto — /rest/agile/1.0/board, paginação clássica
  // (startAt/total/isLast, igual project/search). Exige os escopos granulares
  // read:board-scope:jira-software + read:project:jira (além do read:issue-details:jira
  // usado por searchSuitesByBoard), configurados no console da Atlassian.
  async listBoards(
    userId: string,
    jiraProjectKey: string,
  ): Promise<Array<{ jiraBoardId: string; name: string; type: string }>> {
    const { accessToken, apiBaseUrl } = await this.authContext(userId);

    const boards: Array<{ jiraBoardId: string; name: string; type: string }> = [];
    let startAt = 0;
    let isLast = false;

    while (!isLast) {
      const response = await this.fetchWithRetry(
        `${apiBaseUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(jiraProjectKey)}&startAt=${startAt}&maxResults=50`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        throw new HttpException(
          `Erro ao listar quadros do projeto no Jira (${response.statusText}).`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = await response.json();
      for (const board of data.values ?? []) {
        boards.push({ jiraBoardId: String(board.id), name: board.name, type: board.type });
      }

      isLast = data.isLast ?? true;
      startAt += data.values?.length ?? 0;
    }

    return boards;
  }

  // Busca, via JQL, as chaves de todas as issues do tipo "Test Suite" em um quadro —
  // usado pela sincronização em lote (Fase 4) para descobrir suítes automaticamente.
  // /rest/agile/1.0/board/{id}/issue tem paginação clássica (startAt/total), diferente
  // do /rest/api/3/search/jql usado em outros pontos deste serviço.
  async searchSuitesByBoard(userId: string, jiraBoardId: string): Promise<string[]> {
    const { accessToken, apiBaseUrl } = await this.authContext(userId);
    const jql = 'issuetype = "Test Suite" ORDER BY key ASC';

    const keys: string[] = [];
    let startAt = 0;

    while (true) {
      const url =
        `${apiBaseUrl}/rest/agile/1.0/board/${jiraBoardId}/issue` +
        `?jql=${encodeURIComponent(jql)}&fields=key&startAt=${startAt}&maxResults=50`;
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new HttpException(
          `Erro ao buscar suítes do quadro no Jira (${response.statusText}).`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = await response.json();
      const issues = data.issues ?? [];
      for (const issue of issues) keys.push(issue.key);

      startAt += issues.length;
      if (issues.length === 0 || startAt >= (data.total ?? 0)) break;
    }

    return keys;
  }

  // Busca, via JQL, as issues do tipo Bug/Improvement em um quadro — tela "Bugs e
  // Melhorias" (lida direto do Jira, sem persistir no Postgres). "Melhoria" (nome em
  // PT) não existe como issuetype neste site (confirmado via erro real do Jira:
  // "O valor 'Melhoria' não existe para o campo 'issuetype'") — o site usa o nome
  // padrão em inglês "Improvement" mesmo. Se outro site/projeto usar um nome
  // diferente pra melhoria, essa lista precisa ser ajustada por site, não é universal.
  // Paginação clássica startAt/maxResults, mas aqui uma página por chamada (quem pagina
  // é o frontend), diferente do loop "buscar tudo" de searchSuitesByBoard.
  async searchIssuesByBoard(
    userId: string,
    jiraBoardId: string,
    opts: {
      page?: number;
      pageSize?: number;
      type?: string;
      status?: string;
      priority?: string;
      search?: string;
    } = {},
  ): Promise<JiraIssuePage> {
    const { accessToken, apiBaseUrl, siteUrl } = await this.authContext(userId);

    const clauses: string[] = [];
    clauses.push(opts.type ? `issuetype = "${opts.type}"` : 'issuetype in ("Bug", "Improvement")');
    if (opts.status) {
      // status vem como ID (não nome) do frontend — ver comentário em listIssueStatuses
      // sobre por que nome não é confiável pro JQL. Filtra só dígitos por segurança
      // (o ID nunca deveria ter outra coisa) antes de interpolar sem aspas no JQL.
      const statusId = opts.status.replace(/[^0-9]/g, '');
      if (statusId) clauses.push(`status = ${statusId}`);
    }
    if (opts.priority) {
      // priority também vem como ID do frontend — mesmo motivo do status acima.
      const priorityId = opts.priority.replace(/[^0-9]/g, '');
      if (priorityId) clauses.push(`priority = ${priorityId}`);
    }
    if (opts.search) clauses.push(this.buildSearchClause(opts.search));
    const jql = `${clauses.join(' AND ')} ORDER BY key DESC`;

    const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
    const page = Math.max(opts.page ?? 1, 1);
    const startAt = (page - 1) * pageSize;

    const fields = 'key,summary,status,issuetype,priority,labels,created,updated,assignee,resolutiondate';
    const url =
      `${apiBaseUrl}/rest/agile/1.0/board/${jiraBoardId}/issue` +
      `?jql=${encodeURIComponent(jql)}&fields=${fields}&startAt=${startAt}&maxResults=${pageSize}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new HttpException(
        `Erro ao buscar issues (bugs/melhorias) do quadro no Jira (${response.statusText}): ${body}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await response.json();
    const issues: JiraIssueSummary[] = (data.issues ?? []).map((issue: any) => ({
      key: issue.key,
      summary: issue.fields?.summary || issue.key,
      status: issue.fields?.status?.name || '—',
      statusCategory: issue.fields?.status?.statusCategory?.key,
      issuetype: issue.fields?.issuetype?.name || '—',
      priority: issue.fields?.priority?.name,
      labels: issue.fields?.labels ?? [],
      created: issue.fields?.created,
      updated: issue.fields?.updated,
      resolutiondate: issue.fields?.resolutiondate ?? undefined,
      assignee: issue.fields?.assignee?.displayName,
      link: `${siteUrl}/browse/${issue.key}`,
    }));

    return { issues, total: data.total ?? issues.length, startAt, maxResults: pageSize };
  }

  // Busca issues por projeto inteiro (não escopado a um quadro) via a API de busca
  // aprimorada do Jira (/rest/api/3/search/jql — a clássica /rest/api/3/search foi
  // desativada pela Atlassian, ver CHANGE-2046). Paginação por `nextPageToken`, não
  // por `startAt`/`total` (a API nova não devolve contagem total). Necessário porque
  // nem ExecutionRunPage.tsx nem o form de Suíte têm um boardId único e confiável (uma
  // Suíte pode ter 0, N boards) — o picker de bug/melhoria e a listagem de
  // Épicos/MTTR precisam buscar no projeto todo. Com `all: true`, pagina em loop até
  // esgotar (usado para listar todos os Épicos do projeto e todos os bugs para MTTR) —
  // `total` no retorno é a contagem real só quando `all: true`; sem `all`, é só a
  // quantidade trazida na página (usado pelo picker, que já limita por `search`).
  async searchIssuesByProject(
    userId: string,
    jiraProjectKey: string,
    opts: {
      // Aceita um tipo único (`'Bug'`) ou uma lista (`['Bug', 'Improvement']`) — o picker
      // de bug/melhoria busca os dois tipos juntos numa única caixa de busca, sem forçar
      // a pessoa a escolher o tipo antes de saber o que é o ticket.
      type?: 'Bug' | 'Improvement' | 'Epic' | Array<'Bug' | 'Improvement'>;
      search?: string;
      pageSize?: number;
      all?: boolean;
    } = {},
  ): Promise<JiraIssuePage> {
    const { accessToken, apiBaseUrl, siteUrl } = await this.authContext(userId);

    const clauses = [`project = "${this.escapeJql(jiraProjectKey)}"`];
    if (opts.type) {
      const types = Array.isArray(opts.type) ? opts.type : [opts.type];
      clauses.push(
        types.length === 1
          ? `issuetype = "${types[0]}"`
          : `issuetype in (${types.map((t) => `"${t}"`).join(', ')})`,
      );
    }
    if (opts.search) clauses.push(this.buildSearchClause(opts.search));
    const jql = `${clauses.join(' AND ')} ORDER BY updated DESC`;

    const fields = 'key,summary,status,issuetype,priority,labels,created,updated,assignee,resolutiondate';
    const pageSize = Math.min(Math.max(opts.pageSize ?? 8, 1), 100);

    const issues: JiraIssueSummary[] = [];
    let nextPageToken: string | undefined;

    do {
      const params = new URLSearchParams({ jql, fields, maxResults: String(pageSize) });
      if (nextPageToken) params.set('nextPageToken', nextPageToken);
      const url = `${apiBaseUrl}/rest/api/3/search/jql?${params.toString()}`;
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new HttpException(
          `Erro ao buscar issues do projeto no Jira (${response.statusText}): ${body}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const data = await response.json();
      const pageIssues = data.issues ?? [];
      for (const issue of pageIssues) {
        issues.push({
          key: issue.key,
          summary: issue.fields?.summary || issue.key,
          status: issue.fields?.status?.name || '—',
          statusCategory: issue.fields?.status?.statusCategory?.key,
          issuetype: issue.fields?.issuetype?.name || '—',
          priority: issue.fields?.priority?.name,
          labels: issue.fields?.labels ?? [],
          created: issue.fields?.created,
          updated: issue.fields?.updated,
          resolutiondate: issue.fields?.resolutiondate ?? undefined,
          assignee: issue.fields?.assignee?.displayName,
          link: `${siteUrl}/browse/${issue.key}`,
        });
      }

      nextPageToken = data.nextPageToken;
    } while (opts.all && nextPageToken);

    return { issues, total: issues.length, startAt: 0, maxResults: pageSize };
  }

  // Conta issues do projeto sem paginar/trazer o payload completo — usa
  // /search/approximate-count (só JQL no corpo, devolve { count }), pra casos como
  // o dashboard de qualidade que só precisa do total de épicos, não dos dados deles.
  async countIssuesByProject(
    userId: string,
    jiraProjectKey: string,
    opts: { type?: 'Bug' | 'Improvement' | 'Epic' | Array<'Bug' | 'Improvement'> } = {},
  ): Promise<number> {
    const { accessToken, apiBaseUrl } = await this.authContext(userId);

    const clauses = [`project = "${this.escapeJql(jiraProjectKey)}"`];
    if (opts.type) {
      const types = Array.isArray(opts.type) ? opts.type : [opts.type];
      clauses.push(
        types.length === 1
          ? `issuetype = "${types[0]}"`
          : `issuetype in (${types.map((t) => `"${t}"`).join(', ')})`,
      );
    }
    const jql = clauses.join(' AND ');

    const response = await this.fetchWithRetry(`${apiBaseUrl}/rest/api/3/search/approximate-count`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jql }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new HttpException(
        `Erro ao contar issues do projeto no Jira (${response.statusText}): ${body}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await response.json();
    return data.count ?? 0;
  }

  // Status possíveis pros tipos Bug/Improvement dentro do workflow do projeto — não é
  // lista fixa no app, cada projeto Jira define seu próprio workflow de status. Bug e
  // Improvement podem ter workflows diferentes com nomes de status parecidos mas não
  // idênticos (confirmado com erro real do Jira: "Fechada" não existe pro campo status,
  // só "Fechado" — provavelmente duas telas de workflow com nomes levemente diferentes).
  // Por isso o JQL usa o ID do status (estável), não o nome (que pode não bater com o
  // valor literal aceito pelo JQL).
  async listIssueStatuses(
    userId: string,
    jiraProjectKey: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const { accessToken, apiBaseUrl } = await this.authContext(userId);

    const response = await this.fetchWithRetry(
      `${apiBaseUrl}/rest/api/3/project/${encodeURIComponent(jiraProjectKey)}/statuses`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      },
    );

    if (!response.ok) {
      throw new HttpException(
        `Erro ao listar status do projeto no Jira (${response.statusText}).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data: Array<{ name: string; statuses: Array<{ id: string; name: string }> }> = await response.json();
    const statuses = data
      .filter((entry) => entry.name === 'Bug' || entry.name === 'Improvement')
      .flatMap((entry) => entry.statuses);

    const byId = new Map(statuses.map((s) => [s.id, s]));
    return Array.from(byId.values());
  }

  // Prioridades globais do site — não é escopado por projeto no Jira.
  // Mesmo motivo do ID em listIssueStatuses: o nome da prioridade devolvido aqui pode não
  // ser o valor literal aceito pelo JQL (confirmado com erro real do Jira: "Gravíssima"
  // não existe pro campo priority) — o JQL usa o ID, estável independente de nome/locale.
  async listIssuePriorities(userId: string): Promise<Array<{ id: string; name: string }>> {
    const { accessToken, apiBaseUrl } = await this.authContext(userId);

    const response = await this.fetchWithRetry(`${apiBaseUrl}/rest/api/3/priority`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new HttpException(
        `Erro ao listar prioridades do Jira (${response.statusText}).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data: Array<{ id: string; name: string }> = await response.json();
    return data.map((p) => ({ id: p.id, name: p.name }));
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      const { accessToken, apiBaseUrl } = await this.authContext(userId);
      const response = await this.fetchWithRetry(`${apiBaseUrl}/rest/api/3/myself`, {
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
      response = await this.fetchWithRetry(`${apiBaseUrl}/rest/api/3/issue/${key}`, {
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
      const response = await this.fetchWithRetry(issueUrl, {
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
      // Campo padrão "Pai" do Jira (issue.fields.parent) — quando a suíte está sob um
      // Épico na hierarquia do projeto, isso já vem de graça nesta mesma resposta (a
      // issue é buscada sem restringir `fields`), sem precisar de nenhuma chamada extra.
      const epicKey: string | undefined = issueData.fields?.parent?.key;
      const epicSummary: string | undefined = issueData.fields?.parent?.fields?.summary;

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
        epicKey,
        epicSummary,
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
