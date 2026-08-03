# Nova tela "Dashboard" (home) com visão geral

**Status:** v1 ✅ implementada. v2 (redesenho de layout, seção "v2 — Redesenho" abaixo) ✅ implementada,
incluindo os ajustes pós-entrega (reordenar seções, separar falha/bloqueado nos alertas, largura dos
KPIs, seção "Últimos Bugs e Melhorias Criados") documentados no final deste arquivo.

## Context

Hoje a tela `/execucoes` (arquivo `frontend/src/pages/DashboardPage.tsx`, título "Execuções") é o
resultado de um dashboard anterior que foi renomeado (ver `PLANO-DASHBOARD-SUITES.md`) — ela só mostra
execuções em andamento e últimas execuções concluídas, e é a home do app (`/` redireciona pra lá). Não
existe nenhuma tela que dê uma visão geral combinando execuções, suítes de teste e bugs/melhorias do Jira
em um único lugar.

O usuário quer uma nova tela de **Dashboard** que vire a nova home do app, reunindo num único lugar:
KPIs numéricos, execuções em andamento, últimas execuções concluídas, resumo por suíte de teste, e bugs/
melhorias do Jira com status "Ready for test". A tela atual "Execuções" continua existindo normalmente,
só deixa de ser a rota padrão de entrada.

Toda a informação necessária já é servida por endpoints existentes — nenhum endpoint novo no backend é
necessário; é um trabalho só de frontend, reaproveitando componentes e padrões já usados no restante do app.

Decisões confirmadas com o usuário:
1. Dashboard vira a nova tela inicial (home), primeiro item do menu lateral, rota `/dashboard`.
2. "Execuções" continua existindo sem nenhuma mudança de comportamento, só deixa de ser a rota padrão.
3. Conteúdo do Dashboard: KPIs no topo + execuções em andamento + últimas execuções concluídas + resumo
   por suíte de teste + bugs/melhorias com status "Ready for test".

---

## O que vai mudar na navegação

- Novo item no topo do menu lateral: **Dashboard** → `/dashboard` (ícone `GaugeIcon`, já usado pra essa
  ideia no histórico do projeto, ver `PLANO-DASHBOARD-SUITES.md`).
- `/` passa a redirecionar para `/dashboard` (hoje redireciona para `/execucoes`).
- "Execuções" continua como 2º item do menu, em `/execucoes`, sem nenhuma mudança de comportamento.
- `ExitDetailOnContextSwitch` (`frontend/src/App.tsx`) passa a navegar para `/dashboard` (em vez de
  `/execucoes`) quando o usuário troca de projeto/quadro estando numa tela de detalhe.

## Nova página: `frontend/src/pages/HomePage.tsx`

Arquivo novo (não reaproveita o nome `DashboardPage` porque esse identificador já é usado internamente
pela tela "Execuções"). Segue exatamente os padrões já usados em `DashboardPage.tsx`/`SuitesPage.tsx`:
`useProject()`/`useBoard()` para escopo, `motion.div` de entrada, `.loading-page`/`.empty-state` para
projeto/quadro não selecionado.

### 1. KPIs no topo
Grid de 4 cards reaproveitando as classes já existentes e não usadas em `frontend/src/index.css`
(`.stats-grid`/`.stat-card`/`.stat-label`/`.stat-value`, ~linha 640):
- Em andamento — `activeExecutions.length`
- Últimas concluídas — `recentExecutions.length`
- Suítes de teste — total retornado por `suitesApi.list`
- Bugs/Melhorias "Ready for test" — `total` retornado por `jiraIssuesApi.list` já filtrado (seção 5)

### 2. Execuções em Andamento
Reaproveita 100% o padrão de `DashboardPage.tsx` (linhas 22-32 e 104-130): `executionsApi.getRecent(projectId, boardId, { status: 'IN_PROGRESS', limit: 50 })`, renderizado com `<ExecutionCard>` (`frontend/src/components/ExecutionCard.tsx`), `onClick` → `/execution/:id`. Polling de 15s enquanto houver execução ativa, igual ao existente.

### 3. Últimas Execuções Concluídas
Mesmo padrão, `status: 'COMPLETED', limit: 3`, mesmo componente `<ExecutionCard>`. Botão "Ver todas" → `/executions`.

