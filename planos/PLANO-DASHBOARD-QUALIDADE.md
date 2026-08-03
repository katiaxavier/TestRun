# Evolução do Dashboard: abas Qualidade e Eficiência

**Status:** planejado 2026-07-10, implementação ainda não iniciada (planejamento a pedido do
usuário, sem código nesta rodada).

## Context

O Dashboard (`/dashboard`, `frontend/src/pages/HomePage.tsx`) hoje só cobre indicadores de
**Operação** (execuções em andamento, Ready for Test, alertas, últimas execuções, gráfico de
qualidade por execução) — documentado em `PLANO-DASHBOARD-HOME.md`. O usuário recebeu uma proposta
de um stakeholder (`proposta_qualidade.md`) pedindo métricas que respondam outras perguntas — onde
estão os problemas, quais áreas são mais frágeis, quanto do sistema está coberto por testes, quão
rápido bugs são corrigidos, e se a qualidade está melhorando ou piorando — organizadas em dois
blocos novos: **Qualidade** (densidade de bugs por módulo, taxa de sucesso × severidade, cobertura
de requisitos/automação, taxa de regressão) e **Eficiência** (MTTR, idade dos defeitos, bugs acima
do SLA), além de uma tendência semanal.

Investigação prévia mostrou que boa parte dos dados necessários não existe hoje: não há sync
persistido de issues do Jira (tudo é buscado ao vivo, só com `key/summary/status/type/priority/
created/updated/assignee` — sem `labels`, sem vínculo a épico, sem changelog), o vínculo
`Issue.jiraKey` local é opcional e texto livre (sem validação), `Suite` não tem vínculo a épico, e
`TestCase` não tem flag de automação. Este plano cobre a evolução completa, mas organizada em 3
fases por custo/dependência crescente, para decidir depois por onde começar a implementar.

Decisões confirmadas com o usuário:
1. Plano único cobrindo todos os itens da proposta, fatiado em fases internas.
2. Dashboard ganha **abas** na mesma rota `/dashboard`: Operação (atual, sem mudança) / Qualidade /
   Eficiência.
3. Vínculo bug↔Jira via um componente de busca/seleção reaproveitável (não texto livre), e
   **`jiraKey` passa a ser obrigatório** ao logar bug/melhoria (mudança de comportamento vs hoje).
   A `priority` real do Jira é capturada no momento da seleção e vira a fonte oficial de
   severidade; o campo "Severidade" manual **é removido do formulário** de criação de bug/melhoria.
4. Vínculo Suíte↔Épico do Jira por seleção manual (mesmo componente de busca), sem auto-match.
5. Sem revalidação do Jira no backend a cada submit — confia que o picker só permite selecionar
   itens vindos de uma busca real.
6. Métricas de Eficiência (Fase 3) usam a mesma janela de "últimas N execuções concluídas" já usada
   no resto do dashboard, não o histórico completo.
7. Taxa de regressão entra já na Fase 1 numa versão aproximada (baseada só em execuções + label,
   sem consultar o Jira); pode ser refinada depois com dados reais de resolução (Fase 3).

Nenhuma migração de dados antigos é necessária — `Issue.jiraKey` continua `String?` no schema (a
obrigatoriedade é regra de validação da aplicação para registros novos), então Issues antigas com
`jiraKey`/`jiraPriority` nulos continuam sendo lidas normalmente em qualquer tela existente.

---

## Fase 1 — Fundação (sem sync novo do Jira)

Abas no Dashboard, componente `JiraItemPicker`, vínculo Suíte↔Épico, `jiraKey` obrigatório com
`jiraPriority`/`jiraLabels` capturados no momento da seleção, e os indicadores que só dependem
desses dados: densidade de bugs por label, taxa de sucesso × severidade, cobertura de requisitos
(parte 1 — % épicos com suíte vinculada), taxa de regressão aproximada.

