# Evolução do Dashboard: seções de Qualidade (v2)

**Status:** planejado 2026-07-10, documento de requisitos/decisões (sem código nesta rodada). Este
arquivo é uma segunda rodada de discussão sobre o mesmo tema de `PLANO-DASHBOARD-QUALIDADE.md`
(mantido intacto, sem alterações) — cobre o mesmo escopo geral, mas com decisões de design tomadas
numa conversa nova, a pedido do usuário, sem reaproveitar as decisões técnicas do arquivo anterior.

## Context

O Dashboard (`/dashboard`, `frontend/src/pages/HomePage.tsx`) hoje cobre só indicadores de
**Operação** — execuções em andamento, bugs/melhorias Ready for Test, seção de Atenção, lista de
bugs Ready for Test/Testing e últimas execuções. A proposta do stakeholder (`proposta_qualidade.md`)
sugeriu expandir isso com métricas que respondem outras perguntas: onde estão os problemas, quais
áreas são mais frágeis, quanto do sistema está coberto por testes, e quão rápido bugs são
corrigidos. O usuário confirmou esse mesmo escopo numa conversa nova, fatiado em 4 seções, e tomou
as decisões de design necessárias para cada uma (registradas abaixo).

Investigação no código confirma que a maior parte dos dados necessários não existe hoje: não há
persistência de issues do Jira (tudo é buscado ao vivo, só com `key/summary/status/type/priority/
created/updated/assignee` — sem `labels`, sem `resolutiondate`, sem épico), `Issue.jiraKey` é
opcional e texto livre, `Issue.severity` é manual e desacoplado da prioridade real do Jira, `Suite`
não tem vínculo com épico, e `TestCase` não tem flag de automação. Este documento não é ainda um
plano técnico (schema/endpoints/componentes) — é a base de requisitos e decisões para desenhar esse
plano quando a implementação começar.

---

## Escopo desta rodada

**Mantém sem mudança** — aba/seção "Operação" atual:
- Execuções em andamento.
- Bugs **Ready for Test** / Melhorias **Ready for Test** (KPIs).
- Seção **Atenção**.
- Lista de bugs em **Ready for Test** ou **Testing**.
- Últimas execuções realizadas.

**Novo, 4 seções:**
1. Densidade de defeitos por combinação de labels (módulo + funcionalidade).
2. Taxa de sucesso × severidade de bugs e melhorias.
3. Cobertura de requisitos (épico × suíte) + cobertura de automação.
4. MTTR / idade dos defeitos / SLA.

**Fora de escopo por agora** (sugestões do stakeholder original, adiadas para uma rodada futura):
taxa de regressão, tendência semanal da qualidade.

---

## Estrutura de abas

Conteúdo dividido em **3 abas**, na mesma rota `/dashboard`, espelhando a divisão da proposta
original do stakeholder (`proposta_qualidade.md`, seção "Consideração final"):

- **Aba Operação** — conteúdo atual do Dashboard, sem nenhuma mudança (ver "Escopo desta rodada"
  acima).
- **Aba Qualidade** — seções 1 a 3 deste documento: densidade de defeitos por combinação de labels,
  taxa de sucesso × severidade, cobertura de requisitos + automação. Eixo: onde estão os problemas e
  quanto do sistema está coberto por testes.
- **Aba Eficiência** — seção 4: MTTR, idade dos defeitos, alerta de SLA por severidade. Eixo: quão
  rápido estamos corrigindo os problemas.

A seção 0 (pré-requisito de vincular bug/melhoria a uma issue real do Jira) é transversal — não
pertence a uma aba específica, é usada pelas seções 1 e 2 da aba Qualidade.

Mecânica técnica de implementar as abas (shell de `HomePage.tsx`, roteamento, componentes por aba)
fica para a fase de desenho técnico — não faz parte deste documento de requisitos.

---

## 0. Pré-requisito comum: mudança na forma de abrir bugs/melhorias

As seções 1 e 2 só funcionam com dados confiáveis de label e severidade, e isso exige mudar como
bugs/melhorias são abertos a partir de uma execução.

Estado atual, confirmado no código e relatado pelo usuário:
- `Issue.jiraKey` é opcional e digitado como texto livre (`ExecutionRunPage.tsx`, input com
  `placeholder="PROJ-999"`), sem nenhuma validação contra o Jira.
