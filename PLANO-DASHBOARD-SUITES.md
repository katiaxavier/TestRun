# Dashboard de execuções + toggle lista/cards nas Suítes

## Context

Hoje a tela inicial (`/`) do TestRun é implementada em `frontend/src/pages/DashboardPage.tsx` — apesar do
nome, essa página é a listagem de Suítes + Lotes, não um dashboard de métricas. Não existe nenhuma visão
que mostre execuções em andamento ou histórico recente sem entrar no detalhe de uma suíte/lote específico.
Também não existe alternativa de visualização em lista para a listagem de Suítes/Lotes — só cards.

O objetivo é:
1. Adicionar um toggle lista/cards na listagem de Suítes+Lotes (hoje só existe visualização em cards).
2. Criar uma tela de Dashboard de verdade, que vira a nova home, mostrando a execução ativa (em andamento)
   e as últimas execuções — escopado ao Projeto+Quadro selecionados, igual ao resto do app hoje.

Decisões confirmadas com o usuário:
1. **Dashboard substitui `/` como home**; a listagem atual de Suítes/Lotes é renomeada e move para `/suites`,
   com item próprio no sidebar.
2. **Escopo por Projeto+Quadro selecionados** — mesmo padrão de hoje, sem visão global entre quadros.
3. **Toggle lista/cards vale para Suítes e Lotes juntos** (já são exibidos na mesma grid combinada).
4. **Entrega faseada**: toggle lista/cards primeiro (menor risco, só frontend); Dashboard depois (precisa de
   endpoint novo no backend).

**Sequenciamento**: a renomeação de rota (`/` → `/suites`) entra na Fase 1, junto com o toggle — não na
Fase 2. A Fase 1 já mexe no arquivo da listagem para adicionar o toggle, então é mais barato mover/renomear
no mesmo passe, evitando reabrir o mesmo arquivo duas vezes e misturar risco de roteamento com risco de
feature nova na Fase 2.

---

## Fase 1 — Renomear rota + toggle lista/cards ✅ Concluída

### 1a. Renomear `DashboardPage` → `SuitesPage`

- `frontend/src/pages/DashboardPage.tsx` renomeado para `frontend/src/pages/SuitesPage.tsx`
  (componente `DashboardPage` → `SuitesPage`). Título "Suítes de Teste" mantido.
- `frontend/src/App.tsx`: rota `/` agora é `<Navigate to="/suites" replace />`; nova rota `<Route path="/suites" element={<SuitesPage />} />`.
  `ExitDetailOnContextSwitch` passou a navegar para `/suites` ao trocar projeto/quadro numa tela de detalhe.
- `frontend/src/components/Sidebar.tsx`: item de navegação aponta para `/suites`.
- `frontend/src/components/TopBar.tsx`: título "Suítes de Teste" mapeado para `/suites`.
- Demais `navigate('/')` que significavam "voltar para a listagem" corrigidos para `navigate('/suites')`
  em `SuiteDetailPage.tsx`, `BatchExecutionPage.tsx` e `ExecutionRunPage.tsx` (5 pontos, confirmados via grep).

### 1b. Toggle lista/cards

- Estado `viewMode: 'grid' | 'list'` em `SuitesPage.tsx`, persistido em `localStorage` (`suites-view-mode`),
  mesmo padrão do `sidebar-collapsed` já usado em `App.tsx`.
- Novo componente `frontend/src/components/SuiteBatchTable.tsx` para o modo lista — não reaproveita
  `TestCaseList.tsx` (modelado em cima de campos de `TestCase`, não serve para o feed misto de Suíte+Lote).
  Usa a convenção `.table-wrapper` + `<table>` já estilizada em `index.css`. Colunas: checkbox (só suítes),
  Tipo (SUITE/LOTE), Chave(s), Título/Nome, Casos, Execuções, Criado em, Ações (mesmo `DropdownMenu` de excluir
  usado nos cards).
- Botões de alternância (`GridFourIcon` / `ListIcon`) reaproveitam as classes `.filter-item`/`.active` já
  usadas nas abas "Todas/Suítes/Lotes" — sem CSS novo.
- Seleção múltipla de suítes para "Criar Lote" funciona igual em ambos os modos, via a coluna de checkbox
  no modo lista.