### Schema (`backend/prisma/schema.prisma`)
- `Suite.epicKey String?` — chave do Épico do Jira vinculado.
- `Issue.jiraPriority String?` — nome da prioridade real do Jira, capturada na seleção via picker.
- `Issue.jiraLabels String[] @default([])` — labels do Jira, capturadas na seleção (array nativo do
  Postgres, não `Json`, para permitir filtros `has`/`hasSome` do Prisma nas queries de densidade por
  label/regressão sem precisar de raw SQL).

### Backend
- `backend/src/jira/jira.service.ts`:
  - `searchIssuesByBoard`: adicionar `labels` aos `fields` buscados e ao retorno mapeado; corrigir a
    montagem do filtro de tipo (hoje só reconhece `'Bug'`/`'Improvement'` — precisa aceitar
    `'Epic'` também, para o picker de épicos funcionar).
  - Novo método `searchIssuesByProject(userId, jiraProjectKey, { search?, type?, pageSize? })` usando
    `/rest/api/3/search` (JQL clássico por projeto) — necessário porque nem `ExecutionRunPage.tsx`
    nem o formulário de Suíte têm um `boardId` único e confiável (uma Suíte pode ter 0, N boards),
    então o picker não pode reaproveitar a busca board-scoped existente.
- `backend/src/jira-issues/`: novo endpoint `GET /jira-issues/picker?projectId=&type=&search=`,
  dedicado ao picker (não reaproveita `GET /jira-issues`, que é board-scoped e alimenta a tabela
  paginada de `JiraIssuesPage.tsx`); `pageSize` fixo baixo (~8), sem paginação de UI.
- `backend/src/suites/`: novo `PATCH /suites/:id/epic` (`{ epicKey: string | null }`), escopo
  estreito (só o campo épico); `createManual`/`importFromJira` ganham `epicKey?` opcional na criação.
- `backend/src/executions/executions.service.ts`:
  - `CreateIssueDto`/`UpdateIssueDto` ganham `jiraPriority?`, `jiraLabels?`.
  - `addIssue`/`addScenarioIssue`: validação manual (`if (!dto.jiraKey?.trim()) throw new
    HttpException(...)`, seguindo o padrão já usado em `suites.controller.ts`); persistir
    `jiraPriority`/`jiraLabels` vindos do DTO, sem re-consultar o Jira (o picker já buscou os dados
    reais no momento da seleção).
  - `updateIssue`/`updateScenarioIssue`: mesma validação, não permitir desvincular (`jiraKey` vazio).
  - Remover `severity` do fluxo de criação (campo continua existindo no schema/histórico, só sai do
    DTO de criação/da UI).
- Novo módulo `backend/src/dashboard/` (`dashboard.module.ts`, `.controller.ts`, `.service.ts`):
  - `GET /dashboard/quality?projectId=&boardId=` — agrega, dentro da janela de N execuções
    concluídas (mesmo filtro de board já usado em `executions.service.ts`):
    - **Densidade por label**: `Issue`s da janela (via `executionTestCase.execution`/
      `scenario.executionTestCase.execution`), `distinct` por `jiraKey` (evita contar duas vezes uma
      issue linkada a múltiplos itens), agrupadas por `jiraLabels` (uma issue com várias labels conta
      em cada uma).
    - **Taxa de sucesso × severidade**: por execução da janela, taxa de aprovação + contagem de bugs
      vinculados por `jiraPriority`.
    - **Cobertura (parte 1)**: `Suite`s com `epicKey` preenchido vs. total de épicos do projeto
      (`searchIssuesByProject(..., { type: 'Epic' })`) + contagem de casos de teste por suíte.
    - **Regressão (aproximada)**: por label, achar a primeira execução "limpa" (sem falha/bloqueio)
      cujos bugs vinculados tinham aquele label; bugs do mesmo label em execuções posteriores contam
      como regressão. `% = bugs regressivos / total de bugs distintos na janela`.

