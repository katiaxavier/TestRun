**Título:** Suites Manuais e Melhorias em Cenários/Charters

## Objetivo

Permitir a criação de suites diretamente no sistema, sem depender de hierarquia pai-filho no Jira, e suportar o modelo de testes exploratórios (charters) com cenários definidos no caso de teste e reaproveitados entre execuções.

---

## Contexto

Atualmente, criar uma suite exige importar um ticket do Jira que possua filhos. Os filhos tornam-se os casos de teste da suite.

Esse modelo não cobre o cenário de testes exploratórios (charters), onde o ticket da charter é uma folha no Jira — sem sub-tasks — e as áreas de concentração são definidas pelo próprio testador.

Além disso, há casos em que o testador quer montar uma seleção personalizada de tickets para uma execução, sem que exista essa agrupação no Jira.

A funcionalidade de Cenários já foi implementada (branch `feature/scenarios-charter`). Durante o uso foram identificados dois bugs críticos e oportunidades de melhoria que também fazem parte deste escopo.

---

## Funcionalidade 1 — Suite Manual

Adicionar a opção de criar uma suite manualmente no sistema, onde o testador define o nome e adiciona casos de teste um a um pelo key do Jira.

### Fluxo

```
1. Testador cria suite manual com um nome ("DT-Rígidos Sprint 42")
2. Busca e adiciona tickets do Jira pelo key (ex: PD-20767)
3. Cada ticket adicionado vira um caso de teste na suite
4. Suite fica disponível para criar execuções normalmente
```

### Estrutura resultante

```
Suite manual: "DT-Rígidos Sprint 42"
  ├─ TestCase: PD-20767  ← charter importada pelo key
  ├─ TestCase: PD-9097
  └─ TestCase: PD-18520
```

### Comportamento

**Criação**

Na tela de criação de suite, adicionar dois modos:

- **Importar do Jira** — comportamento atual, importa suite pelo key com seus filhos
- **Criar manualmente** — usuário define o nome e adiciona tickets avulsos

**Adição de casos de teste**

Na suite manual, o usuário busca um ticket pelo key do Jira. O sistema consulta o Jira, exibe o título e a prioridade para confirmação, e adiciona como caso de teste.

O usuário pode adicionar quantos tickets quiser, um a um.

**Remoção de casos de teste**

Casos de teste podem ser removidos da suite manual individualmente.

### Mudanças no modelo de dados

Nenhuma mudança de schema necessária para esta funcionalidade.

O `TestCase` já possui `suiteId` obrigatório — a suite manual cumpre esse papel normalmente. A origem da suite (Jira ou manual) não precisa ser rastreada no banco.

---

## Funcionalidade 2 — Cenários/Áreas de Concentração

Adicionar a possibilidade de definir **Cenários** em um Caso de Teste dentro da suite. Esses cenários funcionam como template e são copiados para cada execução, podendo ser ajustados durante a execução sem alterar o template.

### Modelo: template e instância

```
TestCase (suite)
  └─ TestCaseScenario[]     ← template (nome apenas)
       ├─ "Processamento A"
       ├─ "Processamento B"
       └─ "Processamento C"

ExecutionTestCase (execução)
  └─ ExecutionTestCaseScenario[]   ← instância (nome, status, issues)
       ├─ "Processamento A"   → templateId: X
       ├─ "Processamento B"   → templateId: X
       ├─ "Processamento C"   → templateId: X
       └─ "Novo escopo"       → templateId: null  ← adicionado durante execução
```

### Comportamento

**Casos de Teste sem Cenários**

O comportamento atual permanece inalterado.

**Casos de Teste com Cenários**

Quando um ou mais cenários forem definidos no `TestCase`:

- O status deixa de ser controlado diretamente no Caso de Teste
- O status passa a ser controlado individualmente por cada cenário
- Issues passam a ser vinculadas ao cenário
- Evidências passam a ser vinculadas ao cenário
- Comentários passam a ser vinculados ao cenário

**Criação de execução**

Ao criar uma execução a partir de uma suite, os `TestCaseScenario` de cada caso de teste são copiados como `ExecutionTestCaseScenario`, com status inicial `PENDING`.

**Adição de cenário durante a execução**

