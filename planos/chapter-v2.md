**Título:** Melhorias e Correções no Suporte a Cenários/Charters

## Objetivo

Corrigir bugs identificados na implementação atual de Cenários e adicionar melhorias de usabilidade,
mantendo compatibilidade total com o comportamento existente de casos de teste sem cenários.

---

## Contexto

A funcionalidade de Cenários já foi implementada (branch `feature/scenarios-charter`).
Durante o uso foram identificados dois bugs críticos e oportunidades de melhoria.

---

## Bugs a Corrigir

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

**Exemplo:**
```
2 casos de teste, sendo que 1 deles possui 2 cenários
→ Total efetivo: 3
```

**Progresso (frontend):**
Cálculo muda de `tcs.length` para contagem efetiva:
- TCs sem cenários contribuem individualmente com seu status
- TCs com cenários contribuem com o status de cada cenário individualmente

**Relatório Excel:**
- A exibição permanece igual (sub-linhas indentadas com `↳`, sem alteração visual)
- A célula de status do **TC pai** fica **em branco** quando há cenários
  - Isso evita dupla contagem nas fórmulas `COUNTIF` já existentes
  - Os cenários (sub-linhas) continuam tendo suas células de status preenchidas normalmente
- `Total de Testes` passa a usar a contagem efetiva

**Relatório PDF:**
- Mesma lógica de contagem efetiva
- Exibição visual mantida (TC como cabeçalho + cenários como sub-linhas)

---

## Melhorias

### Melhoria 1 — Criação em Lote de Cenários

**Motivação:** Casos de teste exploratórios costumam ter muitas áreas de concentração.
Criar uma por uma é lento.

**Comportamento:**
Adicionar botão **"+ Cenários em Lote"** ao lado do botão "+ Adicionar Cenário" existente.

Ao clicar, abre modal com textarea:

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

- Linhas em branco são ignoradas
- O wizard de migração de issues se aplica normalmente se for o primeiro cenário
- Novo endpoint no backend: `POST /executions/:id/test-cases/:etcId/scenarios/batch`
  - Body: `{ names: string[] }`

---

### Melhoria 2 — Preservação do Status Original

**Motivação:** Ao criar o primeiro cenário, o status do TC (ex: `Passou`) era sobrescrito
para `PENDING` pela recomputação automática, perdendo o progresso registrado.

**Comportamento:**
- Todos os cenários criados iniciam com status `PENDING` (sem herdar o status do TC)
- O status original do TC é salvo internamente no campo `originalStatus`
- Quando o último cenário é deletado, o `originalStatus` é restaurado ao TC

---

## Fora do Escopo (decisão)

| Item | Decisão |
| ---- | ------- |
| Ordenação de cenários | Mantém ordem de criação, sem drag & drop |
| Evidências nos cenários | Sem novos campos; cenários têm os mesmos campos do TC atual |
| Sugestão de cenários a partir do Jira | Adiado; criação em lote via copy/paste supre a necessidade |
| Override manual de status do TC com cenários | Não implementar |

---

## Mudanças Técnicas

### Schema (Prisma)

Adicionar campo em `ExecutionTestCase`:

```prisma
originalStatus String?   // status antes do modo cenários; usado para restauração
```

### Backend — `executions.service.ts`

**`createScenario`** — quando for o primeiro cenário:
1. Salva `originalStatus = tc.status` no `ExecutionTestCase`
2. Migra todas as issues do TC para o novo cenário (`scenarioId`, `executionTestCaseId = null`)

**`createScenarioBatch`** — novo método:
1. Aplica a lógica de primeiro cenário (migração de issues + salvar `originalStatus`) se necessário
2. Cria os N cenários em sequência

**`deleteScenario`** — quando for o último cenário:
1. Move as issues do cenário deletado de volta ao TC (`executionTestCaseId`, `scenarioId = null`)
2. Restaura `originalStatus` ao campo `status` do TC
3. Limpa `originalStatus`

### Backend — `reports.service.ts`

**Excel (individual):**
- `Total de Testes` (G6): passa a usar contagem efetiva
- TC pai com cenários: célula de status (coluna E) fica em branco
- Fórmulas `COUNTIF` existentes contabilizam naturalmente só as linhas de cenários e TCs sem cenários

**PDF (individual):**
- `totalTests` calculado com contagem efetiva
- `passedTests`, `failedTests`, `blockedTests`: somam cenários (para TCs com cenários) ou status do TC (para TCs sem cenários)

### Frontend — `ExecutionRunPage.tsx`

**Wizard:**
- Ao clicar em "+ Adicionar Cenário" quando `tc.issues.length > 0 && tc.scenarios.length === 0`:
  abre modal informativo com input de nome
- Caso contrário: comportamento atual (inline form)

**Modal de lote:**
- Novo estado: `showBatchModal`
- Textarea + preview de contagem de linhas
- Chama novo endpoint de batch

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

### Frontend — `client.ts`

Adicionar método:
```typescript
createScenarioBatch: (executionId: string, etcId: string, names: string[]) =>
  api.post<Scenario[]>(`/executions/${executionId}/test-cases/${etcId}/scenarios/batch`, { names }),
```

---

## Compatibilidade

- Casos de teste sem cenários: comportamento 100% inalterado
- Relatório visual (sub-linhas): sem alteração
- Integração com Jira: sem alteração
- Dados existentes: campo `originalStatus` é nullable, sem impacto em registros anteriores
