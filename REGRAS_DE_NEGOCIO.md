# Regras de Negócio — TestRun

**Versão:** 1.0  
**Data:** 24/06/2026  
**Sistema:** TestRun — Plataforma de Gestão de Testes de QA

---

## 1. Visão Geral

O TestRun é uma plataforma local de gerenciamento de testes que centraliza a criação de suítes, execução de casos de teste, registro de bugs/melhorias e geração de relatórios (Excel e PDF). Integra-se opcionalmente com o Jira para importação de tickets.

---

## 2. Entidades do Sistema

### 2.1 Suíte (`Suite`)
Conjunto de casos de teste. Pode ser criada manualmente ou importada do Jira.

| Campo | Tipo | Regra |
|---|---|---|
| `jiraKey` | string (opcional) | Preenchido apenas em suítes importadas do Jira |
| `title` | string | Obrigatório |
| `isManual` | boolean | `true` = criada manualmente; `false` = importada do Jira |

### 2.2 Caso de Teste (`TestCase`)
Item individual de teste pertencente a uma suíte.

| Campo | Tipo | Regra |
|---|---|---|
| `jiraKey` | string | Obrigatório (mesmo para suítes manuais) |
| `priority` | string | Importada do Jira ou definida manualmente |
| `suiteId` | FK | Cada caso pertence a exatamente uma suíte |

### 2.3 Cenário Template (`TestCaseScenario`)
Modelo de cenário/charter definido no nível da suíte, antes da execução. Serve como base para as execuções futuras.

### 2.4 Execução (`Execution`)
Representa um ciclo de teste de uma suíte.

| Campo | Tipo | Regra |
|---|---|---|
| `status` | enum | `PENDING` → `IN_PROGRESS` → `COMPLETED` (calculado automaticamente) |
| `batchId` | FK (opcional) | Preenchido se a execução pertence a um lote |

### 2.5 Caso de Teste na Execução (`ExecutionTestCase`)
Instância de um caso de teste dentro de uma execução.

| Campo | Valores | Regra |
|---|---|---|
| `status` | `PENDING`, `PASSED`, `FAILED`, `BLOCKED`, `IN_PROGRESS` | Atualizado manualmente pelo testador |
| `originalStatus` | string (nullable) | Guarda o status do TC antes de cenários serem criados |

### 2.6 Cenário de Execução (`Scenario`)
Instância de um cenário dentro de uma execução. Pode originar de um template ou ser criado durante a execução (ad-hoc).

| Campo | Tipo | Regra |
|---|---|---|
| `templateId` | FK (nullable) | `null` = criado ad-hoc durante execução |
| `status` | enum | Mesmo conjunto do `ExecutionTestCase`; inicia sempre como `PENDING` |

### 2.7 Issue (`Issue`)
Bug ou melhoria vinculado a um caso de teste ou a um cenário.

| Campo | Valores |
|---|---|
| `type` | `BUG`, `IMPROVEMENT` |
| `severity` | Trivial, Normal, Low, Medium, High, Critical, Gravissima |
| `status` | Open, In Progress, Resolved, Cancelled |

### 2.8 Lote (`ExecutionBatch`)
Agrupa múltiplas suítes para execução conjunta.

| Campo | Tipo | Regra |
|---|---|---|
| `suiteIds` | JSON array | Lista de IDs das suítes do lote |
| `excludedTestCaseIds` | JSON array | TCs excluídos de todas as execuções do lote |
| `status` | enum | `PENDING` → `IN_PROGRESS` → `COMPLETED` |

---

## 3. Regras de Suítes

### 3.1 Criação Manual
- O usuário informa apenas um título; não é necessário ter uma chave Jira.
- Casos de teste são adicionados individualmente após a criação.
- `isManual = true`.

### 3.2 Importação via Jira
- Requer chave do ticket pai (ex: `PROJ-123`).
- O sistema busca automaticamente os tickets filhos (por relacionamento "parent-child").
- Se não houver filhos com tipo "parent", usa todos os issues relacionados como fallback.
- Cada filho vira um `TestCase` com: chave, título, prioridade e link para o Jira.

### 3.3 Adição Manual de Casos de Teste
- Requer chave Jira válida; o sistema valida a existência do ticket na API do Jira.
- Não é permitido adicionar a mesma chave Jira duas vezes na mesma suíte.

