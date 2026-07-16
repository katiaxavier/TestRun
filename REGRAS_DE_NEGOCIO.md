# Regras de Negócio — TestRun

**Versão:** 2.1  
**Data:** 14/07/2026  
**Sistema:** TestRun — Plataforma de Gestão de Testes de QA

---

## 1. Visão Geral

O TestRun é uma plataforma colaborativa de gerenciamento de testes que centraliza a criação de suítes, execução de casos de teste, registro de bugs/melhorias e geração de relatórios (Excel e PDF). Login é feito via conta Atlassian (OAuth 2.0), e o acesso aos dados é organizado por Projeto e Quadro do Jira: suítes, execuções e lotes pertencem a um Projeto (e opcionalmente a um Quadro) e são compartilhados por todos os membros que têm acesso a esse Projeto no Jira. A integração com o Jira deixou de ser opcional/manual (Basic Auth) e passou a ser a fonte de identidade (autenticação) e de visibilidade (autorização) do sistema.

---

## 2. Entidades do Sistema

### 2.1 Usuário (`User`)
Conta local criada/atualizada a partir do login com a Atlassian.

| Campo | Tipo | Regra |
|---|---|---|
| `atlassianAccountId` | string | Único; identifica a conta Atlassian do usuário |
| `displayName` | string | Obrigatório |
| `email`, `avatarUrl` | string (opcionais) | Vindos do perfil Atlassian |
| `accessToken` / `refreshToken` | string (cifrados) | Tokens OAuth do usuário, armazenados cifrados (AES-256-GCM) no servidor; nunca expostos ao frontend |
| `accessTokenExpires` | datetime | Usado para renovar o `accessToken` automaticamente via `refreshToken` |

### 2.2 Projeto (`Project`)
Espelha um projeto do Jira. É o nível de compartilhamento: tudo que pertence a um Projeto é visível para todos os usuários com acesso a ele no Jira.

| Campo | Tipo | Regra |
|---|---|---|
| `jiraProjectId` / `jiraProjectKey` | string | Únicos; identificam o projeto no Jira |
| `name` | string | Obrigatório |
| `lastSyncedAt` | datetime (opcional) | Última sincronização de metadados do projeto |

Existe um projeto sentinela `MANUAL` (`jiraProjectId = 'manual'`) que não corresponde a nenhum projeto real do Jira — abriga as suítes criadas manualmente (sem vínculo com o Jira). Qualquer usuário autenticado tem acesso a ele, já que não é regido por permissão do Jira.

### 2.3 Quadro (`Board`)
Um projeto do Jira pode conter vários quadros (boards) reais — por exemplo, times/frentes diferentes dentro do mesmo projeto. O Quadro é um nível opcional entre Projeto e Suíte, usado para segmentar a sincronização.

| Campo | Tipo | Regra |
|---|---|---|
| `jiraBoardId` | string | Único; identifica o quadro no Jira |
| `name`, `type` | string | Metadados do quadro (ex.: tipo Scrum/Kanban) |
| `projectId` | FK | Todo quadro pertence a exatamente um projeto |

### 2.4 Vínculo de Acesso ao Projeto (`ProjectMembership`)
Cache local de "o usuário X pode acessar o projeto Y no Jira", usado para autorização sem precisar consultar o Jira a cada requisição.

| Campo | Tipo | Regra |
|---|---|---|
| `userId` + `projectId` | únicos (composto) | Um registro por par usuário/projeto |
| `lastCheckedAt` | datetime | Data da última confirmação do acesso contra o Jira; usado no TTL (ver 10.2) |

### 2.5 Suíte (`Suite`)
Conjunto de casos de teste. Pode ser criada manualmente ou importada do Jira. Pertence sempre a um Projeto e pode estar associada a nenhum, um ou vários Quadros (relação muitos-para-muitos, já que uma mesma suíte pode aparecer em mais de um quadro do Jira ao mesmo tempo).

