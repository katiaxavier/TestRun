# TestRun — Plataforma de Execução de Ciclos de Teste

> Gerencie suites de teste, execute ciclos e gere relatórios profissionais em .xlsx e .pdf

![Badge Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![License](https://img.shields.io/badge/license-UNLICENSED-blue)
![Node](https://img.shields.io/badge/node-20%2B-green)

---

## Sobre o Projeto

O **TestRun** é uma aplicação web de QA que centraliza a gestão de ciclos de teste com integração ao Jira. Elimina tarefas manuais repetitivas no fluxo de testes, oferecendo importação automática de suites, execução guiada e geração de relatórios.

### Problema Resolvido

- Criação manual de suites e casos de teste no Jira
- Cópia e preenchimento manual em planilhas
- Atualização descentralizada de status e métricas
- Consolidação manual de relatórios

### Solução

- **Login via OAuth Atlassian**, com acesso aos projetos e quadros do Jira que o usuário já enxerga
- **Múltiplos projetos e quadros (boards)**, com sincronização de suites por quadro
- **Importação automática** de suites do Jira via ID da task
- **Suites manuais** criadas diretamente no TestRun (sem Jira)
- **Lotes de execução** que agrupam múltiplas suites num único ciclo
- **Cenários por caso de teste** com templates reutilizáveis
- **Interface guiada** para execução de testes (Pass / Fail / Blocked)
- **Rastreamento de issues** (bugs e melhorias) por caso de teste e por cenário
- **Geração automática** de relatórios em .xlsx e .pdf
- **Tema claro e escuro**, com a preferência mantida entre sessões

---

## Stack

### Backend
```
NestJS 11 | TypeScript | Node.js 20
```

### Banco de Dados
```
PostgreSQL 16 | Prisma ORM 6 (migrations versionadas)
```

### Frontend
```
React 19 | TypeScript | Vite 8 | Tailwind CSS 4 | Recharts | Framer Motion
```

---

## Modelo de Dados

O modelo se organiza em duas metades. O **catálogo** (`Suite` → `TestCase` → `TestCaseScenario`) é o
que se cadastra uma vez: o que existe para ser testado. O **registro de execução**
(`Execution` → `ExecutionTestCase` → `Scenario`) é copiado do catálogo quando um ciclo é aberto e
guarda os resultados daquele ciclo. Por isso as entidades vêm em pares — o mesmo caso de teste tem um
`ExecutionTestCase` por ciclo em que participou, sem que um histórico interfira no outro.

Acima de tudo isso está o **Projeto** do Jira, que é a raiz do escopo e o nível de compartilhamento.

```
User
└── ProjectMembership[]      (cache de acesso do usuário ao projeto)

Project                      ← raiz: tudo pertence a um projeto
├── Board[]                  (quadros do Jira dentro do projeto)
├── BoardSlaConfig[]         (prazos de SLA customizados por quadro)
├── ExecutionBatch[]
│   └── Execution[]          (lote de múltiplas suítes → uma execução por suíte)
└── Suite[]                  ↔ Board[]  (muitos-para-muitos)
    ├── TestCase[]
    │   └── TestCaseScenario[]   (templates de cenários)
    └── Execution[]
        └── ExecutionTestCase[]
            ├── Scenario[]        (execução dos cenários)
            │   └── Issue[]
            └── Issue[]
```

### Entidades

**Contexto e acesso**

| Entidade | Descrição |
|---|---|
| **User** | Conta local criada a partir do login OAuth com a Atlassian; guarda os tokens cifrados |
| **Project** | Espelha um projeto do Jira — raiz do escopo e nível de compartilhamento entre usuários |
| **Board** | Quadro (board) do Jira dentro de um projeto; segmenta a sincronização de suítes |
| **ProjectMembership** | Cache de "este usuário pode acessar este projeto no Jira", usado na autorização |
| **BoardSlaConfig** | Prazos de SLA customizados por quadro, usados na aba Eficiência do Dashboard |

**Catálogo — o que existe para testar**

| Entidade | Descrição |
|---|---|
| **Suite** | Agrupa casos de teste — importada do Jira ou criada manualmente. Pertence a um projeto e pode estar em vários quadros ao mesmo tempo |
| **TestCase** | Caso de teste com chave Jira, título, prioridade e marcação de automação |
| **TestCaseScenario** | Template de cenário reutilizável vinculado a um caso de teste |

**Execução — o que aconteceu em cada ciclo**

| Entidade | Descrição |
|---|---|
| **Execution** | Ciclo de execução de uma suite (sprint, versão, responsável, datas) |
| **ExecutionBatch** | Lote que agrupa múltiplas suites; gera uma execução por suite |
| **ExecutionTestCase** | Resultado de um caso de teste numa execução (Pass/Fail/Blocked/Pending) |
| **Scenario** | Execução de um cenário específico dentro de um caso de teste |
| **Issue** | Bug ou melhoria vinculado a um caso de teste **ou** a um cenário |

> As regras de cada campo estão detalhadas na seção 2 do [REGRAS_DE_NEGOCIO.md](REGRAS_DE_NEGOCIO.md).

---

## Executando com Docker (recomendado)

Esta é a forma mais simples de rodar o projeto. Docker cuida do backend, frontend e banco de dados.

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) >= 24
- [Docker Compose](https://docs.docker.com/compose/) (já incluso no Docker Desktop)

### Passo a passo

**1. Clone o repositório**

```bash
git clone <url-do-repositorio>
cd TestRun
```

**2. Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Os valores padrão já funcionam para subir o Postgres localmente. As variáveis de OAuth/Atlassian
(`ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`, `JIRA_CLOUD_ID`) são
necessárias para o login funcionar — veja como configurá-las em
[Integração com o Jira](#integração-com-o-jira). `TOKEN_ENC_KEY` e `SESSION_JWT_SECRET` também
precisam de um valor (gere com `openssl rand -base64 32`).

**3. Suba os containers**

```bash
docker compose up --build
```

Na primeira execução o Docker vai:
- Subir o Postgres e aguardar ele ficar saudável
- Fazer build das imagens do backend e frontend
- Rodar as migrations do banco de dados automaticamente
- Iniciar os servidores

**4. Acesse a aplicação**

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:3000 |

**5. Parar os containers**

```bash
docker compose down
```

> Os dados do banco são persistidos em um volume Docker (`postgres-data`). Para apagar os dados junto com os containers use `docker compose down -v`.

---

## Atualizando para uma nova versão

Quando uma nova versão do projeto for publicada, seus dados no banco **não são perdidos** — o banco fica em um volume Docker separado dos containers.

**1. Baixe as mudanças**

```bash
git pull
```

**2. Recrie os containers com a nova versão**

```bash
docker compose up --build -d
```

O Docker vai recompilar as imagens e, se houver alterações no schema do banco, as migrations são aplicadas automaticamente na inicialização do backend — sem apagar os dados existentes.

> Para confirmar que tudo subiu corretamente: `docker compose ps`

---

## Executando sem Docker (desenvolvimento local)

### Pré-requisitos

- **Node.js** >= 20
- **npm**
- **PostgreSQL** >= 14 rodando localmente (ou via `docker compose up -d postgres`, que sobe a 16)

### Passo a passo

**1. Clone o repositório**

```bash
git clone <url-do-repositorio>
cd TestRun
```

**2. Configure e inicie o backend**

```bash
cd backend
npm install
cp .env.example .env   # ajuste DATABASE_URL se necessário
npx prisma migrate dev
npm run start:dev
```

Backend estará em: `http://localhost:3000`

**3. Inicie o frontend** (outro terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend estará em: `http://localhost:5173`

---

## Estrutura do Projeto

```
TestRun/
├── backend/
│   ├── src/
│   │   ├── auth/            # Login via OAuth 2.0 (3LO) Atlassian, sessão JWT
│   │   ├── projects/        # Projetos Jira e guard de autorização por projeto
│   │   ├── boards/          # Quadros (boards) dentro de cada projeto
│   │   ├── executions/      # Execuções individuais e lotes (batch)
│   │   ├── jira/            # Integração com a API do Jira
│   │   ├── jira-issues/     # Listagem ao vivo de bugs/melhorias do Jira
│   │   ├── jira-users/      # Busca de pessoas atribuíveis (seletor de responsável)
│   │   ├── dashboard/       # KPIs de Operação, Qualidade e Eficiência + config de SLA
│   │   ├── reports/         # Geração de relatórios .xlsx e .pdf
│   │   ├── suites/          # Suites, casos de teste e cenários
│   │   ├── common/          # Utilitários compartilhados (cifragem de tokens)
│   │   └── prisma/          # Serviço do Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma    # Schema do banco de dados (PostgreSQL)
│   │   └── migrations/      # Histórico de migrations
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectSelector.tsx     # Seleção de projeto (Espaço) na sidebar
│   │   │   ├── BoardSelector.tsx       # Seleção de quadro na sidebar
│   │   │   ├── JiraUserPicker.tsx      # Seletor de responsável com busca no Jira
│   │   │   ├── ThemeToggle.tsx         # Alternância entre tema claro e escuro
│   │   │   └── ...                     # Demais componentes reutilizáveis
│   │   ├── context/
│   │   │   └── ThemeContext.tsx        # Estado do tema (claro/escuro)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx           # Login via OAuth Atlassian
│   │   │   ├── HomePage.tsx            # Dashboard (home): abas Operação / Qualidade / Eficiência
│   │   │   ├── dashboard/              # Conteúdo de cada aba do Dashboard
│   │   │   ├── ExecucoesPage.tsx       # Execuções: execuções em andamento e últimas execuções
│   │   │   ├── ExecutionsPage.tsx      # Todas as execuções, com filtros e paginação
│   │   │   ├── SuitesPage.tsx          # Lista de suites e lotes (cards ou tabela)
│   │   │   ├── SuiteDetailPage.tsx     # Detalhes e execuções de uma suite
│   │   │   ├── ExecutionRunPage.tsx    # Execução guiada de testes
│   │   │   ├── BatchExecutionPage.tsx  # Execução em lote (múltiplas suites)
│   │   │   └── JiraIssuesPage.tsx      # Bugs e Melhorias: listagem ao vivo de issues do Jira
│   │   └── api/
│   │       └── client.ts    # Cliente HTTP (Axios)
│   └── Dockerfile
│
├── planos/                  # Planos de feature (documentos de planejamento)
├── REGRAS_DE_NEGOCIO.md     # Regras de negócio detalhadas
└── docker-compose.yml
```

---

## Funcionalidades Principais

### Dashboard

- Tela inicial (`/dashboard`) com três abas, cada uma respondendo a uma pergunta central:
  - **Operação** — "O que está acontecendo agora?": seção *Atenção* com o que precisa de ação, KPIs (execuções em andamento, bugs e melhorias *Ready for Test*, taxa de sucesso), tabela *Ready for Test* com as issues do Jira nesse status, últimos bugs e melhorias criados, execuções em andamento e últimas execuções concluídas
  - **Qualidade** — "Qual a saúde do produto?": densidade de defeitos por label, taxa de sucesso × severidade e casos de teste + automação
  - **Eficiência** — "Estamos resolvendo os problemas no tempo esperado?": MTTR (média, mediana, P90 e tendência), idade dos defeitos em aberto, SLA em 3 estados (dentro do prazo, próximo do prazo, acima do prazo) e a lista dos bugs acima do SLA
- **Prazos de SLA editáveis por quadro**: na aba Eficiência é possível ajustar o prazo (em dias) de cada prioridade e restaurar os valores padrão a qualquer momento
- Escopado ao Projeto+Quadro selecionados na sidebar; cada aba busca seus dados só na primeira vez que é visitada
- As tabelas *Ready for Test* e *Últimos Bugs e Melhorias Criados* consultam o Jira ao vivo e ficam indisponíveis quando o quadro selecionado é "Sem quadro"

### Execuções

- Tela (`/execucoes`) com visão geral das execuções do Projeto+Quadro selecionados
- **Execuções em Andamento**: lista todas as execuções com status em andamento (suite e lote podem ter
  execuções ativas simultâneas), atualizando automaticamente a cada 15 segundos
- **Últimas Execuções**: as execuções concluídas mais recentes
- Ao abrir uma execução a partir dessa tela, o botão "Voltar" retorna para ela em vez da suite/lote

### Todas as Execuções

- Tela (`/executions`) acessível pela sidebar ou pelo link "Ver todas" na seção "Últimas Execuções" da tela Execuções
- Lista todas as execuções (individuais e de lote) do Projeto+Quadro selecionado, com paginação (10/25/50/100 itens por página)
- Filtros por **status** (Em Andamento / Concluído / Pendente) e por **período** (data início e fim)

### Suites de Teste

- **Importar do Jira**: informa o ID de uma task pai no Jira e o sistema importa automaticamente todos os subtasks como casos de teste
- **Criar manualmente**: cria uma suite diretamente no TestRun sem depender do Jira (chave gerada automaticamente como `SUITE-001`, `SUITE-002`, etc.)
- **Adicionar casos manualmente a suites manuais**: busca um caso pelo ID do Jira e adiciona à suite

### Casos de Teste

- Cada caso tem chave (ID), título, link e prioridade
- Suporte a **templates de cenários**: pré-cadastre os cenários que serão executados em cada ciclo

### Ciclos de Execução

- **Execução individual**: vinculada a uma suite, com sprint, versão, datas, responsável
- **Lote de execução (Batch)**: agrupa múltiplas suites em um único ciclo de teste
  - Permite excluir casos de teste específicos do lote
  - Gera uma execução por suite dentro do lote
- **Responsável**: vem pré-preenchido com o usuário logado e pode ser trocado por qualquer pessoa
  atribuível no projeto, buscada ao vivo no Jira
- **Sincronizar (`POST /executions/:id/sync`)**: atualiza a(s) suíte(s) de origem a partir do Jira e
  traz para dentro do ciclo em andamento os casos de teste e cenários que faltavam. A operação só
  adiciona — nada que já foi testado é removido ou alterado — e é idempotente. Suítes manuais são
  puladas e o lote respeita os casos excluídos dele

### Registro de Resultados

- Status por caso de teste: **Pass / Fail / Blocked / Pending**
- Status por cenário (quando configurados) — o status do caso é derivado automaticamente dos
  cenários, inclusive quando um cenário é excluído
- Na tabela da execução, a contagem de cenários mostra a quebra por status num tooltip
- Registro de comentários por caso/cenário
- Registro de issues (bugs e melhorias) vinculados ao caso ou ao cenário
  - Campos: tipo, chave Jira, título, severidade, status
  - Título, status, prioridade e labels são revalidados ao vivo contra o Jira sempre que a execução é carregada (issues sem chave Jira mantêm o valor salvo manualmente)

### Bugs e Melhorias

- Tela (`/jira-issues`) com listagem ao vivo das issues do Jira (bugs e melhorias) do Projeto+Quadro selecionados
- Filtros por tipo, status, prioridade e busca textual, com paginação
- Indisponível quando o quadro selecionado é "Sem quadro" (não há quadro real do Jira para consultar)

### Relatórios

- Título, status e prioridade de cada bug/melhoria são revalidados ao vivo contra o Jira no momento da geração (mesma regra da tela de Execução), tanto no Excel quanto no PDF, individual ou de lote

- **Excel (.xlsx)** — duas abas:
  - *Visualizar Resultado*: metadados do ciclo (sprint, versão, datas, suíte), fórmulas automáticas de contagem por status e tabela completa de casos de teste com ID clicável (link Jira), título, prioridade, status colorido, responsável, comentários e issues. Cenários aparecem como sublinhas dentro do caso de teste.
  - *Bugs e Melhorias*: lista consolidada de todos os bugs e melhorias registrados, com tipo, ID (link Jira), título, severidade, datas de criação e atualização, e status.

- **PDF** — pronto para apresentar a stakeholders:
  - Cabeçalho com metadados do ciclo (sprint, versão, datas, suíte, responsável)
  - Tabela de resumo com métricas (passou, falhou, bloqueado, executado, total)
  - Barra visual de distribuição de resultados com legenda e percentuais
  - Detalhamento dos casos de teste com status colorido (cenários como sublinhas)
  - Tabela de bugs e melhorias reportados
  - Rodapé com data de geração e paginação

### Interface

- **Tema claro e escuro**, alternável pelo botão na barra superior (e também na tela de login).
  A escolha é persistida entre sessões
- Cores, espaçamentos e tipografia (DM Sans / Bricolage Grotesque) centralizados em tokens CSS,
  aplicados aos dois temas

### Projetos e Quadros

- Após o login, o usuário escolhe um **projeto Jira** (Espaço) e, dentro dele, um **quadro** (Board)
- Acesso por projeto é controlado por um guard de autorização — só vê o que a conta Atlassian logada
  pode acessar
- A sincronização de suites (`POST /suites/sync`) é feita por quadro, não pelo projeto inteiro

### Integração com o Jira

O login usa **OAuth 2.0 (3LO) da Atlassian**. Para configurar:

1. Registre um app em [developer.atlassian.com/console](https://developer.atlassian.com/console/myapps/)
2. Adicione o produto **Jira API** e habilite os escopos abaixo. Os granulares ficam na aba
   **Granular scopes**, dentro da própria "Jira API" — não é um produto separado; os clássicos
   ficam na visão padrão ("Jira platform REST API"):
   - `read:me`
   - `read:jira-work`
   - `read:jira-user` (clássico — busca de pessoas atribuíveis no seletor de responsável)
   - `read:project:jira`
   - `read:board-scope:jira-software`
   - `read:board-scope.admin:jira-software`
   - `read:issue-details:jira`
   - `read:filter:jira`
   - `offline_access` (necessário para o refresh token)

   Ao adicionar um escopo novo, quem já estava logado precisa deslogar e logar de novo para o
   consentimento ser pedido outra vez.
3. Configure a **Callback URL** apontando para `OAUTH_REDIRECT_URI` (ex: `http://localhost:3000/auth/callback`)
4. Preencha no `.env`: `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, `OAUTH_REDIRECT_URI` e,
   opcionalmente, `JIRA_CLOUD_ID` (fixa o site Jira quando a conta tem acesso a mais de um)
5. Gere `TOKEN_ENC_KEY` e `SESSION_JWT_SECRET` com `openssl rand -base64 32`


---

## Comandos Úteis

### Backend

```bash
npm run start:dev        # Desenvolvimento com hot-reload
npm run build            # Build de produção
npm run start:prod       # Produção

npx prisma migrate dev   # Criar nova migration após editar o schema
npx prisma studio        # Interface visual do banco de dados

npm run test             # Testes unitários
npm run test:e2e         # Testes end-to-end
npm run lint             # Lint
```

### Frontend

```bash
npm run dev              # Desenvolvimento
npm run build            # Build de produção
npm run preview          # Preview do build
npm run lint             # Lint
```

---

## Troubleshooting

**Container não sobe / porta em uso**
```bash
docker compose down
docker compose up --build
```

**Banco de dados corrompido ou quero resetar os dados**
```bash
docker compose down -v   # Remove containers E volumes (apaga o banco Postgres)
docker compose up --build
```

**Erro `permission denied` ao rodar `docker`/`docker compose`**

Confirme que seu usuário está no grupo `docker` (`groups $USER`). Se acabou de ser adicionado ao
grupo, é necessário fazer logout/login (grupos não são recarregados em sessões já abertas).

**Frontend não conecta no backend (em dev local)**

Verifique se o backend está rodando em `http://localhost:3000`. O frontend assume essa URL por padrão.

**Erro no login / acesso ao Jira**

- Confirme que `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET` e `OAUTH_REDIRECT_URI` estão
  preenchidos no `.env` e que a Callback URL registrada no console da Atlassian é exatamente a mesma
  de `OAUTH_REDIRECT_URI`
- Verifique se todos os escopos listados em [Integração com o Jira](#integração-com-o-jira) estão
  habilitados no app. Ao adicionar um escopo novo é preciso deslogar e logar de novo para o
  consentimento ser pedido outra vez
- Se a conta Atlassian tem acesso a mais de um site Jira, fixe o site em `JIRA_CLOUD_ID`
- Só aparece no TestRun o que a conta logada já enxerga no Jira — se um projeto ou quadro não
  aparecer, confirme a permissão dessa conta no próprio Jira

---

## Roadmap

- [x] Autenticação de usuários (OAuth Atlassian)
- [x] Múltiplos projetos e quadros do Jira
- [x] Criação de suites/casos de teste integrados ao Jira
- [x] Lotes de execução (múltiplas suites em um ciclo)
- [x] Cenários por caso de teste (templates reutilizáveis)
- [x] Relatórios Excel e PDF
- [x] Autorização por projeto (acesso espelhado do Jira)
- [x] Dashboard (Operação / Qualidade / Eficiência)
- [x] Tela "Bugs e Melhorias" com listagem ao vivo do Jira
- [x] Prazos de SLA editáveis por quadro
- [x] Sincronizar casos de teste dentro de uma execução em andamento
- [x] Tema claro e escuro