# Plano: Tela "Bugs e Melhorias" (Jira ao vivo, por Projeto + Quadro)

## Contexto

O TestRun já lista bugs/melhorias que os testadores registram manualmente durante uma
execução (modelo `Issue` do Postgres, vinculado a caso de teste/cenário — usado nos
relatórios Excel/PDF). Esta é uma funcionalidade **diferente**: uma tela nova que consulta
o Jira **diretamente e ao vivo** (sem persistir no Postgres) por issues dos tipos
Bug/Melhoria, escopada pelo Projeto + Quadro atualmente selecionados na sidebar — seguindo
o mesmo padrão de UX/arquitetura já usado em telas como "Todas as Execuções" e no sync de
suítes por quadro.

Decisões já confirmadas com o usuário:
- Fonte de dados: Jira ao vivo via JQL por quadro (não a tabela `Issue` local).
- Nome do tipo "melhoria" no Jira é configuração do site, não do idioma do usuário logado —
  o JQL vai aceitar as duas variantes (`"Melhoria"` e `"Improvement"`) para cobrir ambos os
  casos, mas isso precisa ser confirmado contra o Jira real antes de finalizar (igual foi
  feito com "Test Suite" na Fase 4 do plano colaborativo — ver `PLANO-COLABORATIVO-JIRA.md`).
- Navegação: item fixo na sidebar (não um CTA tipo "ver mais").
- Sem filtros além de projeto/quadro na v1 (filtro de status do Jira não é trivial — status
  é definido por workflow por site/projeto, sem lista fixa; ficaria pra uma v2 se pedido).

## Achado-chave de arquitetura

`Board.id` (UUID interno do Postgres) e `Board.jiraBoardId` (id real do quadro Jira) são
campos diferentes (`backend/prisma/schema.prisma:38-49`). O frontend sempre manda
`selectedBoard.id` (o UUID interno) pro backend. O precedente pra resolver interno→Jira é
`SuitesService.syncBoardSuites` (`backend/src/suites/suites.service.ts:196-202`): busca o
`Board` no Postgres, extrai `board.jiraBoardId`, e só então chama o Jira. O novo serviço
segue exatamente esse padrão.

## Backend

**Novo método em `JiraService`** (`backend/src/jira/jira.service.ts`, logo após
`searchSuitesByBoard`, linhas 138-174) — `searchIssuesByBoard(userId, jiraBoardId, {page, pageSize})`:
- JQL: `issuetype in ("Bug", "Melhoria", "Improvement") ORDER BY key DESC`.
- Endpoint: `GET /rest/agile/1.0/board/{jiraBoardId}/issue?jql=...&fields=key,summary,status,issuetype,priority,created,updated,assignee&startAt=...&maxResults=...` (mesma família de endpoint do `searchSuitesByBoard`, mesmo `fetchWithRetry`).
- `startAt = (page-1)*pageSize`, `maxResults = pageSize` (clamp 1–100, igual ao clamp de `findAllExecutions`). O `total` retornado pelo Jira no mesmo payload é reaproveitado direto.
- Retorna objetos estruturados (key, summary, status, issuetype, priority, created, updated, assignee, link `${siteUrl}/browse/${key}`), não só chaves.

**Novo módulo `backend/src/jira-issues/`** (mesma convenção de `executions/`, `boards/`):
- `jira-issues.module.ts`: importa `JiraModule`, `ProjectsModule` (para `ProjectAccessGuard`; `PrismaModule` é `@Global()`, não precisa importar) — mesmo padrão de imports do `boards.module.ts`.
- `jira-issues.controller.ts`: `@Controller('jira-issues')`, `@UseGuards(ProjectAccessGuard)` na classe. Rota `GET /jira-issues` com `@ProjectAccess('direct')`, query params `projectId, boardId, page?, pageSize?`.
- `jira-issues.service.ts`: `listByBoard(userId, projectId, boardId, page, pageSize)` —
  1. Rejeita `boardId === 'none'`/vazio com 400 ("Selecione um quadro real do Jira... não disponível para 'Sem quadro'").
  2. Busca `Board` no Postgres por `id`; 404 se não existir ou `board.projectId !== projectId`.
  3. Chama `jiraService.searchIssuesByBoard(userId, board.jiraBoardId, {page, pageSize})`.
  4. Retorna `{ data, total, page, pageSize }` — mesmo formato de `executionsApi.getAll`.
- Registrar `JiraIssuesModule` em `backend/src/app.module.ts` (junto de `BoardsModule`/`SuitesModule`).

Sem "Sem quadro" pra esta feature: diferente de execuções/lotes (que podem ter quadro nulo
no Postgres), esta tela sempre precisa de um `jiraBoardId` real pra consultar o Jira.

## Frontend

