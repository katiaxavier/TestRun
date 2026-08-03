# Plano: Melhorias no Dashboard de Qualidade/Eficiência (a partir de `novo-plano-qualidade.md`)

**Status:** planejado 2026-07-10, implementação ainda não iniciada (avaliação de viabilidade a pedido
do usuário, sem código nesta rodada).

## Contexto

O usuário recebeu uma proposta de melhorias (`novo-plano-qualidade.md`, raiz do repo) para o Dashboard,
que já tem as abas **Qualidade** e **Eficiência** implementadas e commitadas na branch
`feature/dashboard-qualidade` (`backend/src/dashboard/*`, `frontend/src/pages/dashboard/*`). O pedido foi
avaliar viabilidade item a item **sem inventar nada** — verificar contra o código real o que já existe,
o que é reaproveitável, e o que esbarra em dados/conceitos que o sistema não tem hoje.

A investigação direta no código (não só um resumo de agente) encontrou 4 lacunas reais onde o documento
pressupõe capacidades inexistentes. Cada uma foi levada ao usuário, que decidiu:

1. **Tendência (↑/↓)** em qualquer indicador — o dashboard não guarda histórico, só calcula em cima da
   janela "últimas 10 execuções concluídas" (`COMPLETED_EXECUTIONS_LIMIT`). Fazer isso direito (ex. "últimos
   30 dias") exigiria uma tabela nova de snapshots + job periódico. **Decisão: adiar para rodada futura.**
2. **Densidade "real" (bugs/testes, ex. 15 bugs/40 testes)** — Label é campo do bug/issue no Jira; não
   existe Label em `Suite` nem em `TestCase`, então não há um "total de testes" natural por grupo de label.
   **Decisão: não fazer este item.** Densidade continua como contagem absoluta por combinação de labels.
3. **Filtros globais de Sprint/Release/Ambiente** e contexto "por Sprint/Release" no gráfico de
   Severidade — hoje só existem `Execution.sprint`/`Execution.version`/`Execution.responsible` como texto
   livre digitado na criação da execução (sem sincronização com o Jira), e não há conceito de "Ambiente"
   em nenhum model. **Decisão: manter fora de escopo** (só Projeto + Quadro, que já existem via
   `ProjectContext`/`BoardContext`).
4. **Drill-down (gráficos clicáveis)** — a tela "Bugs e Melhorias" (`JiraIssuesPage.tsx`) não filtra por
   label nem lê parâmetros de URL hoje; os gráficos Recharts do dashboard não têm `onClick` em `<Bar>`.
   **Decisão: não incluir nesta rodada**, manter como prioridade média/baixa do documento original.

Como consequência, o **Health Score** (seção "Melhoria futura" do documento) também fica fora desta
rodada — ele depende de comparar fatores ao longo do tempo, o mesmo bloqueio do item 1.

O restante deste plano cobre **o que sobrou como viável e ainda entrega valor real**, verificado contra os
arquivos atuais: `backend/src/dashboard/dashboard.service.ts`, `dashboard.constants.ts`,
`frontend/src/pages/dashboard/{QualidadeTab,EficienciaTab,OperacaoTab,shared}.tsx`,
`frontend/src/utils/priority.ts`, `frontend/src/api/client.ts`, e `backend/prisma/schema.prisma`.

---

## Escopo desta rodada

### Aba Qualidade

**1. Cards de resumo (Health KPIs) no topo** — 4 indicadores, sem tendência:
- **Taxa de Aprovação**: replicar o cálculo que `OperacaoTab.tsx` já faz (`successTotals`/`successRate`,
  a partir de `executionsApi.getRecent(projectId, boardId, { status: 'COMPLETED', limit:
  COMPLETED_EXECUTIONS_LIMIT })` + `progressOf` de `shared.ts`). Vale extrair um helper
  `computeSuccessRate(executions)` para `shared.ts` para não duplicar a lógica uma 2ª vez.
- **Cobertura de Requisitos** e **Cobertura de Automação**: já vêm prontos em `data.coverage`
  (`getQuality`) — só promover para o topo como KPI compacto; os cards detalhados de hoje continuam
  embaixo, sem mudança.
- **Bugs Críticos em Aberto** (novo dado): estender `getEfficiency` (`dashboard.service.ts`) para também
  retornar `openBugsBySeverity: { priority: string; count: number }[]`, calculado de graça dentro do loop
  que já existe sobre `bugs` (nenhuma chamada nova ao Jira). `QualidadeTab.tsx` passa a chamar
  `dashboardApi.getEfficiency(projectId, boardId)` em paralelo com `getQuality` (só para este KPI) e soma
  as entradas cujo `priorityLabel()` normalizado seja "Gravíssima" ou "Crítica" — evita duplicar a busca
  ao vivo de bugs (`fetchAllBugs`) dentro de `getQuality`.

**2. Tooltip enriquecido no gráfico Taxa de Sucesso × Severidade** (mantém o agrupamento por Execução já
implementado; não adiciona Sprint/Release, conforme decisão 3):
- Backend: em `findCompletedExecutionsWindow`, incluir `status` no select de `testCases`/`scenarios` (pra
  calcular executado/aprovado/reprovado por execução, mesma lógica de `progressOf` reimplementada no
  service — mesmo padrão já usado para `executionTitle`), e `type` no select de `issues` (`IssueLite`
  ganha `type: string`, campo que já existe em `Issue.type` no schema, só não é lido hoje).
- `severityByExecution` ganha `totalTests`/`failedTests` por execução, e cada entrada de `bySeverity`
  ganha `type` (bug vs melhoria) — mantém o empilhado único já confirmado antes, só enriquece o detalhe.
- Frontend: `SeverityTooltip` em `QualidadeTab.tsx` passa a mostrar "Total de testes", "Testes
  reprovados", e separa "Bugs" de "Melhorias" na quebra por severidade.

**3. Cobertura de Requisitos + Automação** — já implementado exatamente no formato pedido pelo documento
(`87% / 351 de 402 épicos`, `78% / 880 de 1130 casos`). **Nenhuma mudança necessária.**

### Aba Eficiência

**4. SLA em 3 estados** (em vez de só a contagem "acima do SLA"):
- Backend: no loop de `getEfficiency` sobre bugs abertos, classificar cada bug com SLA definido em
  🟢 dentro do prazo / 🟡 próximo do prazo / 🔴 acima do prazo. Limiar de "próximo" novo, configurável em
  `dashboard.constants.ts` (proposta: 80% do prazo da severidade, mesmo espírito de constante ajustável já
  usado em `SLA_DAYS_BY_PRIORITY`). Também contar `bugsWithoutSlaDefined` (prioridade que não bate com
  nenhuma chave da tabela — hoje é silenciosamente ignorado, ver `dashboard.service.ts:250-251`).
- Novo shape: `slaBuckets: { withinSla, nearSla, aboveSla, noSlaDefined }` (mantém `slaViolations` como
  detalhe de `aboveSla`, sem mudança nele).
- Frontend: `EficienciaTab.tsx` troca o card único "Bugs Acima do SLA" por 3 indicadores coloridos +
  nota "X bug(s) sem SLA definido" quando `noSlaDefined > 0`.

**5. Meta de MTTR vs Atual** (troca a versão "compara com mês passado" do documento, que cai na
tendência adiada, pela versão "Meta fixa configurável"):
- Backend: nova constante `MTTR_TARGET_DAYS` em `dashboard.constants.ts`. **Valor exato ainda não
  confirmado com o usuário** — usar um placeholder (ex. 20 dias, mesmo exemplo do documento original) e
  sinalizar explicitamente no código que precisa validação antes de considerar a feature pronta, mesmo
  tratamento de risco já assumido hoje para `SLA_DAYS_BY_PRIORITY`.
- `getEfficiency` retorna `mttrTargetDays` junto de `mttrDays`. Frontend mostra "Meta: X dias" abaixo do
  valor atual, com cor indicando se está dentro ou acima da meta.

**6. Idade Média com Maior/Menor idade** — trivial: `openAgesDays` já é um array calculado em
`getEfficiency`; expor `maxAgeDays`/`minAgeDays` (`Math.max`/`Math.min`), sem chamada nova. Frontend
mostra as duas linhas extra abaixo da idade média.

**7. Tabela de Bugs Acima do SLA — colunas novas**: `slaViolations` ganha `openedAt` (já é `bug.created`,
só não é repassado hoje) e `percentOfSla` (`Math.round((ageDays/slaDays)*100)`, mesma conta já feita pra
decidir se é violação). Frontend adiciona colunas "Data de Abertura" e "% do SLA" na tabela existente
(cobre os itens 2.4 e 2.5 do documento original, que são o mesmo dado).

### Melhorias gerais (aplicam-se às duas abas + Operação)

**8. Tooltips faltantes**: `InfoTooltip`/`Tooltip` já existem e cobrem quase tudo em Qualidade/Eficiência,
mas faltam em:
- `OperacaoTab.tsx`: seções "Atenção", "Ready for Test", "Últimos Bugs e Melhorias Criados", "Execuções em
  Andamento", "Últimas Execuções Concluídas" (só "Qualidade" tem `InfoTooltip` hoje).
- `EficienciaTab.tsx`: seção da tabela "Bugs Acima do SLA" (só os cards acima têm).

**9. Cores de saúde consistentes**: em `QualidadeTab.tsx`, a barra de "Densidade de Defeitos" usa
`var(--status-failed)` (vermelho) fixo independente do valor — exatamente o padrão que o documento pede
para evitar ("vermelho só como cor padrão"). Como densidade é contagem absoluta, sem um limiar bom/ruim
definido, trocar para uma cor neutra (ex. `var(--accent)`). Os demais usos de cor (`bandColor` em
Cobertura/Automação/Taxa de Sucesso, paleta de prioridade na Severidade) já seguem a convenção correta —
sem mudança neles.

---

## Fora de escopo desta rodada (decidido com o usuário, ver Contexto)

- Tendência (↑/↓) em qualquer indicador — precisa de snapshot histórico + job periódico.
- Densidade real bugs/testes — sem denominador natural (Label não existe em Suíte/Caso de Teste).
- Filtros globais de Sprint/Release/Ambiente e contexto "por Sprint/Release" no gráfico de Severidade —
  esses conceitos não existem sincronizados do Jira hoje.
- Drill-down (gráficos clicáveis) — exige suporte a filtro por label + leitura de URL em
  `JiraIssuesPage.tsx`, que não existe hoje; trabalho novo de tela+backend.
- Health Score — depende da tendência adiada.

---

## Arquivos críticos a alterar

- `backend/src/dashboard/dashboard.service.ts` — `getQuality` (status/type no select da janela,
  `totalTests`/`failedTests`/`type` em `severityByExecution`), `getEfficiency` (`openBugsBySeverity`,
  `slaBuckets`, `mttrTargetDays`, `maxAgeDays`/`minAgeDays`, `openedAt`/`percentOfSla` em
  `slaViolations`).
- `backend/src/dashboard/dashboard.constants.ts` — `SLA_WARNING_THRESHOLD`, `MTTR_TARGET_DAYS` (novo,
  com nota de valor não validado).
- `frontend/src/api/client.ts` — tipos `DashboardQuality`/`DashboardEfficiency` acompanham os campos
  novos do backend.
- `frontend/src/pages/dashboard/QualidadeTab.tsx` — seção de KPIs no topo, tooltip enriquecido, cor da
  Densidade de Defeitos.
- `frontend/src/pages/dashboard/EficienciaTab.tsx` — SLA em 3 estados, Meta de MTTR, maior/menor idade,
  colunas novas na tabela, tooltip faltante.
- `frontend/src/pages/dashboard/OperacaoTab.tsx` — só adicionar os 5 `InfoTooltip` faltantes.
- `frontend/src/pages/dashboard/shared.ts` — extrair `computeSuccessRate` se for reaproveitado por
  `OperacaoTab` e `QualidadeTab`.

## Verificação

- `tsc --noEmit` em backend e frontend sem erros novos; `nest build`/`vite build` ok.
- Testar com projeto Jira real (mesma ressalva já registrada no histórico do projeto: a feature atual
  ainda não foi validada end-to-end com dados reais): abrir a aba Qualidade e conferir os 4 KPIs e o
  tooltip enriquecido da Severidade; abrir Eficiência e conferir os 3 estados de SLA, a Meta de MTTR,
  maior/menor idade e as colunas novas da tabela.
- Testar um quadro sem bugs / sem execuções concluídas (empty states não devem quebrar com os campos
  novos ausentes/zerados).
- Confirmar que um bug com prioridade fora da tabela de SLA aparece em "sem SLA definido" em vez de
  simplesmente sumir da contagem (comportamento hoje silencioso).