**Verificação feita**: `tsc` sem erros novos (comparado via `git stash` com o estado anterior); nenhum
`navigate('/')` órfão restante; módulos novos/alterados servidos com sucesso (200) pelo Vite dev server já
rodando via docker-compose. Teste manual do toggle/seleção múltipla no navegador fica pendente de validação
pelo usuário (ambiente sem OAuth Atlassian configurado e sem ferramenta de automação de navegador disponível
nesta sessão).

---

## Fase 2 — Nova tela de Dashboard como home (pendente)

### Backend: endpoint agregado de execuções

No módulo `executions` já existente (sem módulo novo):

- `backend/src/executions/executions.controller.ts`: novo `@Get()` (não colide com `@Get(':id')` existente),
  com `@ProjectAccess('direct')` — mesma convenção usada em `suites.controller.ts` para acesso via `projectId`
  de query.
  ```ts
  @Get()
  @ProjectAccess('direct')
  async findRecent(
    @Query('projectId') projectId: string,
    @Query('boardId') boardId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.executionsService.findRecentExecutions(projectId, boardId, status, limit ? Number(limit) : undefined);
  }
  ```
- `backend/src/executions/executions.service.ts`: novo método `findRecentExecutions`, modelado em cima de
  `findAllBatches` (tratamento de `boardId === 'none'`) e do padrão `boards: {none:{}}`/`{some:{id}}` já usado
  em `SuitesService.findAll`. Como `Execution` não tem `projectId`/`boardId` direto, o filtro vai via `suite`
  ou `batch`:
  ```ts
  async findRecentExecutions(projectId: string, boardId?: string, status?: string, limit = 3) {
    const boardFilterSuite = boardId === 'none' ? { boards: { none: {} } } : boardId ? { boards: { some: { id: boardId } } } : {};
    const boardFilterBatch = boardId === 'none' ? { boardId: null } : boardId ? { boardId } : {};

    return this.prisma.execution.findMany({
      where: {
        OR: [
          { suite: { projectId, ...boardFilterSuite } },
          { batch: { projectId, ...boardFilterBatch } },
        ],
        ...(status ? { status: status.toUpperCase() } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit ?? 3, 50),
      include: {
        suite: { select: { id: true, jiraKey: true, manualKey: true, title: true } },
        batch: { select: { id: true, name: true } },
        testCases: { select: { status: true, scenarios: { select: { status: true } } } },
      },
    });
  }
  ```
  `include` deliberadamente enxuto (só o necessário para `ExecutionCard` — status + progresso), sem
  `issues`/detalhes completos, para manter o payload leve por ser widget de home.
- Um único endpoint serve os dois usos, variando os params:
  - Ativa: `GET /executions?projectId=&boardId=&status=IN_PROGRESS&limit=1`
  - Últimas N: `GET /executions?projectId=&boardId=&limit=3`
- Edge case: se houver mais de uma execução em andamento simultânea (suíte + lote independentes), "a ativa"
  é a mais recente (`createdAt desc`, `limit=1`). UI deve deixar isso claro ("execução em andamento mais recente").

### Frontend: API client

`frontend/src/api/client.ts`, adicionar a `executionsApi`:
```ts
getRecent: (projectId?: string, boardId?: string, opts?: { limit?: number; status?: string }) =>
  api.get<Execution[]>('/executions', { params: { projectId, boardId, limit: opts?.limit, status: opts?.status } }),
```

### Frontend: nova `DashboardPage.tsx`

Criar `frontend/src/pages/DashboardPage.tsx` do zero (nome livre após o rename da Fase 1).

- `const RECENT_EXECUTIONS_LIMIT = 3;` no topo.
- Mesmo escopo de dados que `SuitesPage`: `useProject()`/`useBoard()`, passando `selectedBoard.id`
  (incluindo o pseudo-id `'none'`) para `getRecent`, igual ao `fetchSuites` já faz hoje.
- Estado: `activeExecution: Execution | null`, `recentExecutions: Execution[]`, `loading: boolean`.
- Fetch em paralelo (`Promise.all`) chamando `getRecent` duas vezes (ativa + últimas N), disparado pelo
  mesmo padrão de `useEffect([selectedProject, selectedBoard])` já usado em `SuitesPage`.