| Campo | Tipo | Regra |
|---|---|---|
| `projectId` | FK | Obrigatório; toda suíte pertence a exatamente um projeto |
| `jiraKey` | string (opcional) | Preenchido apenas em suítes importadas do Jira; único por projeto (`projectId` + `jiraKey`) |
| `manualKey` | string (opcional) | Preenchido apenas em suítes manuais (ex.: `SUITE-001`, gerado automaticamente); único por projeto (`projectId` + `manualKey`) |
| `title` | string | Obrigatório |
| `isManual` | boolean | `true` = criada manualmente; `false` = importada do Jira |
| `epicKey`, `epicSummary` | string (opcionais) | Chave e resumo do Epic do Jira associado; usados no cálculo de cobertura de requisitos do Dashboard (ver 17.2) |

### 2.6 Caso de Teste (`TestCase`)
Item individual de teste pertencente a uma suíte.

| Campo | Tipo | Regra |
|---|---|---|
| `jiraKey` | string | Obrigatório (mesmo para suítes manuais) |
| `priority` | string | Importada do Jira ou definida manualmente |
| `automated` | boolean | `default false`; marca se o caso é coberto por automação — alimenta a métrica de cobertura de automação do Dashboard (ver 17.2) |
| `link` | string (opcional) | Link do ticket no Jira |
| `suiteId` | FK | Cada caso pertence a exatamente uma suíte |

### 2.7 Cenário Template (`TestCaseScenario`)
Modelo de cenário/charter definido no nível da suíte, antes da execução. Serve como base para as execuções futuras.

### 2.8 Execução (`Execution`)
Representa um ciclo de teste de uma suíte.

| Campo | Tipo | Regra |
|---|---|---|
| `sprint`, `responsible` | string | Obrigatórios |
| `version` | string | Não obrigatório na prática (DTO aceita omissão; assume `''` como padrão) |
| `startDate`, `endDate` | datetime | Obrigatórios |
| `testedFeature` | string (opcional) | Funcionalidade testada, informativo |
| `status` | enum | `PENDING` → `IN_PROGRESS` → `COMPLETED` (calculado automaticamente) |
| `batchId` | FK (opcional) | Preenchido se a execução pertence a um lote |

### 2.9 Caso de Teste na Execução (`ExecutionTestCase`)
Instância de um caso de teste dentro de uma execução.

| Campo | Valores | Regra |
|---|---|---|
| `status` | `PENDING`, `PASSED`, `FAILED`, `BLOCKED`, `IN_PROGRESS` | Atualizado manualmente pelo testador |
| `originalStatus` | string (nullable) | Guarda o status do TC antes de cenários serem criados |

### 2.10 Cenário de Execução (`Scenario`)
Instância de um cenário dentro de uma execução. Pode originar de um template ou ser criado durante a execução (ad-hoc).

| Campo | Tipo | Regra |
|---|---|---|
| `templateId` | FK (nullable) | `null` = criado ad-hoc durante execução |
| `status` | enum | Mesmo conjunto do `ExecutionTestCase`; inicia sempre como `PENDING` |

### 2.11 Issue (`Issue`)
Bug ou melhoria vinculado a um caso de teste ou a um cenário.

| Campo | Valores |
|---|---|
| `type` | `BUG`, `IMPROVEMENT` |
| `jiraKey` | string (opcional) — chave do ticket no Jira |
| `title` | string — obrigatório |
| `severity` | Campo legado, preenchido manualmente: Trivial, Normal, Low, Medium, High, Critical, Gravissima |
| `jiraPriority` | Campo atual, sincronizado do Jira — tem prioridade sobre `severity` sempre que ambos existem (`severity` só é usado como fallback em registros antigos, ex.: em relatórios) |
| `jiraLabels` | string[] — labels do Jira; usado no cálculo de "Densidade por Label" do Dashboard (ver 17.2) |
| `status` | Open, In Progress, Resolved, Cancelled |