### Frontend
- `frontend/src/pages/HomePage.tsx` vira um shell fino com abas; conteúdo atual migra sem alteração:
  - `frontend/src/pages/dashboard/OperationTab.tsx` — todo o conteúdo atual do `HomePage.tsx`
    (Atenção, KPIs, Ready for Test, Últimos Bugs/Melhorias, Execuções em Andamento, Últimas
    Concluídas, gráfico de Qualidade por execução), sem mudança de comportamento.
  - `frontend/src/pages/dashboard/QualityTab.tsx` (novo) — os 4 indicadores desta fase.
  - `frontend/src/pages/dashboard/EfficiencyTab.tsx` (novo, esqueleto vazio nesta fase).
  - `frontend/src/pages/dashboard/shared.ts` (novo) — move helpers reaproveitados entre abas
    (`progressOf`, `bandColor`, constantes de janela) de dentro de `HomePage.tsx`.
- `frontend/src/components/JiraItemPicker.tsx` (novo):
  ```ts
  interface JiraItemPickerProps {
    projectId: string;
    type: 'Bug' | 'Improvement' | 'Epic';
    value: { key: string; summary: string } | null;
    onChange: (issue: JiraIssue | null) => void;
    placeholder?: string;
  }
  ```
  Input controlado, debounce 400ms (mesmo padrão de `JiraIssuesPage.tsx`), busca só a partir de 2
  caracteres, dropdown com até ~8 resultados (chave + resumo truncado + badge de tipo via
  `typeColor()`), seleção colapsa para um "chip" `KEY — resumo` com botão de limpar. Combobox
  inline, não modal (os formulários onde é usado já não são modais).
  Usado em: `ExecutionRunPage.tsx` (`IssueForm`, `type` dinâmico BUG/IMPROVEMENT, `projectId` via
  `execution.suite.projectId`) e `SuitesPage.tsx`/`SuiteCard.tsx` (`type="Epic"`, sempre obrigatório
  para criar suíte, editável depois via pequeno modal/affordance no card).
- `frontend/src/pages/ExecutionRunPage.tsx`: `IssueForm` troca o `<input>` "ID Jira (opcional)" por
  `<JiraItemPicker type={...} projectId={...} value={...} onChange={...} />` (label passa a
  "Jira *", sem "(opcional)"); remove o `<select>` de Severidade; `handleAdd`/`handleUpdate` enviam
  `jiraKey`/`jiraPriority`/`jiraLabels` recebidos do picker.
- `frontend/src/api/client.ts`: `JiraIssue.labels?`, `Suite.epicKey?`, `Issue.jiraPriority?`,
  `Issue.jiraLabels?`; novo `jiraIssuesApi.searchPicker(projectId, opts)`, `suitesApi.updateEpic(id,
  epicKey)`, `dashboardApi.getQuality(projectId, boardId)`.

---

## Fase 2 — Cobertura de automação

### Schema
- `TestCase.automated Boolean @default(false)`.

### Backend
- `backend/src/suites/`: novo `PATCH /suites/test-cases/:id` (`{ automated?: boolean }`) +
  `suitesService.updateTestCase`.
- `backend/src/dashboard/dashboard.service.ts`: completa cobertura com contagem de casos
  automatizados / % automação (`prisma.testCase.count({ where: { automated: true, ... } })`).

### Frontend
- Tela onde `TestCase`s são listados dentro de uma suíte (localizar o componente exato ao
  implementar — não mapeado em detalhe nesta exploração) ganha toggle "Automatizado" por caso,
  chamando `suitesApi.updateTestCase(id, { automated })`.
- `QualityTab.tsx`: card de cobertura passa a mostrar casos automatizados e % automação.

---

## Fase 3 — Eficiência (MTTR / idade / SLA) + tendência semanal + regressão refinada

Sem mudança de schema — busca `status`/`created`/`resolutiondate` do Jira ao vivo, no load da aba
Eficiência, sem persistir.

### Backend
- `backend/src/jira/jira.service.ts`: novo `fetchIssuesStatus(userId, keys[])` via `/rest/api/3/
  search` com JQL `key in (...)`, `fields=status,created,resolutiondate`, em lotes — `resolutiondate`
  é campo padrão do Jira Cloud, disponível direto em `fields` sem precisar minerar changelog (
  suficiente para MTTR/idade/SLA no nível pedido pela proposta; não captura reaberturas nem tempo por
  status intermediário, mas isso só importaria para métricas mais granulares, fora de escopo).
