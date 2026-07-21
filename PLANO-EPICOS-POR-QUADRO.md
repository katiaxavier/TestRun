# Épicos por quadro (não mais por projeto inteiro) — Dashboard Qualidade

**Status:** planejado 2026-07-17, documento técnico de plano — sem código nesta rodada.

## Context

Hoje o card "Épicos sem Cobertura" (aba **Qualidade** do Dashboard) é calculado em
`DashboardService.getQuality` (`backend/src/dashboard/dashboard.service.ts:111-205`, seção
"Cobertura de requisitos + automação", linhas 164-189). O total de épicos vem de
`JiraService.countIssuesByProject` (`backend/src/jira/jira.service.ts:388-426`), que monta o JQL
`project = "<key>" AND issuetype = "Epic"` e chama `POST /rest/api/3/search/approximate-count` —
**sempre pelo projeto inteiro**, ignorando o `boardId` recebido pelo endpoint.

Essa decisão é deliberada e está documentada num comentário no código (linhas 165-170): o time
confirmou que, neste Jira, os quadros não têm Épico associado (não aparece no Backlog/Roadmap do
board), então não haveria como escopar por board sem quebrar a fração numerador/denominador.

Essa premissa foi colocada em dúvida numa conversa com o usuário, que trouxe dois exemplos reais de
filtro de quadro (tela "Filtro do quadro" do Jira):

- **PAD**: `project = PAD ORDER BY Rank ASC` — filtro simples, um único quadro no espaço.
- **PD-DT-Polimeros**: `project = PD AND status in (CLOSED, DATABASE, Done, DONE, "In Dev", "In
  Review", "ON HOLD", "Ready for Test", REOPENED, TESTING, ToDo, "IN ACCEPTANCE") AND labels in
  (dt-polimeros) ORDER BY Rank ASC` — filtro com critério extra de `labels`, sem restrição de
  `issuetype`.

Como nenhum dos dois filtros restringe `issuetype`, é possível que Épicos que carreguem os mesmos
critérios (ex. a label `dt-polimeros`) passem no filtro do board normalmente — contrariando a
suposição de "quadro nunca tem épico" para esse padrão de configuração. Cada espaço pode ter de 1 a
vários quadros, e cada quadro pode ter um filtro de complexidade diferente — não há um padrão fixo
(projeto puro, projeto + label, projeto + status, etc.).

## Objetivo

Calcular o total de épicos "do quadro" usando o **filtro JQL real do board** (o mesmo que o Jira usa
para decidir o que aparece nele), em vez de assumir sempre o projeto inteiro — funcionando de forma
genérica para qualquer combinação de critérios, sem hardcode de padrão.

## Decisões já tomadas

1. **Abordagem escolhida**: buscar o filtro salvo do board via `board/{id}/configuration` →
   `filter/{id}` → JQL, e compor `(<jql do board>) AND issuetype = Epic`, reaproveitando
   `POST /rest/api/3/search/approximate-count` (mesma técnica já usada por `countIssuesByProject`).
   - Alternativa descartada (a): derivar épicos a partir do campo Epic Link/parent das issues
     retornadas por `searchIssuesByBoard` — tecnicamente viável sem endpoint novo, mas sub-representa
     épicos que ainda não têm nenhuma story vinculada ao board.
   - Alternativa descartada (b): manter sempre o escopo por projeto e só deixar isso explícito na UI
     — não atende ao pedido do usuário de escopar por quadro.
2. A JQL do board **nunca é assumida** — é sempre buscada dinamicamente em runtime, para cobrir tanto
   filtros simples (PAD) quanto filtros com critérios extras (PD-DT-Polimeros) sem lógica especial
   por caso.
3. Reaproveitar o padrão já usado em `DashboardService.fetchAllBugs`
   (`dashboard.service.ts:210-251`) para resolver `Board` local → `board.jiraBoardId` antes de falar
   com o Jira.

## Plano técnico

### Backend — `JiraService` (`backend/src/jira/jira.service.ts`)