### 2.12 Lote (`ExecutionBatch`)
Agrupa múltiplas suítes para execução conjunta.

| Campo | Tipo | Regra |
|---|---|---|
| `projectId` | FK | Obrigatório; todo lote pertence a exatamente um projeto |
| `boardId` | FK (opcional) | Quadro ao qual o lote está associado, se houver |
| `name` | string (opcional) | Nome do lote |
| `testedFeature` | string (opcional) | Funcionalidade testada, informativo |
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

### 3.6 Toda Suíte Pertence a um Projeto
- Criação manual ou importação exigem um `projectId` (projeto selecionado na interface).
- A chave Jira de uma suíte é única **por projeto** (duas suítes em projetos diferentes podem ter a mesma `jiraKey`).

### 3.7 Sincronização de Suítes por Quadro
- Critério de "suíte" no Jira: issues do tipo (`issuetype`) **"Test Suite"**.
- A sincronização é feita **por Quadro**, não pelo projeto inteiro: `POST /suites/sync` recebe `{ boardId }`.
- O sistema busca todas as chaves de issues "Test Suite" do quadro e importa cada uma reaproveitando a regra de importação (3.2).
- Falhas de importação individuais **não abortam o lote de sincronização**: as suítes que falharem são reportadas separadamente (`failed: [{ key, error }]`), e as demais são sincronizadas normalmente.
- Uma suíte já existente que é sincronizada por um novo quadro **ganha esse quadro adicionalmente** — a associação com quadros anteriores não é removida (relação muitos-para-muitos: a mesma suíte pode pertencer a mais de um quadro ao mesmo tempo).
- Chamadas ao Jira durante a sincronização re-tentam automaticamente em caso de erro `429` (rate limit), respeitando o header `Retry-After` (com backoff exponencial como alternativa).

---

## 4. Regras de Execução

### 4.1 Criação de Execução
- A suíte deve existir e possuir ao menos um caso de teste.
- Os campos obrigatórios são: sprint, data de início, data de término, responsável. Versão é opcional (assume `''` se omitida).
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

### 5.7 Unicidade de Nome de Cenário por TC
- Não é permitido ter dois cenários com o mesmo nome dentro do mesmo `ExecutionTestCase` (na execução) ou dentro do mesmo `TestCase` (nos templates da suíte).
- O mesmo nome pode existir em TCs diferentes sem restrição.

**Criação individual:** bloqueada com mensagem de erro se o nome já existir no TC.

**Criação em lote:** os cenários com nomes válidos são criados normalmente; os duplicados são ignorados e o usuário é informado quais nomes foram pulados.

**Ad-hoc na execução com template de mesmo nome já existente na suíte:** o cenário é criado normalmente na execução, e o `templateId` é vinculado ao template já existente na suíte — nenhum template novo é criado.

### 5.8 Adição de Cenário Template após Execução Criada
- Cenários template (`TestCaseScenario`) adicionados à lista de TCs de uma suíte ou lote **após** a criação de uma execução **não afetam execuções já existentes**.
- A execução é um snapshot imutável do momento de sua criação (ver 4.1 e 8.3); templates adicionados posteriormente só terão efeito em **execuções futuras**.
- Para refletir o novo template em uma execução em andamento, o testador deve criar o cenário manualmente de forma ad-hoc (ver 5.4).

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
- Pertence obrigatoriamente a um Projeto (`projectId`); pode opcionalmente estar associado a um Quadro (`boardId`).

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

## 9. Autenticação (Login com Atlassian)

### 9.1 Fluxo (OAuth 2.0 3LO)
1. `GET /auth/login` redireciona para `https://auth.atlassian.com/authorize`, com escopos
   `read:me read:jira-work read:board-scope:jira-software read:issue-details:jira read:project:jira offline_access`.
2. `GET /auth/callback` troca o `code` recebido por `access_token`/`refresh_token`, valida o `state`
   (proteção CSRF) contra um cookie httpOnly de curta duração.