- `Issue.severity` é um campo manual (select PT/EN), sem relação com a prioridade real da issue no
  Jira.
- `JiraService.searchIssuesByBoard` busca hoje só `key,summary,status,issuetype,priority,created,
  updated,assignee` — **não busca `labels`**.
- Hoje só a **Label** é usada ao abrir um bug, de forma ampla (nível de sistema/produto, ex.
  `dt_polimeros`). O usuário verificou diretamente no Jira que o campo **Componentes** não pode ser
  usado neste projeto (não é possível cadastrar novos componentes) — essa via foi descartada. A
  solução passa a ser usar o campo Label normalmente, mas **sem limite de uma só**: quando fizer
  sentido, o bug pode levar uma segunda label de funcionalidade além da de módulo (ex.
  `dt_polimeros` + `configuracao_analise`) — **não é obrigatório**, é só uma opção para quem quiser
  granularidade extra.

Mudança decidida: bug/melhoria só pode ser aberto **vinculado a uma issue real do Jira**, via
busca/seleção (não mais texto livre). O campo de severidade manual **deixa de existir do
formulário** — a severidade usada nas métricas novas passa a ser a prioridade real do Jira,
capturada no momento da seleção da issue. As labels da issue também são capturadas nesse momento (a
busca do Jira precisa passar a incluir `labels` no `fields`).

Limitação conhecida e aceita: bugs/melhorias antigos, sem um vínculo real com o Jira, não entram
(ou entram só parcialmente) nas métricas novas — não haverá reprocessamento retroativo desses
registros. Bugs com só a label de módulo (sem uma segunda label de funcionalidade) continuam
aparecendo normalmente na densidade — só ficam num grupo menos granular (ver item 1).

---

## 1. Densidade de defeitos por combinação de labels (módulo + funcionalidade) — aba Qualidade

Decisão: o dashboard **não distingue** programaticamente qual label é "módulo" e qual é
"funcionalidade" — não há prefixo nem lista fixa de módulos conhecidos. Em vez disso, o agrupamento
é feito pela **combinação exata das labels de cada bug**: bugs com o mesmo conjunto de labels caem
no mesmo grupo/barra do gráfico. **Não é obrigatório ter duas labels** — um bug com só uma label
(ex. só `dt_polimeros`) forma seu próprio grupo normalmente; a granularidade extra só aparece quando
o bug tiver duas ou mais labels.

Exemplo: 5 bugs com as labels `{dt_polimeros, configuracao_analise}` formam um grupo; 2 bugs com
`{dt_polimeros, cadastro}` formam outro grupo, mesmo compartilhando a label `dt_polimeros` com o
grupo anterior; bugs com só `{dt_polimeros}` formam um terceiro grupo, separado dos dois anteriores.
Isso dá, na prática, a visão de módulo + funcionalidade que o usuário queria, sem exigir nenhuma
convenção obrigatória — só quando o time quiser mais granularidade numa label específica, adiciona
uma segunda.

Mesma janela de dados usada no resto do dashboard (últimas execuções concluídas — mesma constante de
janela hoje usada em `HomePage.tsx`, ex. as 10 mais recentes). Cada bug distinto conta uma vez, no
grupo correspondente ao seu conjunto de labels (ordem das labels não importa — a chave de
agrupamento é o conjunto, não a lista ordenada). Depende do item 0: só bugs vinculados a uma issue
real do Jira têm labels confiáveis.

## 2. Taxa de sucesso × severidade dos bugs e melhorias — aba Qualidade

Gráfico de barras empilhadas, uma barra por execução, na mesma janela de dados do restante do
dashboard. Cada segmento empilhado representa a quantidade de **bugs distintos** daquela severidade
vinculados à execução — decisão: o bug conta uma única vez, mesmo que tenha derrubado vários casos
de teste (não conta de novo por cada caso afetado). A severidade usada é a prioridade real do Jira,
capturada conforme o item 0.

Em aberto para quando desenharmos a implementação técnica: se melhorias entram na mesma
visualização (mesmas barras) ou em um gráfico/série separada — isso não bloqueia este documento.

## 3. Cobertura de requisitos + automação — aba Qualidade

Cruza épicos do Jira com as suítes de teste correspondentes.