### 3.4 Exclusão de Caso de Teste da Suíte
- Não é permitido excluir um TC que já participou de ao menos uma execução, para preservar o histórico de testes.
- A tentativa de exclusão nesse cenário é bloqueada com mensagem: *"Este caso de teste possui histórico de execuções e não pode ser excluído."*
- Se o TC nunca foi executado, a exclusão é permitida normalmente.

### 3.5 Exclusão de Suíte
- Não é possível excluir uma suíte que faça parte de um `ExecutionBatch` ativo.
- O lote deve ser excluído primeiro.

---

## 4. Regras de Execução

### 4.1 Criação de Execução
- A suíte deve existir e possuir ao menos um caso de teste.
- Os campos obrigatórios são: sprint, versão, data de início, responsável.
- Ao criar, todos os casos de teste da suíte são copiados para a execução como `ExecutionTestCase` com status `PENDING`.

### 4.2 Status da Execução (Calculado Automaticamente)
O status é recalculado sempre que qualquer caso de teste da execução é atualizado:

```
Todos PENDING              → PENDING
Pelo menos um não-PENDING  → IN_PROGRESS
Nenhum PENDING             → COMPLETED
```

### 4.3 Atualização de Casos de Teste
- Status, responsável e comentários podem ser editados individualmente.
- Valores de status são sempre normalizados para maiúsculas.

---

## 5. Regras de Cenários

### 5.1 Criação do Primeiro Cenário em um TC
Quando o primeiro cenário é criado em um `ExecutionTestCase` que já possui issues:
1. Um modal informa o usuário que as issues existentes serão migradas para o cenário.
2. O usuário nomeia o cenário.
3. As issues do TC são movidas automaticamente para o cenário recém-criado.
4. O status atual do TC é salvo em `originalStatus`.

### 5.2 Status Inicial dos Cenários
- Todo cenário criado (seja de template ou ad-hoc) inicia com status `PENDING`.
- Não herda o status do `ExecutionTestCase` pai.

### 5.3 Criação em Lote de Cenários
- O usuário pode inserir vários nomes (um por linha) para criação em lote.
- A mesma regra de migração de issues do item 5.1 se aplica se for o primeiro cenário do TC.

### 5.4 Criação de Cenários Ad-hoc (durante execução)
- Cenários criados durante a execução (sem template base) têm `templateId = null`.
- Ao criar um cenário ad-hoc na execução, um `TestCaseScenario` (template) correspondente também é criado na suíte, para reuso em execuções futuras.

### 5.5 Exclusão do Último Cenário
Quando o último cenário de um `ExecutionTestCase` é excluído:
1. Todas as issues do cenário são movidas de volta para o TC pai.
2. O status do TC é restaurado a partir de `originalStatus`.
3. O campo `originalStatus` é limpo (`null`).

### 5.6 Impacto dos Cenários no Status do TC
- Enquanto o TC tem cenários ativos, seu status não é exibido nas células de resultado (fica em branco nos relatórios) para evitar dupla contagem.

---

## 6. Regras de Issues (Bugs e Melhorias)

### 6.1 Vinculação
- Issues podem ser vinculadas a um `ExecutionTestCase` **ou** a um `Scenario`.
- Quando o TC possui cenários, novas issues devem ser criadas no cenário, não no TC diretamente.

### 6.2 Migração Automática
- Ao criar o primeiro cenário em um TC com issues existentes → issues migram para o cenário (ver 5.1).
- Ao excluir o último cenário → issues voltam para o TC (ver 5.5).

### 6.3 Campos Obrigatórios
- Tipo (`BUG` ou `IMPROVEMENT`) e título são obrigatórios.
- Chave Jira é opcional.

---

## 7. Regras de Contagem Efetiva (Effective Count)

A contagem efetiva é usada em dashboards, relatórios e métricas de progresso:

```
TC sem cenários  → conta como 1
TC com N cenários → conta como N (cenários substituem o TC)
```

Isso evita dupla contagem e reflete fielmente o progresso real da execução.

---

## 8. Regras de Lotes (`ExecutionBatch`)

### 8.1 Criação
- Deve conter ao menos uma suíte.
- Todas as suítes devem ter casos de teste importados.

### 8.2 Execução a partir de um Lote
- Uma única instância de `Execution` é criada contendo todos os TCs de todas as suítes do lote.
- TCs na lista `excludedTestCaseIds` são omitidos de todas as execuções do lote.