3. O sistema resolve o `cloudId` da organização Atlassian (`GET /oauth/token/accessible-resources`) e
   busca o perfil do usuário (`GET https://api.atlassian.com/me`).
4. É feito upsert do `User` local pela `atlassianAccountId` (identificador único da conta Atlassian).
5. É emitida uma sessão própria do TestRun (JWT em cookie httpOnly, `trs_session`), com validade de 7 dias.
6. Todas as chamadas subsequentes ao Jira usam o `accessToken` do usuário logado contra
   `https://api.atlassian.com/ex/jira/{cloudId}/...` — não há mais Basic Auth nem configuração manual de credenciais.

### 9.2 Sessão e Renovação de Token
- Rotas da API exigem sessão válida (`JwtAuthGuard` global); rotas de login/callback são as únicas públicas.
- O `accessToken` do Jira é renovado automaticamente com o `refreshToken` quando expirado (`accessTokenExpires`).
- `accessToken` e `refreshToken` são armazenados **cifrados** (AES-256-GCM) no banco — nunca em texto puro, nunca expostos ao frontend.
- `POST /auth/logout` encerra a sessão (limpa o cookie); `GET /auth/me` retorna o usuário logado.

### 9.3 Tratamento de Erros
- `state` do OAuth inválido ou ausente → redireciona ao frontend com erro (`state_mismatch`).
- Falha na troca do código/perfil → redireciona ao frontend com erro (`oauth_failed`).
- Requisição sem sessão válida → erro 401.

---

## 10. Autorização e Escopo por Projeto

### 10.1 Princípio
- Autorização é **binária por projeto**: se o usuário enxerga o projeto no Jira, ele pode ver e editar
  tudo o que pertence a esse projeto no TestRun (suítes, casos, execuções, lotes, relatórios). Não há
  papéis diferenciados (viewer/editor/admin) — isso fica para uma fase futura.
- Todo recurso (suíte, caso de teste, cenário template, lote, quadro, execução) resolve para um único
  projeto, e o acesso do usuário a esse projeto é sempre checado antes de ler ou escrever o recurso.

### 10.2 Cache de Permissão (`ProjectMembership`)
- A permissão de acesso a um projeto é cacheada localmente com TTL de **15 minutos** (`lastCheckedAt`).
- Dentro do TTL, o acesso é liberado sem consultar o Jira.
- Expirado o TTL, o sistema revalida contra o Jira (relista os projetos acessíveis ao usuário) e atualiza o cache.
- Se o Jira estiver indisponível durante a revalidação: usuários que já tinham acesso confirmado
  anteriormente continuam liberados (fail-open); usuários sem nenhum cache anterior são bloqueados.
- Exceção: o projeto sentinela `MANUAL` (ver 2.2) é liberado para qualquer usuário autenticado, sem
  depender de cache ou consulta ao Jira.

### 10.3 Erros
- Requisição sem usuário autenticado → erro 401.
- Usuário autenticado sem acesso ao projeto do recurso → erro 403.
- Recurso (suíte, caso de teste, lote, quadro, execução) inexistente → erro 404 (não 403, mesmo que o
  `projectId` de referência não seja resolvível).

---

## 11. Integração Técnica com o Jira

### 11.1 Descoberta de Site
- O `cloudId` da organização (uma única organização Atlassian é suportada) é resolvido a partir do
  token do usuário logado via `GET /oauth/token/accessible-resources`.

### 11.2 Endpoints Utilizados
| Finalidade | Endpoint Jira |
|---|---|
| Recursos acessíveis / cloudId | `GET https://api.atlassian.com/oauth/token/accessible-resources` |
| Perfil do usuário logado | `GET https://api.atlassian.com/me` |
| Listar projetos acessíveis | `GET /rest/api/3/project/search` (paginado) |
| Buscar quadros de um projeto | API Agile do Jira (`/rest/agile/1.0/board`) |
| Buscar suítes ("Test Suite") de um quadro | `POST /rest/api/3/search/jql` (JQL, paginação por `nextPageToken`) |
| Buscar detalhes de issue | `GET /rest/api/3/issue/{key}` |

