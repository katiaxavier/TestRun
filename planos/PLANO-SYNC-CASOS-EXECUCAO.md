# Sincronizar casos de teste dentro da execução

## Contexto

Hoje uma execução é um **snapshot** feito no momento da criação: `ExecutionsService.create` (`backend/src/executions/executions.service.ts:218`) copia os casos de teste da suíte para `ExecutionTestCase` e os cenários template para `Scenario`. Depois disso nada mais entra.

Durante um ciclo em andamento é comum surgir um caso de teste novo. Hoje o usuário sincroniza a suíte (`POST /suites/sync`, tela de Suítes) — a suíte é atualizada, mas a execução aberta continua com os casos antigos, obrigando a criar um ciclo novo só para pegá-los.

**Resultado esperado:** um botão "Sincronizar" no cabeçalho da execução que, em um clique, atualiza a(s) suíte(s) a partir do Jira e traz para dentro da execução tudo que faltava — casos de teste novos e cenários novos —, sem tocar em nada que já foi testado.

## Decisões acordadas

1. **Escopo:** Jira → suíte → execução, em um clique. O botão reusa a importação do Jira que a sincronização de suítes já faz e depois faz o diff suíte→execução.
2. **Cenários:** cenários template criados no TestRun depois do início do ciclo também entram, inclusive em casos de teste que já estão na execução.
3. **Remoções manuais:** o sync é espelho da suíte — um caso removido manualmente da execução volta. Sem novo campo de exclusões, sem migration.

## Backend

### 1. Wiring — `backend/src/executions/executions.module.ts`

Adicionar `SuitesModule` aos `imports` (ele já exporta `SuitesService`). Sem ciclo: `SuitesModule` importa apenas `JiraModule` e `ProjectsModule`.

### 2. Rota — `backend/src/executions/executions.controller.ts`

```ts
@Post(':id/sync')
@ProjectAccess('execution')
async sync(@Param('id') id: string, @CurrentUser() user: User) {
  return this.executionsService.syncExecution(id, user.id, user.displayName);
}
```

### 3. `ExecutionsService.syncExecution(executionId, userId, creatorDisplayName)`

Injetar `SuitesService` no construtor (ao lado de `PrismaService` e `JiraService`).

**Passo 1 — carregar a execução e descobrir as suítes de origem**
- `findUnique` da execução com `testCases: { include: { scenarios: true, testCase: true } }`.
- 404 `'Ciclo de execução não encontrado.'` se não existir.
- Se `suiteId` → uma suíte. Se `batchId` → `batch.suiteIds` (JSON) e o set `batch.excludedTestCaseIds`, exatamente como `createBatchExecution` (`executions.service.ts:558`).

**Passo 2 — atualizar as suítes a partir do Jira**
Para cada suíte com `jiraKey`, chamar `this.suitesService.importFromJira(suite.jiraKey, userId, suite.projectId)` — **sem** passar `boardId`, para não mexer nas associações de quadro. Suítes manuais (`jiraKey` nulo) são puladas em silêncio.
Erros por suíte são coletados em `jiraFailed: { key, error }[]` e **não abortam** o sync (mesmo padrão de `syncBoardSuites`, `backend/src/suites/suites.service.ts:195`) — o diff local ainda roda.

**Passo 3 — recarregar as suítes já atualizadas**
`suite.findMany({ where: { id: { in: suiteIds } }, include: { testCases: { include: { scenarioTemplates: true }, orderBy: { jiraKey: 'asc' } } } })`.

**Passo 4 — diff casos de teste**
Set dos `testCaseId` já presentes na execução. Para cada caso da suíte ausente (e não em `excluded`, no caso de lote): criar `ExecutionTestCase` `status: 'PENDING'`, `responsible: creatorDisplayName`, e um `Scenario` PENDING por template. Registrar `{ jiraKey, title }` em `addedTestCases`.

**Passo 5 — diff cenários dos casos que já estavam na execução**
Para cada `etc` pré-existente, comparar os **nomes** dos templates do caso com os nomes dos `scenarios` do `etc` e, para cada faltante, chamar `this.createScenario(etc.id, { name })` dentro de `try/catch` que engole o `CONFLICT`.
Reusar `createScenario` (`executions.service.ts:730`) é essencial: ela já trata o caso "primeiro cenário do item", salvando `originalStatus` e migrando as issues do `ExecutionTestCase` para o cenário. Ela também reaproveita o template existente pelo nome, então não duplica nada na suíte. Contar em `addedScenarios` e guardar os `etc.id` afetados.