1. **`getBoardConfiguration(userId, jiraBoardId)`** — `GET /rest/agile/1.0/board/{id}/configuration`
   (endpoint não implementado hoje). Retorna a config do board; interessa o campo `filter.id`.
2. **`getFilterJql(userId, filterId)`** — `GET /rest/api/3/filter/{id}` (endpoint não implementado
   hoje). Retorna o objeto do filtro salvo; interessa o campo `jql`.
3. **`countEpicsByBoard(userId, jiraBoardId)`** — combina os dois acima:
   - resolve `filter.id` via `getBoardConfiguration`;
   - resolve a JQL base via `getFilterJql`;
   - remove/isola a cláusula `ORDER BY` da JQL base antes de compor (validar se
     `approximate-count` aceita `ORDER BY` dentro de uma subcláusula — se não aceitar, stripar);
   - monta `(<jql base sem ORDER BY>) AND issuetype = Epic`;
   - chama `POST /rest/api/3/search/approximate-count` com essa JQL (mesmo endpoint de
     `countIssuesByProject`).
4. **Cache da JQL do board**: o filtro muda raramente, então cachear evita 2 chamadas extras ao Jira
   a cada carregamento do dashboard. Onde cachear (memória com TTL vs. persistir em
   `Board.filterJql` no Postgres com refresh periódico) fica em aberto — ver "Perguntas em aberto".

### Backend — `DashboardService.getQuality` (`backend/src/dashboard/dashboard.service.ts:164-180`)

- Quando `boardId` estiver definido (e diferente de `'none'`): resolver o `Board` local →
  `board.jiraBoardId` (mesmo padrão de `fetchAllBugs`) e chamar `countEpicsByBoard` no lugar de
  `countIssuesByProject`.
- Quando `boardId` não estiver definido: manter o comportamento atual (projeto inteiro), sem
  mudança.
- Atualizar/remover o comentário de negócio nas linhas 165-170, que afirma que quadros nunca têm
  épico — substituir pela explicação da nova lógica baseada no filtro real do board.

### Frontend

- Sem mudança de contrato esperada: `dashboardApi.getQuality` (`frontend/src/api/client.ts:347-352`)
  já envia `boardId`. Só conferir se `QualidadeTab.tsx` (linhas 118, 267-268) repassa corretamente o
  `boardId` selecionado para a chamada que alimenta o card "Épicos sem Cobertura".

### Validação

- Testar com os dois exemplos reais já levantados (PAD e PD-DT-Polimeros) para confirmar que o
  total de épicos muda de forma coerente ao trocar de quadro, e que o JQL composto realmente retorna
  épicos quando eles atendem aos critérios do filtro (ex. label compartilhada).

## Perguntas em aberto (não bloqueiam este documento, só a implementação)

- Onde cachear a JQL do board — TTL em memória (mais simples, perde no restart) vs. persistir em
  Postgres (sobrevive restart, exige refresh/invalidação) — decidir na implementação.
- Se `approximate-count` aceita `ORDER BY` dentro de uma JQL composta com parênteses, ou se é
  obrigatório removê-lo antes de compor.
- O que fazer se um board não tiver filtro "simples" (ex. filtro compartilhado entre múltiplos
  boards, ou algum caso de board sem projeto único no escopo) — comportamento ainda não testado
  contra um exemplo real.
- Se `epicsWithSuite` (hoje sempre por projeto, calculado localmente a partir de
  `Suite.epicKey` no Postgres) também precisa ser restrito ao conjunto de épicos do quadro, para o
  numerador e o denominador ficarem no mesmo escopo — essa era a preocupação original do comentário
  de negócio atual, e provavelmente ainda vale: precisa decidir se isso é feito por interseção com o
  conjunto de épicos retornado pela nova busca, ou por uma query adicional.

## Arquivos que serão tocados quando a implementação começar

`backend/src/jira/jira.service.ts` (3 métodos novos: `getBoardConfiguration`, `getFilterJql`,
`countEpicsByBoard`), `backend/src/dashboard/dashboard.service.ts` (`getQuality`, remoção/atualização
do comentário de negócio), possivelmente `backend/prisma/schema.prisma` (se a decisão de cache for
persistir a JQL no `Board`).