- **`frontend/src/api/client.ts`**: novo tipo `JiraIssue` (key, summary, status, issuetype, priority?, created, updated, assignee?, link) — **não mexer** no `Issue` existente (é o modelo interno não relacionado). Novo `jiraIssuesApi.list(projectId, boardId, {page, pageSize})` no mesmo formato de `executionsApi.getAll`.
- **`frontend/src/pages/JiraIssuesPage.tsx`** (novo, espelhando `ExecutionsPage.tsx`):
  - `useProject()`/`useBoard()`, mesmo guard de loading, mesmos empty states (sem projeto, sem quadro) **+ novo** empty state quando `selectedBoard.id === 'none'` ("Sem quadro" — não disponível, mesmo texto/estilo usado hoje no botão "Sincronizar" desabilitado).
  - `page`/`pageSize` com `PAGE_SIZES = [10,25,50,100]`, botões Anterior/Próxima (`CaretLeft`/`CaretRight`), sem filtro de status/período (só o seletor de itens por página).
  - Lista simples por linha (sem componente existente pra isso): chave (link pro Jira via `issue.link`, `target="_blank"`), summary, badges de status/tipo/prioridade, assignee, datas. Reaproveitar classes `.card`/`empty-state` já usadas, sem CSS novo.
  - `PageHeader` com `title="Bugs e Melhorias"`, `backLabel="Dashboard"`.
- **`frontend/src/App.tsx`**: importar `JiraIssuesPage`, adicionar `<Route path="/jira-issues" element={<JiraIssuesPage />} />` ao lado de `/executions` (linha ~90). Adicionar `/jira-issues` também na condição de bounce do `ExitDetailOnContextSwitch` (linha 34), pelo mesmo motivo que `/executions` está lá — consistência entre as duas telas de listagem top-level escopadas por projeto+quadro.
- **`frontend/src/components/Sidebar.tsx`**: novo item no array `links` (linha 8-11) com `BugIcon` de `@phosphor-icons/react` (confirmado disponível no pacote instalado), rota `/jira-issues`, label "Bugs e Melhorias".

## Verificação

1. **Confirmar nomes reais de issuetype no Jira** antes de fechar o JQL definitivo: logar
   no app, pegar um board real, e checar (via log temporário em `searchIssuesByBoard` ou
   chamada manual a `/rest/api/3/issuetype`) se o site usa `"Melhoria"`, `"Improvement"`,
   ou ambos — ajustar a lista do `issuetype in (...)` se necessário.
2. **Backend isolado via curl** (`GET /jira-issues?projectId=...&boardId=...&page=1&pageSize=10`):
   confirmar formato `{data, total, page, pageSize}`; casos negativos: sem `projectId` → 400;
   `boardId=none` → 400; `boardId` de outro projeto → 404.
3. **Ponta a ponta no navegador**: subir backend+frontend, logar, selecionar projeto/quadro
   reais com issues Bug/Melhoria conhecidas, clicar no novo item da sidebar, comparar
   contagem com uma busca JQL manual na UI do Jira. Trocar projeto/quadro e confirmar que
   a lista atualiza (ou volta pro dashboard, conforme a regra do `ExitDetailOnContextSwitch`).
   Testar paginação (avançar/voltar página, mudar tamanho de página) e o link de cada issue
   abrindo o Jira real em nova aba. Testar o estado "Sem quadro" (se existir suíte sem
   quadro no projeto selecionado) mostrando o empty state em vez de erro.

## Arquivos principais
- `backend/src/jira/jira.service.ts`
- `backend/src/jira-issues/jira-issues.module.ts` (novo)
- `backend/src/jira-issues/jira-issues.controller.ts` (novo)
- `backend/src/jira-issues/jira-issues.service.ts` (novo)
- `backend/src/app.module.ts`
- `frontend/src/pages/JiraIssuesPage.tsx` (novo)
- `frontend/src/api/client.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/Sidebar.tsx`

## Status

Implementado e testado ponta a ponta em 2026-07-09 (ainda não commitado). Backend e
frontend rodando via `docker compose` (bind mount + watch/HMR), confirmado funcionando
no navegador com o usuário real.

**Achado da verificação em produção**: o site Jira usado neste projeto **não tem**
`"Melhoria"` como nome de issuetype — a tentativa gerou erro real do Jira: `O valor
'Melhoria' não existe para o campo 'issuetype'`. Importante: JQL com `issuetype in (...)`
falha a busca inteira (400) se **qualquer** valor da lista não for um issuetype válido do
site — não ignora silenciosamente o valor inválido. O JQL final ficou
`issuetype in ("Bug", "Improvement") ORDER BY key DESC` — este site usa o nome em inglês
"Improvement" mesmo para o conceito de "melhoria". Se outro site/projeto Jira usar um nome
diferente, essa lista precisa ser revista (ver comentário em `JiraService.searchIssuesByBoard`).