- Cria o `ExecutionTestCaseScenario` na execução corrente
- Cria também um `TestCaseScenario` no template do `TestCase`
- A próxima execução da mesma suite já virá com o novo cenário

**Remoção de cenário durante a execução**

- Remove apenas o `ExecutionTestCaseScenario` da execução corrente
- O `TestCaseScenario` no template **não é alterado**

### Interface

**Na suite (definição do template)**

Dentro do Caso de Teste na tela de suite, botões:

```
+ Adicionar Cenário    + Cenários em Lote
```

**Adição individual:**
```
Nome do Cenário
[________________]

[Salvar]
```

**Adição em lote** (textarea, um cenário por linha):

```
┌──────────────────────────────────────────────────────┐
│  Adicionar Cenários em Lote                          │
│                                                      │
│  Cole os nomes, um por linha:                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ Processamento A                                │  │
│  │ Processamento B                                │  │
│  │ Processamento C                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Preview: 3 cenários serão criados                   │
│                                                      │
│          [Cancelar]     [Criar 3 Cenários]           │
└──────────────────────────────────────────────────────┘
```

**Na execução (registro de resultados)**

Os mesmos botões `+ Adicionar Cenário` e `+ Cenários em Lote` estão disponíveis para adicionar novos cenários durante a execução. A exibição dos cenários:

```
▼ Teste A

Status Geral: Failed

Cenários

✓ Processamento A
✗ Processamento B
✓ Processamento C
✓ Novo escopo
```

### Dados do Cenário

Cada cenário de execução possui:

- Nome
- Status
- Issues

Ao clicar no cenário abre o drawer igual ao do Caso de Teste.

---

## Bugs e Melhorias em Cenários

### Bug 1 — Issues "Fantasmas" Pré-Cenário

**Problema:**
Quando um caso de teste já possui issues (B&M) cadastradas e o usuário cria cenários,
essas issues continuam sendo contabilizadas na coluna B&M da tabela de execução,
mas não podem ser acessadas — o drawer passa a exibir a lista de cenários no lugar do painel de B&M.

**Solução:**
Ao criar o **primeiro cenário** em um caso de teste que já possui issues, exibir um **wizard informativo**:

```
┌────────────────────────────────────────────────────────────┐
│  Criando modo Cenários                                     │
│                                                            │
│  Este caso possui 2 issues que serão movidas               │
│  para o primeiro cenário criado.                           │
│                                                            │
│  Nome do primeiro cenário: [________________]              │
│                                                            │
│           [Cancelar]           [Criar Cenário]             │
└────────────────────────────────────────────────────────────┘
```

- O wizard **só aparece** quando `tc.issues.length > 0` e `tc.scenarios.length === 0`
- As issues são **migradas automaticamente** para o novo cenário (sem opção de escolha)
- Quando **não há issues**, nenhum wizard é exibido — cria o cenário normalmente

**Regra de restauração (ao deletar o último cenário):**
- As issues do cenário deletado voltam automaticamente para o nível do caso de teste
- O status original do caso de teste é restaurado automaticamente
- Nenhuma confirmação é solicitada ao usuário

---

### Bug 2 — Cenários Não Contabilizados no Progresso e Relatório

**Problema:**
Cenários não entram na contagem total da execução. Um caso de teste com 3 cenários
conta apenas como 1 no progresso e no relatório.

**Solução — Contagem Efetiva:**

| Situação | Contribuição para o total |
| -------- | ------------------------- |
| TC sem cenários | 1 |
| TC com N cenários | N |

**Progresso (frontend):**
Cálculo muda de `tcs.length` para contagem efetiva:
- TCs sem cenários contribuem individualmente com seu status
- TCs com cenários contribuem com o status de cada cenário individualmente

**Relatório Excel:**
- A exibição permanece igual (sub-linhas indentadas com `↳`, sem alteração visual)
- A célula de status do **TC pai** fica **em branco** quando há cenários
- `Total de Testes` passa a usar a contagem efetiva

**Relatório PDF:**
- Mesma lógica de contagem efetiva
- Exibição visual mantida (TC como cabeçalho + cenários como sub-linhas)

---

### Melhoria — Preservação do Status Original