- Polling: reaproveitar o padrão existente de 15s-enquanto-em-andamento (igual `SuiteDetailPage.tsx` e
  `BatchExecutionPage.tsx`) — só ativa o `setInterval` quando `activeExecution?.status === 'IN_PROGRESS'`.
- Loading/empty states seguindo exatamente as convenções já usadas em `SuitesPage` (`.loading-page`+`.spinner`,
  `.empty-state` com ícone Phosphor 56px + h3 + p + CTA opcional).
- **Painel de execução ativa**: título "Execução em Andamento"; se existir, reaproveitar `<ExecutionCard>`
  (já tem badge de status + barra de progresso), `onClick` navegando para `/execution/:id`; se não existir,
  `.empty-state` menor ("Nenhuma execução em andamento" + CTA "Ver Suítes" → `/suites`).
- **Últimas execuções**: título "Últimas Execuções"; se vazio, `.empty-state` + CTA para `/suites`; senão,
  `.map` simples de `recentExecutions` em `<ExecutionCard>` empilhados — não reaproveitar `ExecutionList.tsx`
  inteiro (seus filtros de status/data são desenhados para histórico completo, seriam ruído num widget de 3 itens).
- Estatísticas extras (`.stats-grid`/`.stat-card` hoje sem uso, `recharts` instalado e sem uso): **não incluir
  nesta fase** — com só 1 execução ativa + 3 últimas, não há volume de dados que justifique gráfico de tendência.
  Follow-up natural quando existir um endpoint de relatório mais amplo.
- Wiring:
  - `App.tsx`: trocar o redirect temporário por `<Route path="/" element={<DashboardPage />} />`.
  - `ExitDetailOnContextSwitch`: voltar o redirect para `navigate('/')` (agora aponta pro Dashboard).
  - `Sidebar.tsx`: adicionar novo item no topo do array `links`: `{ to: '/', label: 'Dashboard', icon: GaugeIcon, end: true }`.
  - `TopBar.tsx`: adicionar `{ match: p => p === '/', title: 'Dashboard', Icon: GaugeIcon }` ao array `routes`.

### Riscos / casos de borda

- Sem colisão de rota: `/suites` não bate no regex de detalhe; `GET /executions` (sem id) não colide com
  `GET /executions/:id` no NestJS.
- `boardId === 'none'` (pseudo-quadro "Sem quadro") precisa ser tratado igual ao `SuitesService.findAll`/
  `findAllBatches` já fazem — senão o Dashboard vaza dados de outros quadros para projetos que usam "Sem quadro".
- Sem execução ativa / menos de 3 execuções passadas: tratado com empty-state por seção (não um empty-state
  de página inteira, já que os dois painéis são independentes).
- Múltiplas execuções em andamento simultâneas: comportamento documentado (mostra a mais recente como "ativa"),
  não é bug.

---

## Arquivos críticos

- `frontend/src/App.tsx`
- `frontend/src/pages/DashboardPage.tsx` (Fase 1: renomeado para `SuitesPage.tsx` ✅; Fase 2: recriado do
  zero para a nova home)
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/TopBar.tsx`
- `frontend/src/components/SuiteBatchTable.tsx` (novo, Fase 1 ✅)
- `backend/src/executions/executions.controller.ts`
- `backend/src/executions/executions.service.ts`
- `frontend/src/api/client.ts`

---

## Verificação

- **Fase 1** (feito parcialmente — ver nota na seção da Fase 1): confirmar no navegador que `/` redireciona
  para `/suites`, que os botões "voltar" das telas de detalhe levam para `/suites`, que trocar projeto/quadro
  numa tela de detalhe volta para `/suites`. Testar o toggle lista/cards: alternar, recarregar a página e
  confirmar que a preferência persiste (`localStorage`); testar seleção múltipla de suítes para criar lote
  funcionando em ambos os modos.
- **Fase 2**: com uma execução em andamento, confirmar que o Dashboard mostra o painel ativo e que ele
  atualiza sozinho (polling 15s); marcar a execução como concluída e confirmar que o painel muda para o
  empty-state; conferir a lista de últimas execuções com 0, 1, 2 e 3+ execuções existentes; trocar
  projeto/quadro e confirmar que os dados do Dashboard mudam de escopo corretamente, inclusive com quadro
  "Sem quadro" selecionado.