---

# v2 — Busca, filtros e listagem em tabela (pedido em 2026-07-09)

## Contexto

O usuário quer que a tela evolua de lista de cards simples pra algo "parecido como é a
tela de suítes de teste e dashboard" — na prática, isso significa ganhar as capacidades
reais que faltam hoje: **busca por texto**, **filtros por tipo, status e severidade**, e
uma **listagem em tabela** igual à de casos de teste (`frontend/src/components/TestCaseList.tsx`),
em vez dos `.card` avulsos atuais.

Decisões já confirmadas com o usuário:
- **"Severidade" = campo `priority` do Jira** (já buscado hoje), só relabelado na UI — não
  existe (nem será criado) um campo Jira separado de severidade.
- **Filtros e busca são resolvidos no servidor, via JQL** — não uma migração pra "buscar
  tudo de uma vez e filtrar no navegador" (que é como `TestCaseList.tsx` funciona hoje,
  mas não escala bem pra quadros com centenas de bugs). Isso significa que a busca por
  texto precisa de debounce no input (não é instantânea feito no navegador), diferente da
  busca de casos de teste.

## Achado técnico: de onde vêm as opções de cada filtro

- **Tipo**: como a busca já é sempre restrita a `issuetype in ("Bug", "Improvement")`
  (achado do v1), as opções do filtro "Tipo" são só essas duas, fixas no backend — sem
  chamada extra ao Jira. Rótulo amigável ("Melhoria") mapeado pro valor real
  ("Improvement") só na UI — mesmo espírito do mapeamento `SEVERITY_EN`/`SEVERITY_PT` que
  já existe em `ExecutionRunPage.tsx` pro modelo `Issue` interno (conceitos diferentes,
  mas o padrão "rótulo PT / valor real" é o mesmo).
- **Status**: workflow por projeto no Jira, não é lista fixa no app. Precisa de chamada
  nova: `GET /rest/api/3/project/{projectKey}/statuses`, filtrada às entradas de issuetype
  Bug/Improvement, com os nomes de status deduplicados.
- **Severidade (= priority)**: lista global do site via `GET /rest/api/3/priority`.

Essas duas listas (status, priority) são buscadas **uma vez por projeto** (não a cada
tecla digitada) — endpoint novo e leve, separado da listagem paginada principal.

## Backend

**`JiraService` (`backend/src/jira/jira.service.ts`)**:
- `searchIssuesByBoard` ganha parâmetros opcionais novos: `type?`, `status?`, `priority?`,
  `search?`. Monta o JQL dinamicamente:
  - Base: se `type` vier e for um dos dois valores válidos (`"Bug"` | `"Improvement"` —
    validar contra whitelist, não interpolar livre), usa `issuetype = "<type>"`; senão
    mantém `issuetype in ("Bug", "Improvement")`.
  - `AND status = "<status>"` se `status` vier.
  - `AND priority = "<priority>"` se `priority` vier.
  - `AND (text ~ "<search>*")` se `search` vier (busca ampla por resumo/descrição/
    comentários — comportamento padrão do campo `text` do JQL).
  - `ORDER BY key DESC` sempre por último.
  - **Escapar `status`, `priority` e `search`** antes de interpolar no JQL (aspas duplas e
    barra invertida) — chegam via query string, tratados como não confiáveis. Adicionar
    helper `escapeJql(value: string)` no mesmo arquivo.
- Dois métodos novos, mesmo padrão `authContext`/`fetchWithRetry` dos demais:
  - `listIssueStatuses(userId, jiraProjectKey): Promise<string[]>` — chama
    `GET /rest/api/3/project/{jiraProjectKey}/statuses`, filtra entradas cujo `name` seja
    "Bug" ou "Improvement", achata `statuses[].name` de cada uma, remove duplicatas.
  - `listIssuePriorities(userId): Promise<string[]>` — chama `GET /rest/api/3/priority`,
    retorna `data.map(p => p.name)` (lista global do site).

**`backend/src/jira-issues/`**:
- `jira-issues.controller.ts`: rota `GET /jira-issues` ganha query params opcionais
  `type?, status?, priority?, search?`, repassados pro service. Nova rota
  `GET /jira-issues/filters` (`@ProjectAccess('direct')`, query `projectId`) que resolve o
  `Project` no Postgres (pra pegar `jiraProjectKey`) e retorna
  `{ types: [{value,label}], statuses: string[], priorities: string[] }` — `types`
  hardcoded no service (`[{value:'Bug',label:'Bug'},{value:'Improvement',label:'Melhoria'}]`),
  `statuses`/`priorities` vêm dos dois métodos novos do `JiraService`.