### 4. Resumo por Suíte de Teste
`suitesApi.list(projectId, boardId)` (mesma chamada que `SuitesPage.tsx` já usa). Mostra uma tabela
compacta (reaproveitar `.table-wrapper`/`<table>`, mesmo padrão de `JiraIssuesPage.tsx`) com as 5 suítes
mais recentes (ordenadas por `updatedAt` desc), colunas: Suíte (jiraKey/manualKey + título), Casos
(`_count.testCases`), Execuções (`_count.executions`). Botão "Ver todas" → `/suites`.

### 5. Bugs e Melhorias — Ready for test
- `jiraIssuesApi.getFilters(projectId)` já retorna `statuses: {id, name}[]` dinâmico por workflow do
  projeto (igual `JiraIssuesPage.tsx` usa). Resolver o id do status cujo `name` bate com "ready for test"
  (comparação case-insensitive, já que nomes de status podem variar — mesma cautela já registrada para
  "Melhoria"/"Improvement" no projeto).
- Se nenhum status correspondente existir no quadro, mostrar empty-state ("Nenhum status 'Ready for test'
  neste quadro") em vez de erro — o workflow do Jira é por projeto e pode não ter esse status.
- Se encontrado: `jiraIssuesApi.list(projectId, boardId, { status: id, pageSize: 5 })`, tabela compacta
  (Chave, Título, Tipo, Responsável), reaproveitando `typeColor()`/tags já usados em `JiraIssuesPage.tsx`.
  Botão "Ver todas" → `/jira-issues` (sem pré-filtro — a página atual não lê filtro inicial da URL; fora
  de escopo abrir esse precedente agora).
- Igual à tela "Bugs e Melhorias", esta seção fica desabilitada/oculta quando `selectedBoard.id === 'none'`
  (pseudo-quadro "Sem quadro" não existe no Jira).

---

## Arquivos críticos

- `frontend/src/pages/HomePage.tsx` (novo)
- `frontend/src/App.tsx` — import, rota `/dashboard`, redirect de `/`, `ExitDetailOnContextSwitch`
- `frontend/src/components/Sidebar.tsx` — novo item no array `links` (topo), import `GaugeIcon`
- `frontend/src/components/TopBar.tsx` — nova entrada no array `routes` para `/dashboard` (e mover o
  fallback `p === '/'` da entrada de "Execuções" pra cá)

Reaproveitados sem alteração: `ExecutionCard.tsx`, `executionsApi`/`suitesApi`/`jiraIssuesApi` em
`frontend/src/api/client.ts`, classes CSS `.stats-grid`/`.stat-card`/`.table-wrapper`/`.empty-state` em
`index.css`.

---

## Verificação

- `tsc --noEmit` no frontend sem erros novos.
- No navegador (dev server já rodando via docker-compose): confirmar que `/` leva ao novo Dashboard,
  que o menu mostra "Dashboard" antes de "Execuções", e que os 4 KPIs batem com o conteúdo das seções
  abaixo deles.
- Com uma execução em andamento: confirmar card na seção 2 e atualização por polling (15s).
- Trocar projeto/quadro (inclusive quadro "Sem quadro"): confirmar que a seção de Bugs/Melhorias some
  para "Sem quadro" e que as demais seções atualizam o escopo corretamente.
- Testar um quadro cujo workflow não tenha status "Ready for test": confirmar o empty-state da seção 5
  em vez de erro.

---

# v2 — Redesenho de layout (mais acionável)

## Context

A v1 (seções acima) tinha 4 KPIs genéricos + execuções em andamento + últimas concluídas + resumo de
suítes + tabela de bugs/melhorias Ready for Test. O usuário propôs um layout novo, mais enxuto e
**acionável**: separa Bugs de Melhorias, adiciona uma taxa de sucesso e um mini-gráfico de tendência de
qualidade, e — o mais importante — uma seção "Atenção" que destaca o que precisa de ação agora (execuções
com falha, bugs aguardando validação), em vez de só números neutros.

Decisões confirmadas com o usuário nesta rodada:
1. **Gráfico "Qualidade"**: eixo por **últimas N execuções concluídas** (não por dia corrido) — evita
   gráfico vazio em quadros com baixa frequência de execução. `N = 10` (constante ajustável).
2. **Taxa de Sucesso (KPI)**: mesma janela do gráfico — últimas N execuções concluídas, agregado
   (soma de passou / soma de executado no período, não média das porcentagens por execução).
3. **"Bugs aguardando validação"** no alerta de Atenção = mesma contagem de bugs em Ready for Test já
   exibida no topo, **sem** filtro de prioridade (qualquer bug Ready for Test conta).
4. **Seção "Resumo por Suíte de Teste"** da v1 é **removida** — fora de escopo do layout novo.
5. **Seção "Ready for Test"** mantém a tabela de itens (chave/título/tipo/responsável, até 5), **além**
   dos contadores separados de Bugs e Melhorias — não é só um resumo numérico.

Nenhum endpoint novo de backend é necessário. Os 3 tipos de dado usados (execuções, filtros/lista de
issues do Jira) já existem e suportam os parâmetros necessários (`limit`, `type`, `status`, `pageSize`).

## Layout final (top → baixo)

### 1. KPIs no topo (4 `.stat-card`, como na v1)
- **Execuções em andamento** — `activeExecutions.length`
- **Bugs Ready for Test** — total da chamada `jiraIssuesApi.list(..., { status: readyId, type: 'Bug', pageSize: 1 })`
- **Melhorias Ready for Test** — mesma chamada com `type: 'Improvement'`
- **Taxa de Sucesso** — `%` agregado das últimas N execuções concluídas (ver cálculo abaixo)

### 2. Execuções em Andamento — lista compacta (substitui `<ExecutionCard>` cheio)
Uma linha por execução: título + barra de progresso fina + `%`, clicável (`/execution/:id`). Progresso
calculado com um helper local `progressOf(execution)` (mesma lógica de `passed/failed/blocked/total` que
`ExecutionCard.tsx` já usa internamente, reimplementada localmente em `HomePage.tsx` — não vale a pena
extrair um util compartilhado só por isso).

### 3. Ready for Test
- Linha de contadores: "Bugs ... N" / "Melhorias ... N" (reaproveita os totais já buscados para os KPIs).
- Tabela compacta abaixo (chave/título/tipo/responsável, até 5 itens) — mesma implementação da v1,
  reaproveitando `jiraIssuesApi.list(projectId, boardId, { status: readyId, pageSize: 5 })` (sem filtro
  de `type`, mistura bugs e melhorias) e o padrão de tabela de `JiraIssuesPage.tsx`.
- Resolução do status "Ready for test" via `jiraIssuesApi.getFilters(projectId)` (case-insensitive),
  igual à v1; mesmo empty-state se o workflow não tiver esse status, e ocultar a seção inteira quando
  `selectedBoard.id === 'none'`.

### 4. Últimas Execuções Concluídas — lista compacta ✔/✖
As últimas 3 das N execuções concluídas já buscadas (não é uma chamada nova). ✔ = execução sem nenhum
item falhado/bloqueado (`failed === 0 && blocked === 0`); ✖ = execução com pelo menos um item falhado ou
bloqueado. Clicável, mesmo destino de sempre (`/execution/:id`).

### 5. Qualidade — mini-gráfico (primeiro uso de `recharts` no projeto)
Gráfico de barras (`recharts`, `BarChart`/`Bar`/`ResponsiveContainer`), uma barra por execução concluída
das últimas N, altura = taxa de sucesso individual daquela execução (`passed / executed * 100`). Cor da
barra por faixa, reaproveitando os tokens de status já existentes no app (não inventar paleta nova):
`--status-passed` (≥80%), `--status-blocked` (50–79%, já usado como "amarelo/atenção" no resto do app),
`--status-failed` (<50%). Tooltip no hover com nome da execução + data + `%` exato. Legenda textual curta
das 3 faixas (a cor aqui carrega significado, não é só decoração). Eixos discretos/recessivos (sem grid
pesado, sem eixo Y numerado — os números exatos vivem no tooltip e no KPI de Taxa de Sucesso).

### 6. Atenção — alertas condicionais
Só renderiza linhas que têm algo a reportar (se não houver nada, mostra estado positivo "Tudo certo"):
- `🔴 X execuções com falha` — conta, dentro das últimas N execuções concluídas, quantas têm
  `failed > 0 || blocked > 0` (mesmo critério do ✖ da seção 4).
- `🔴 Y bugs aguardando validação` — mesmo número do contador de "Bugs Ready for Test" da seção 3;
  só aparece a linha se `Y > 0`.
Cada linha usa ícone + texto (não só cor), consistente com o resto do app.

## Cálculo de "últimas N execuções concluídas" (usado nos itens 1, 4, 5, 6)

Uma única chamada, reaproveitada em toda a página:
```
executionsApi.getRecent(projectId, boardId, { status: 'COMPLETED', limit: 10 })
```
- Item 4 usa os 3 primeiros itens dessa lista.
- Itens 1, 5 e 6 usam a lista inteira (até 10).
- Taxa de Sucesso (item 1) = soma de `passed` de todas / soma de `executed` (passed+failed+blocked) de
  todas as execuções da lista — agregado, não média simples das porcentagens por execução.

## Arquivos a alterar

- `frontend/src/pages/HomePage.tsx` — reescrita das seções internas (mantém fetch de execuções ativas e
  a resolução de status Ready for Test da v1; remove o fetch/seção de suítes; adiciona fetch de contadores
  Bug/Improvement separados; adiciona o gráfico de qualidade e a seção de Atenção).
- Nenhuma mudança em `App.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `ExecutionRunPage.tsx` — rotas e navegação já
  implementadas na v1 e não são afetadas por este redesenho interno da página.

Dependência nova em uso (já instalada, sem alteração de `package.json`): `recharts`.

## Verificação (v2)

- `tsc --noEmit` no frontend sem erros novos.
- No navegador: conferir os 4 KPIs, a lista compacta de execuções em andamento com barra de progresso,
  a tabela + contadores de Ready for Test, a lista ✔/✖ das últimas 3 concluídas, o gráfico de Qualidade
  (cores por faixa + tooltip) e a seção Atenção (aparecendo só quando há algo a reportar).
- Testar com menos de 10 execuções concluídas no quadro (gráfico e taxa de sucesso com poucos pontos,
  sem erro de divisão por zero quando não há nenhuma concluída).
- Repetir os casos de borda já cobertos na v1: quadro "Sem quadro" (seção Ready for Test oculta) e
  workflow sem status "Ready for test" (empty-state).

---

## Ajustes pós-entrega (v2)

Feitos em sequência depois da v2 inicial, todos só em `frontend/src/pages/HomePage.tsx`
(+ `frontend/src/index.css` no primeiro item), sem mudança de endpoint:

1. **Reordenação de seções**: "Atenção" passou a ser a primeira seção da página (antes até dos KPIs);
   "Ready for Test" trocou de lugar com "Execuções em Andamento" e agora vem primeiro.
2. **Falha vs Bloqueado nos alertas/ícones**: antes, `blocked > 0` era tratado como falha (mesmo ícone ✖,
   mesma contagem no alerta "com falha"). Agora são contados e exibidos separadamente:
   `failedExecutionsCount` (só `failed>0`) e `blockedExecutionsCount` (só `blocked>0`), cada um com seu
   próprio alerta ("X execuções com falha" / "Y execuções com item(ns) bloqueado(s)") e ícone/cor
   (`XCircleIcon` vermelho / `ProhibitIcon` amarelo). O tipo `Alert` guarda `{ text, color, Icon }` pra
   isso. A lista "Últimas Execuções Concluídas" também ganhou o 3º estado (✔/✖/bloqueado) no lugar do
   ✔/✖ binário anterior.
3. **Largura dos KPIs**: os rótulos da v2 ("Execuções em Andamento", "Melhorias Ready for Test" etc.) são
   mais longos que os da v1 e quebravam linha dentro do `.stat-card`. Em `index.css`: `.stats-grid` subiu
   de `minmax(180px, 1fr)` pra `minmax(210px, 1fr)`; `.stat-label` ganhou `white-space: nowrap` +
   `text-overflow: ellipsis` (trunca em vez de quebrar) e `letter-spacing`/`font-size` levemente menores.
   Cada label também ganhou `title` com o texto completo (tooltip no hover se truncar).
4. **Nova seção "Últimos Bugs e Melhorias Criados"** (entre "Ready for Test" e "Execuções em Andamento"):
   tabela compacta (chave/título/tipo/criado em) com os 5 itens mais recentes, bugs e melhorias
   misturados numa lista só. Decisão confirmada com o usuário: janela por **quantidade** (últimos N=5
   criados), não por dias corridos — mesmo raciocínio já usado no gráfico de Qualidade, pra não ficar
   vazio em quadros com pouca atividade. Reaproveita `jiraIssuesApi.list(projectId, boardId, { pageSize: 5 })`
   sem filtro de status/tipo (o backend já retorna Bug+Improvement ordenados por `key DESC`, proxy de
   ordem de criação); o resultado é reordenado no cliente por `created` desc pra não depender só da
   ordenação por key. Oculta para o pseudo-quadro "Sem quadro", igual às outras seções de Jira.