**Passo 6 — recalcular status**
Para cada `etc` afetado no passo 5: `recomputeTestCaseStatus(etcId)`; depois `recomputeExecutionStatus(executionId)` uma vez. Isso é o que faz um caso PASSED que ganhou cenário novo voltar para PENDING/IN_PROGRESS — reversível, porque `originalStatus` foi salvo e a lógica de restauração já existe (`executions.service.ts:893`). Os itens do passo 4 não precisam de recompute (nascem PENDING).

**Retorno**
```ts
{
  addedTestCases: { jiraKey: string; title: string }[],
  addedScenarios: number,
  jiraFailed: { key: string; error: string }[],
}
```
O front refaz o `GET /executions/:id`.

## Frontend

### 4. `frontend/src/api/client.ts` (em `executionsApi`)

```ts
sync: (id: string) =>
  api.post<{
    addedTestCases: { jiraKey: string; title: string }[];
    addedScenarios: number;
    jiraFailed: { key: string; error: string }[];
  }>(`/executions/${id}/sync`),
```

### 5. `frontend/src/pages/ExecutionRunPage.tsx`

- Estados `syncing` e `syncResult`, espelhando `SuitesPage.tsx:152`.
- `handleSync`: chama `executionsApi.sync(id)`, guarda o resultado e chama `fetchExecution()` para recarregar. No `catch`, ler `err?.response?.data?.message` com o guard `Array.isArray(msg) ? msg.join(' ') : msg`.
- **Botão** no cluster de ações do cabeçalho, antes de Excel/PDF/Excluir:
  ```tsx
  <button className="btn btn-secondary" style={{ height: 48 }} onClick={handleSync} disabled={syncing}>
    {syncing
      ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Sincronizando...</>
      : <><ArrowsClockwise size={16} /> Sincronizar</>}
  </button>
  ```
- **Feedback:** banner dispensável logo abaixo do `.page-header`, copiando o bloco de `SuitesPage.tsx:298-336` (verde `var(--status-passed-bg)` / vermelho `var(--danger-bg)` conforme `jiraFailed.length`):
  - nada novo → `"Execução já está em dia com a suíte. Nenhum caso de teste novo."`
  - com novidades → `"Sincronização concluída: N caso(s) de teste e M cenário(s) adicionados."` + lista `JIRAKEY · título`.
  - `jiraFailed` não vazio → linha extra `"Não foi possível atualizar do Jira: KEY: erro"`, mantendo o resto do resumo.

## Testes

`describe('syncExecution')` em `backend/src/executions/executions.service.spec.ts`, com `SuitesService` mockado:
- adiciona só os casos ausentes, com `responsible` = usuário logado e um `Scenario` por template;
- adiciona cenário faltante em `etc` pré-existente via `createScenario` e recalcula o status do caso;
- não duplica cenário cujo nome já existe no `etc`;
- respeita `excludedTestCaseIds` em execução de lote;
- falha do Jira em uma suíte vai para `jiraFailed` e o diff local continua rodando;
- suíte manual (`jiraKey` nulo) não chama `importFromJira`.

## Verificação end-to-end

1. `docker compose up -d` (Postgres) e subir `backend` (`npm run start:dev`) + `frontend` (`npm run dev`).
2. `cd backend && npx jest src/executions/executions.service.spec.ts`.
3. Criar uma execução a partir de uma suíte com N casos.
4. **Caso Jira:** criar um Test Case novo no Jira ligado à suíte → abrir a execução → **Sincronizar** → o caso novo aparece na tabela como PENDENTE e o banner lista a chave dele; o progresso passa a N+1.
5. **Caso cenário:** na tela da suíte, adicionar um cenário a um caso de teste já testado (PASSED) na execução → **Sincronizar** → o cenário novo entra como PENDENTE e o caso volta para EM ANDAMENTO/PENDENTE.
6. **Idempotência:** clicar em Sincronizar de novo → banner "já está em dia", nada duplicado.
7. **Lote:** repetir em uma execução de lote (`/batch/:id`) e conferir que um caso excluído do lote **não** é readicionado.
8. **Sem regressão:** exportar Excel/PDF da execução sincronizada e conferir o Dashboard (aba Qualidade) com o ciclo alterado.