- `jira-issues.service.ts`: `listByBoard` repassa os filtros pro
  `jiraService.searchIssuesByBoard`; novo `listFilters(userId, projectId)` implementa a
  lógica acima.

## Frontend

- **`frontend/src/api/client.ts`**: `jiraIssuesApi.list` ganha parâmetros opcionais
  `type?, status?, priority?, search?`. Novo `jiraIssuesApi.getFilters(projectId)` →
  `{ types, statuses, priorities }`.
- **`frontend/src/pages/JiraIssuesPage.tsx`** — reescrita da área de listagem e da barra de
  controles:
  - **Barra de busca + filtros**, no mesmo espírito visual da barra de filtros que já
    existe em `ExecutionsPage.tsx` (container `flexWrap`) e do input de busca com ícone
    (`MagnifyingGlass`) de `SuitesPage.tsx`/`TestCaseList.tsx`: um `<input>` de busca
    (estado local com **debounce de ~400ms** antes de disparar a chamada — inline via
    `useEffect`/`setTimeout`, não existe hook de debounce compartilhado no projeto, mesma
    convenção "sem abstração compartilhada" que `TestCaseList.tsx`/`ExecutionRunPage.tsx`
    já seguem) + três `<select>` nativos (Tipo, Status, Severidade), populados por
    `jiraIssuesApi.getFilters(projectId)` (buscado uma vez quando `selectedProject` muda,
    não a cada filtro) + o seletor de itens por página já existente.
  - `page` volta pra 1 sempre que `type`, `status`, `priority` ou o termo de busca
    (debounced) mudar — mesmo padrão já usado em `ExecutionsPage.tsx`.
  - **Listagem vira tabela** (`.table-wrapper > table`, mesmo padrão de
    `TestCaseList.tsx`/`SuiteBatchTable.tsx`), substituindo os `.card` por linha atuais.
    Colunas: Chave (link pro Jira, `<code>`, ícone de link externo — mesmo tratamento do
    `TestCaseList.tsx` pra `tc.jiraKey`), Resumo, Tipo (tag), Status (tag), Severidade/
    Priority (tag), Responsável, Atualizado em. Cada linha continua abrindo o Jira em nova
    aba ao clicar na chave (mantém o comportamento atual, só muda o layout).
  - Mantém a paginação Anterior/Próxima já existente (continua vindo do backend/Jira, não
    vira paginação client-side).
  - Mantém os empty states (sem projeto, sem quadro, "Sem quadro") já implementados no v1;
    o empty state de "zero resultados" passa a diferenciar "sem bugs/melhorias" vs
    "nenhum resultado com os filtros aplicados" (mesmo padrão que `ExecutionsPage.tsx` já
    tem via `hasFilters`).

## Verificação

1. **Backend isolado via curl**: `GET /jira-issues/filters?projectId=...` retorna as três
   listas; `GET /jira-issues?projectId=...&boardId=...&type=Bug` retorna só bugs;
   `...&status=<status real>` idem; `...&priority=<priority real>` idem; `...&search=termo`
   retorna issues cujo resumo contém o termo. Confirmar que valores de `status`/`priority`
   com aspas ou caracteres especiais não quebram a query (teste do escaping).
2. **Ponta a ponta no navegador**: abrir "Bugs e Melhorias", confirmar que os três selects
   carregam opções reais (não vazios) assim que o projeto/quadro é selecionado; aplicar
   cada filtro isoladamente e em combinação, e comparar contagem com uma busca JQL manual
   equivalente na UI do Jira; digitar no campo de busca e confirmar que a chamada só
   dispara depois de parar de digitar (debounce); confirmar que a paginação reflete o
   total já filtrado; confirmar visualmente que a tabela renderiza corretamente as 7
   colunas e que o link da chave abre o Jira real.

## Arquivos principais (adicionais ao v1)
- `backend/src/jira/jira.service.ts` (extensão de `searchIssuesByBoard` + 2 métodos novos)
- `backend/src/jira-issues/jira-issues.controller.ts` (rota `/jira-issues/filters` + query params novos em `/jira-issues`)
- `backend/src/jira-issues/jira-issues.service.ts` (`listFilters` + repasse de filtros)
- `frontend/src/api/client.ts` (`getFilters` + params novos em `list`)
- `frontend/src/pages/JiraIssuesPage.tsx` (barra de busca/filtros + tabela no lugar dos cards)

## Status v2

Implementado em 2026-07-09 (ainda não commitado). Backend e frontend recarregaram via
`docker compose` (watch/HMR) sem erros de compilação; type-check limpo nos dois lados.
Falta validação ponta a ponta no navegador com dados reais (contagens por filtro, debounce
da busca, opções dos três selects vindas do Jira real).