- `backend/src/dashboard/dashboard.constants.ts`: `SLA_DAYS = 15` (constante, sem UI de configuração).
- `backend/src/dashboard/dashboard.service.ts`:
  - `getEfficiency(projectId, boardId)`: `Issue`s tipo BUG da janela de N execuções concluídas
    (mesma janela do resto do dashboard), `distinct` por `jiraKey`, `fetchIssuesStatus` em lote →
    MTTR (média de `resolutiondate - created` para issues resolvidas), idade média dos bugs abertos
    (`now - created` para issues sem `resolutiondate`), contagem acima do SLA por `jiraPriority`.
  - `getWeeklyTrend(projectId, boardId)`: agrupa execuções concluídas por semana ISO, calcula taxa de
    aprovação agregada, bugs críticos abertos e MTTR da semana.
  - Regressão: recalcular usando status/resolução reais em vez da aproximação por execução limpa da
    Fase 1, sem quebrar a interface pública de `/dashboard/quality`.

### Frontend
- `frontend/src/pages/dashboard/EfficiencyTab.tsx`: cards de MTTR/Idade/SLA (`.stat-card`), tabela de
  bugs acima do SLA, gráfico de tendência semanal (`recharts LineChart`, 3 séries — mesmo padrão de
  cores/tokens do `BarChart` de Qualidade já existente em `OperationTab.tsx`).
- `client.ts`: `dashboardApi.getEfficiency(...)`, `dashboardApi.getWeeklyTrend(...)`.

---

## Arquivos críticos

**Fase 1**: `backend/prisma/schema.prisma`, `backend/src/jira/jira.service.ts`,
`backend/src/jira-issues/*`, `backend/src/suites/*`, `backend/src/executions/executions.service.ts`,
`backend/src/dashboard/*` (novo), `frontend/src/components/JiraItemPicker.tsx` (novo),
`frontend/src/pages/HomePage.tsx` + `frontend/src/pages/dashboard/{OperationTab,QualityTab,shared}.tsx`,
`frontend/src/pages/ExecutionRunPage.tsx`, `frontend/src/pages/SuitesPage.tsx`,
`frontend/src/components/SuiteCard.tsx`, `frontend/src/api/client.ts`.

**Fase 2**: `backend/prisma/schema.prisma`, `backend/src/suites/*`, tela de listagem de `TestCase`s
(a localizar), `frontend/src/pages/dashboard/QualityTab.tsx`.

**Fase 3**: `backend/src/jira/jira.service.ts`, `backend/src/dashboard/dashboard.service.ts`,
`backend/src/dashboard/dashboard.constants.ts`, `frontend/src/pages/dashboard/EfficiencyTab.tsx`,
`frontend/src/api/client.ts`.

---

## Verificação

- `tsc --noEmit` no frontend e build do backend sem erros novos, a cada fase.
- Fase 1: criar um bug/melhoria em `ExecutionRunPage.tsx` sem selecionar Jira no picker → botão de
  salvar bloqueado/erro claro; selecionar uma issue real → salva com `jiraPriority`/`jiraLabels`
  preenchidos; criar/editar Suíte vinculando um Épico via picker; abrir aba Qualidade e conferir
  densidade por label, taxa por severidade e % cobertura batendo com os dados reais do quadro.
- Fase 2: marcar um caso de teste como automatizado e conferir que o % de automação da aba Qualidade
  atualiza.
- Fase 3: abrir aba Eficiência com um board com bugs resolvidos e abertos, conferir MTTR/idade/SLA e
  o gráfico de tendência semanal; testar quadro com poucos/nenhum bug resolvido (sem erro de divisão
  por zero).
- Repetir casos de borda já cobertos no dashboard atual: quadro "Sem quadro" e projeto sem status
  "Ready for Test" configurado.