- Vínculo Suíte ↔ Épico: **automático, sem UI de seleção manual**. O épico é derivado do campo
  **Pai** (`parent`) da própria issue do Jira vinculada à suíte (`Suite.jiraKey`), capturado no
  momento da importação/sincronização da suíte. Confirmado no código: `JiraService.importSuite` já
  busca a issue completa via `GET /rest/api/3/issue/{suiteKey}` (sem restringir `fields`), então
  `issueData.fields.parent` já vem na resposta hoje — não é necessária nenhuma chamada nova à API
  do Jira, só passar a ler e persistir esse campo (`parent.key`/`parent.fields.summary`) durante o
  import.
- Suítes **manuais** (`isManual = true`, sem `jiraKey`) não têm issue do Jira associada e, portanto,
  nunca têm épico — contam sempre como "sem cobertura" nesse indicador. Não há alternativa manual de
  vínculo para elas nesta rodada.
- Suítes **já importadas antes desta mudança** não têm o campo Pai capturado ainda. Ficam "sem
  cobertura" até serem reimportadas/ressincronizadas — não há uma ação de backfill em lote nesta
  rodada.
- Indicadores exibidos: percentual de épicos com ao menos uma suíte vinculada, quantidade de épicos
  sem cobertura, total de casos de teste, quantidade e percentual de casos automatizados.
- Casos automatizados: **toggle manual** por caso de teste ("Automatizado: sim/não"), marcado pelo
  time na tela de listagem/edição de casos. Não existe hoje nenhuma convenção — label, tag, campo —
  que já indique isso, nem no Jira nem no TestRun, então isso exige um novo campo booleano em
  `TestCase` (o modelo não tem esse campo atualmente).

## 4. MTTR / idade dos defeitos / SLA — aba Eficiência

Escopo decidido: considera **todos os bugs do quadro/projeto no Jira**, não só os que passaram por
uma execução registrada no TestRun. Isso implica uma consulta nova e direta ao Jira (JQL por
projeto/board, `issuetype = Bug`), buscando `created`, `resolutiondate` e `priority` — nenhum desses
três campos é buscado hoje pelo `JiraService`, que também não tem nenhum método desse tipo ainda.

Indicadores exibidos: MTTR médio, idade média dos bugs em aberto, alerta de bugs acima do SLA.

O SLA **varia por severidade** (ex.: bug crítico vence mais rápido que um de baixa severidade) —
isso exige uma tabela de prazos por nível de severidade. Onde essa tabela é configurada (constante
fixa no código vs. uma tela de configuração) fica em aberto para a fase de desenho técnico.

---

## Perguntas em aberto (não bloqueiam este documento, só a implementação futura)

- Melhorias entram junto com bugs no gráfico de taxa de sucesso × severidade, ou em série separada?
- Onde vive a configuração de SLA por severidade — hardcoded ou tela de admin?
- Nomes exatos dos novos campos de schema (ex. campo de épico derivado em `Suite`, `TestCase.automated`,
  campos de prioridade/labels capturados em `Issue`) — a definir na hora de desenhar o schema.
- Se/quando entrarem taxa de regressão e tendência semanal (adiados nesta rodada).
- Como comunicar ao time que é possível (não obrigatório) adicionar uma segunda label de
  funcionalidade ao abrir bugs no Jira, para quem quiser mais granularidade — mudança de processo,
  fora do controle do TestRun.
- O que fazer com grupos de label muito pequenos/únicos no gráfico (ex. combinações com só 1 bug) —
  mostrar todos, ou agrupar como "outros" abaixo de um limiar — fica em aberto para o desenho visual.

## Arquivos que serão tocados quando a implementação começar (referência, não plano técnico)

`backend/prisma/schema.prisma` (novos campos, incl. épico derivado em `Suite`),
`backend/src/jira/jira.service.ts` (labels em `searchIssuesByBoard`, listar Épicos do projeto para o
denominador de cobertura — hoje só aceita `Bug`/`Improvement`, hardcoded —, `resolutiondate`, e
capturar `fields.parent` já retornado por `importSuite`), `backend/src/executions/
executions.service.ts` e `frontend/src/pages/ExecutionRunPage.tsx` (fluxo de abrir bug/melhoria via
seleção de issue real), `backend/src/suites/*` (persistir o épico derivado no import), tela de
listagem de casos de teste (toggle de automação), `frontend/src/pages/HomePage.tsx` (novas
seções/gráficos de Qualidade).