**Motivação:** Ao criar o primeiro cenário, o status do TC (ex: `Passou`) era sobrescrito
para `PENDING` pela recomputação automática, perdendo o progresso registrado.

**Comportamento:**
- Todos os cenários criados iniciam com status `PENDING`
- O status original do TC é salvo internamente no campo `originalStatus`
- Quando o último cenário é deletado, o `originalStatus` é restaurado ao TC

---

## Fora do Escopo (decisão)

| Item | Decisão |
| ---- | ------- |
| Ordenação de cenários | Mantém ordem de criação, sem drag & drop |
| Evidências nos cenários | Sem novos campos; cenários têm os mesmos campos do TC atual |
| Leitura de áreas de concentração do Jira | Não implementar; testador define os cenários manualmente |
| Override manual de status do TC com cenários | Não implementar |

---

## Mudanças Técnicas

### Schema (Prisma)

Novo modelo `TestCaseScenario` (template):

```prisma
model TestCaseScenario {
  id         String   @id @default(uuid())
  testCaseId String
  testCase   TestCase @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
  name       String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

`ExecutionTestCaseScenario` ganha referência opcional ao template:

```prisma
templateId String?  // referência ao TestCaseScenario de origem; null se criado durante execução
```

`ExecutionTestCase` ganha campo para preservação de status:

```prisma
originalStatus String?  // status antes do modo cenários; usado para restauração
```

### Backend — `executions.service.ts`

**Criação de execução:** ao instanciar os `ExecutionTestCase`, copiar os `TestCaseScenario` de cada `TestCase` como `ExecutionTestCaseScenario` com status `PENDING`.

**`createScenario` (durante execução):**
1. Cria `ExecutionTestCaseScenario` na execução
2. Cria `TestCaseScenario` no template do `TestCase`
3. Salva `originalStatus` e migra issues se for o primeiro cenário

**`createScenarioBatch`:**
1. Aplica a lógica acima para cada nome recebido
2. Disponível na suite e durante a execução
3. Endpoint: `POST /executions/:id/test-cases/:etcId/scenarios/batch` — Body: `{ names: string[] }`

**`deleteScenario` (durante execução):**
1. Remove apenas o `ExecutionTestCaseScenario`
2. Não altera o `TestCaseScenario`
3. Se for o último: move issues de volta ao TC e restaura `originalStatus`

### Backend — `reports.service.ts`

**Excel:** `Total de Testes` usa contagem efetiva; célula de status do TC pai fica em branco quando há cenários.

**PDF:** `totalTests`, `passedTests`, `failedTests`, `blockedTests` calculados com contagem efetiva.

### Frontend — `ExecutionRunPage.tsx`

**Cálculo de progresso:**
```typescript
const effectiveItems = tcs.flatMap(tc =>
  tc.scenarios.length > 0 ? tc.scenarios : [tc]
);
const counts = {
  total:   effectiveItems.length,
  passed:  effectiveItems.filter(i => i.status === 'PASSED').length,
  failed:  effectiveItems.filter(i => i.status === 'FAILED').length,
  blocked: effectiveItems.filter(i => i.status === 'BLOCKED').length,
  pending: effectiveItems.filter(i => i.status === 'PENDING').length,
};
```

**Wizard (Bug 1):** abre quando `tc.issues.length > 0 && tc.scenarios.length === 0`.

**Modal de lote:** textarea + preview de contagem de linhas; disponível na suite e na execução.

### Frontend — `client.ts`

```typescript
createScenarioBatch: (executionId: string, etcId: string, names: string[]) =>
  api.post<Scenario[]>(`/executions/${executionId}/test-cases/${etcId}/scenarios/batch`, { names }),
```

---

## Compatibilidade

- Suites importadas do Jira continuam funcionando normalmente.
- Suites manuais são tratadas como `Suite` normais no banco — sem distinção de origem nas execuções e lotes.
- Lotes de execução (`ExecutionBatch`) funcionam com suites manuais sem nenhuma alteração.
- Casos de teste sem cenários: comportamento 100% inalterado.
- Relatório visual (sub-linhas): sem alteração.
- Integração com Jira: sem alteração.
- Dados existentes: `originalStatus` e `templateId` são nullable, sem impacto em registros anteriores.