O endpoint clássico `GET/POST /rest/api/3/search` foi **descontinuado pela Atlassian** (retorna `410 Gone`);
qualquer busca de issues por JQL deve usar `/rest/api/3/search/jql`.

### 11.3 Rate Limit
- Toda chamada ao Jira passa por um mecanismo de retry: em resposta `429`, aguarda o tempo indicado em
  `Retry-After` (ou aplica backoff exponencial se o header não vier), até 3 tentativas.

### 11.4 Tratamento de Erros
- Issue não encontrada no Jira → erro 404.
- Erros de API do Jira → erro 400 ou 500 com mensagem detalhada.

---

## 12. Relatórios

### 12.1 Estrutura do Relatório Excel
**Aba 1 — Visualizar Resultado:**
- Metadados: Sprint, Versão, Datas, Nome da Suíte, Totalizadores.
- Tabela de casos de teste: Índice, ID (com link Jira), Título, Prioridade, Status, Responsável, Comentários, Issues.
- Sub-linhas com prefixo `↳` para cenários quando existirem.
- Célula de status do TC fica em branco quando há cenários (evita dupla contagem nas fórmulas `COUNTIF`).
- Fórmulas automáticas: Total Passou, Falhou, Bloqueado, Executado, Total de Testes.

**Aba 2 — Bugs e Melhorias:**
- Todas as issues consolidadas: Tipo, ID, Título, Severidade, Data de Criação, Atualização, Status.

### 12.2 Estrutura do Relatório PDF
- Cabeçalho: Sprint, Versão, Datas, Suíte, Responsável.
- Tabela de métricas: Total, Executados, Passou, Falhou, Bloqueado.
- Gráfico de distribuição de status (barras visuais).
- Tabela detalhada por suíte (no caso de lote) com cenários como sub-linhas.
- Seção de issues consolidadas.
- Rodapé: data de geração e numeração de páginas.

### 12.3 Relatórios de Lote
- Mesma estrutura, porém:
  - Lista múltiplas suítes.
  - Consolida todos os TCs de todas as suítes.
  - Agrega uma ou mais execuções.
  - Cabeçalho exibe nome do lote e todas as suítes envolvidas.

---

## 13. Validações Gerais

| Entidade | Regra |
|---|---|
| Suíte | Título obrigatório; deve pertencer a um projeto (`projectId`) |
| Caso de Teste (manual) | Chave Jira obrigatória e válida na API |
| Caso de Teste (duplicata) | Não é possível adicionar a mesma chave Jira duas vezes na mesma suíte |
| Caso de Teste (histórico) | Não é possível excluir um TC que já participou de alguma execução |
| Execução | Suíte deve existir e ter casos de teste |
| Lote | Mínimo de uma suíte; todas com TCs importados; deve pertencer a um projeto (`projectId`) |
| Cenário | O `ExecutionTestCase` pai deve existir |
| Issue | Tipo e título obrigatórios |
| Status | Sempre normalizado para maiúsculas (`PENDING`, `PASSED`, `FAILED`, `BLOCKED`, `IN_PROGRESS`) |
| Acesso a Projeto | Usuário deve ter `ProjectMembership` válida (cache ou revalidação no Jira) para ler/escrever qualquer recurso do projeto |

---

## 14. Fluxo de Status dos Casos de Teste

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

## 15. Permissões e Acesso

- O sistema exige login via conta Atlassian (OAuth); não há mais uso local sem autenticação.
- Autorização é **binária por projeto** (ver 10.1): dentro de um projeto ao qual o usuário tem acesso
  no Jira, ele pode realizar todas as operações (não há papéis viewer/editor/admin).