### 8.3 Exclusão de TC do Lote
- O TC é adicionado à lista `excludedTestCaseIds` do lote.
- Não remove o TC da suíte original; apenas o omite nas execuções **futuras** daquele lote.
- **Execuções já criadas são imutáveis (snapshot):** a exclusão de um TC do lote não altera execuções existentes.
- **Não é permitido remover o último TC ativo do lote.** Se a operação resultaria em zero TCs ativos, ela é bloqueada com mensagem orientando o usuário a excluir o lote inteiro caso queira encerrá-lo.

### 8.4 Remoção Automática de Suítes "Esvaziadas"
- Quando todos os TCs de uma suíte forem adicionados a `excludedTestCaseIds`, o ID dessa suíte é removido automaticamente de `suiteIds` pelo backend.
- O frontend também filtra visualmente, exibindo apenas suítes que possuam ao menos um TC ativo (não excluído), como camada adicional de consistência.

---

## 9. Integração com Jira

### 9.1 Configuração
- Requer: URL do Jira, e-mail e token de API.
- As credenciais são armazenadas localmente em arquivo JSON de configuração.

### 9.2 Autenticação
- Basic Auth: `Base64(email:token)` no header `Authorization`.

### 9.3 Endpoints Utilizados
| Finalidade | Endpoint Jira |
|---|---|
| Testar conexão | `GET /rest/api/3/myself` |
| Buscar detalhes de issue | `GET /rest/api/3/issue/{key}` |

### 9.4 Tratamento de Erros
- Configuração ausente → erro 400.
- Issue não encontrada no Jira → erro 404.
- Erros de API → erro 400 ou 500 com mensagem detalhada.

---

## 10. Relatórios

### 10.1 Estrutura do Relatório Excel
**Aba 1 — Visualizar Resultado:**
- Metadados: Sprint, Versão, Datas, Nome da Suíte, Totalizadores.
- Tabela de casos de teste: Índice, ID (com link Jira), Título, Prioridade, Status, Responsável, Comentários, Issues.
- Sub-linhas com prefixo `↳` para cenários quando existirem.
- Célula de status do TC fica em branco quando há cenários (evita dupla contagem nas fórmulas `COUNTIF`).
- Fórmulas automáticas: Total Passou, Falhou, Bloqueado, Executado, Total de Testes.

**Aba 2 — Bugs e Melhorias:**
- Todas as issues consolidadas: Tipo, ID, Título, Severidade, Data de Criação, Atualização, Status.

### 10.2 Estrutura do Relatório PDF
- Cabeçalho: Sprint, Versão, Datas, Suíte, Responsável.
- Tabela de métricas: Total, Executados, Passou, Falhou, Bloqueado.
- Gráfico de distribuição de status (barras visuais).
- Tabela detalhada por suíte (no caso de lote) com cenários como sub-linhas.
- Seção de issues consolidadas.
- Rodapé: data de geração e numeração de páginas.

### 10.3 Relatórios de Lote
- Mesma estrutura, porém:
  - Lista múltiplas suítes.
  - Consolida todos os TCs de todas as suítes.
  - Agrega uma ou mais execuções.
  - Cabeçalho exibe nome do lote e todas as suítes envolvidas.

---

## 11. Validações Gerais

| Entidade | Regra |
|---|---|
| Suíte | Título obrigatório |
| Caso de Teste (manual) | Chave Jira obrigatória e válida na API |
| Caso de Teste (duplicata) | Não é possível adicionar a mesma chave Jira duas vezes na mesma suíte |
| Caso de Teste (histórico) | Não é possível excluir um TC que já participou de alguma execução |
| Execução | Suíte deve existir e ter casos de teste |
| Lote | Mínimo de uma suíte; todas com TCs importados |
| Cenário | O `ExecutionTestCase` pai deve existir |
| Issue | Tipo e título obrigatórios |
| Status | Sempre normalizado para maiúsculas (`PENDING`, `PASSED`, `FAILED`, `BLOCKED`, `IN_PROGRESS`) |

---

## 12. Fluxo de Status dos Casos de Teste

```
PENDING
  ├── IN_PROGRESS
  │     ├── PASSED
  │     ├── FAILED
  │     └── BLOCKED
  └── PASSED / FAILED / BLOCKED (direto)
```

Não há restrição de transição; o testador pode alterar para qualquer status a qualquer momento.

---

## 13. Permissões e Acesso

O sistema não possui controle de autenticação de usuários; é projetado para uso local por equipes de QA. Qualquer usuário com acesso ao sistema pode realizar todas as operações.

---

*Documento gerado a partir da análise do código-fonte do projeto TestRun.*