- Não existe granularidade fina de permissão (por suíte, por execução) nem controle de leitura vs.
  escrita dentro do projeto — isso é trabalho futuro (fora do roteiro atual).
- Uma única organização Atlassian é suportada (não é uma plataforma multi-tenant).

---

## 16. Execuções (`/execucoes`)

### 16.1 Escopo
- Tela de Execuções, em `/execucoes`, item próprio no menu lateral. A tela inicial do sistema (`/`)
  é hoje o Dashboard, em `/dashboard` (ver seção 17) — a listagem de Suítes/Lotes fica em `/suites`.
- Mesmo escopo de dados do restante do sistema: Projeto + Quadro selecionados na sidebar — não existe
  visão global entre quadros.

### 16.2 Execuções em Andamento
- Lista **todas** as execuções com status `IN_PROGRESS` escopadas ao Projeto+Quadro selecionados (não
  apenas a mais recente), já que uma suíte e um lote podem ter execuções ativas simultâneas e
  independentes dentro do mesmo quadro.
- Atualiza automaticamente a cada 15 segundos enquanto houver ao menos uma execução em andamento (mesmo
  padrão de polling já usado nas telas de detalhe de suíte, lote e execução).

### 16.3 Últimas Execuções
- Lista as últimas execuções com status `COMPLETED` (limitado a 3), escopadas ao Projeto+Quadro
  selecionados. O filtro por `COMPLETED` evita duplicar na tela Execuções uma execução que já aparece no
  painel "Execuções em Andamento".

### 16.4 Resolução do Quadro de uma Execução
- `Execution` não possui `boardId` próprio; o quadro é resolvido de forma transitiva a partir da origem
  da execução:
  - Execução de suíte → via `suite.boards` (a suíte pode pertencer a vários quadros ao mesmo tempo).
  - Execução de lote → via `batch.boardId` (o lote pertence a um único quadro, ou nenhum).
- Segue o mesmo critério de escopo por quadro já usado em `SuitesService.findAll`/`findAllBatches` para
  suítes e lotes, incluindo o pseudo-quadro "Sem quadro" (`boardId === 'none'`, que reúne execuções cuja
  suíte/lote não está associado a nenhum quadro real).

### 16.5 Histórico Completo de Execuções ("Ver todas")
- Tela `/executions`, acessada pelo link "Ver todas" na seção "Últimas Execuções" da tela Execuções — lista
  **todas** as execuções (não só as 3 últimas concluídas), escopadas ao mesmo Projeto+Quadro.
- Paginação real no backend (`skip`/`take` + contagem total), diferente do restante do sistema, que até
  então só usava limites fixos sem paginação de verdade. Tamanho de página configurável (10/25/50/100),
  máximo de 100 por página.
- Filtros disponíveis: status (`IN_PROGRESS`/`COMPLETED`/`PENDING`) e período (`startDate`/`endDate` da
  execução) — mudar qualquer filtro reinicia a paginação para a primeira página.
- Mesma ordenação da tela Execuções: `createdAt` decrescente (execução criada mais recentemente primeiro).

---

## 17. Dashboard (Tela Inicial)

### 17.1 Escopo
- Tela inicial do sistema, em `/dashboard` (`/` redireciona para lá). Três abas: **Operação**, **Qualidade** e **Eficiência**.
- Cada aba tem uma pergunta-guia exibida em tooltip: Operação = "O que está acontecendo agora?"; Qualidade = "Qual a saúde do produto?"; Eficiência = "Estamos resolvendo os problemas no tempo esperado?".
- Mesmo escopo de dados do restante do sistema: Projeto + Quadro selecionados na sidebar. Uma aba só busca seus dados na primeira vez que é visitada; depois permanece montada (não refaz a busca ao trocar de aba).

### 17.2 Aba Operação
- Conteúdo herdado do antigo dashboard: KPIs gerais, execuções em andamento, últimas 3 execuções concluídas, totais de bugs/melhorias, issues recentes, lista de "pronto para teste" e gráfico de taxa de sucesso.
- Reaproveita os mesmos endpoints de Execuções/Issues; não tem endpoint de backend próprio.

### 17.3 Aba Qualidade (`GET /dashboard/quality`)
- Considera as últimas 10 execuções `COMPLETED` escopadas a Projeto+Quadro.
- **Densidade por Label**: conta apenas bugs (`type = BUG`; melhorias são ignoradas), deduplicados globalmente por `jiraKey`, agrupados pela combinação ordenada de `jiraLabels` (labels concatenadas com `" + "`; sem label → `"Sem label"`). Exibida como tabela (não como gráfico de barras).
- **Taxa de Sucesso × Severidade**: por execução concluída, bugs distintos (deduplicados dentro da execução) agrupados por `jiraPriority` (sem prioridade → `"Sem severidade"`), com `totalTests`/`failedTests` como contexto no tooltip.
- **Cobertura de requisitos e automação**: `epicsWithSuite` = quantidade de `epicKey` distintos entre as suítes do projeto (contagem no nível do projeto, não do quadro, pois quadros não têm conceito de Epic no Jira); `totalEpics` = total de issues tipo Epic no projeto no Jira (não calculado para o projeto sentinela `MANUAL`); `totalTestCases`/`automatedTestCases` = contagem de `TestCase.automated`, escopada ao quadro.

### 17.4 Aba Eficiência (`GET /dashboard/efficiency`)
- Busca **todos** os bugs do Jira do Projeto/Quadro diretamente (não só os que passaram por execuções no TestRun), paginado.
- **MTTR** (tempo médio de resolução, em dias): usa `resolutiondate` quando preenchido; senão usa `updated` se o `statusCategory` for `done` (muitos projetos Jira nunca preenchem `resolutiondate`). Só entram bugs cuja resolução aconteceu nos últimos 90 dias (janela fixa, `MTTR_WINDOW_DAYS`); o histórico mais antigo não conta. Além do agregado geral, mostra o MTTR médio por severidade (`jiraPriority`), cada uma comparada contra o próprio prazo de SLA (SLA_DAYS_BY_PRIORITY) em vez de uma meta única.
- **Idade dos bugs em aberto**: média/mínima/máxima em dias, e contagem por `jiraPriority`.
- **SLA em 3 estados** (semáforo, calculado só sobre bugs em aberto): `withinSla` (dentro do prazo), `nearSla` (idade acima de 80% do prazo da prioridade), `aboveSla` (violado — lista individual com chave, link, título, prioridade, idade em dias, data de abertura e % do SLA consumido). Existe ainda um 4º grupo fora do semáforo, `noSlaDefined`, para prioridades sem prazo configurado.
- Prazos de SLA por prioridade (dias): Gravíssima 3, Crítica 7, Alta 15, Média 21, Normal 30, Trivial 45 (nomenclatura PT-BR) / Highest 3, High 7, Medium 15, Low 30, Lowest 45 (nomenclatura EN) — os dois esquemas coexistem porque cada usuário conecta o próprio site Jira, que pode usar prioridades em qualquer um dos dois idiomas.

---

## 18. Tela Bugs e Melhorias (`/jira-issues`)

### 18.1 Escopo
- Lista ao vivo de issues do Jira (bugs e melhorias) do Projeto+Quadro selecionados, com paginação e filtros por tipo, status, prioridade e busca textual (debounce de 400ms).
- Endpoints: `GET /jira-issues` (listagem paginada e filtrada) e `GET /jira-issues/filters` (valores disponíveis para os filtros). Há também `GET /jira-issues/picker` (`type: BUG|IMPROVEMENT` + busca textual), usado em seletores de issue por chave em outras telas.
- Desabilitada quando o quadro selecionado é o pseudo-quadro "Sem quadro" (`boardId === 'none'`), já que não há quadro real do Jira para consultar.

---

*Documento gerado a partir da análise do código-fonte do projeto TestRun.*
