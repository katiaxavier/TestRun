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

- **Importação automática** de suites do Jira via ID da task
- **Suites manuais** criadas diretamente no TestRun (sem Jira)
- **Lotes de execução** que agrupam múltiplas suites num único ciclo
- **Cenários por caso de teste** com templates reutilizáveis
- **Interface guiada** para execução de testes (Pass / Fail / Blocked)
- **Rastreamento de issues** (bugs e melhorias) por caso de teste e por cenário
- **Geração automática** de relatórios em .xlsx e .pdf

---

## Stack

### Backend
```
NestJS 11 | TypeScript | Prisma ORM | PostgreSQL | Node.js 20
```

### Frontend
```
React 19 | TypeScript | Vite 8 | Tailwind CSS 4 | Recharts | Framer Motion
```

---

## Modelo de Dados

```
Suite
├── TestCase[]
│   └── TestCaseScenario[]   (templates de cenários)
└── Execution[]
    └── ExecutionTestCase[]
        ├── Scenario[]        (execução dos cenários)
        │   └── Issue[]
        └── Issue[]

ExecutionBatch
└── Execution[]              (lote de múltiplas suites)
```

### Entidades

| Entidade | Descrição |
|---|---|
| **Suite** | Agrupa casos de teste — importada do Jira ou criada manualmente |
| **TestCase** | Caso de teste com chave Jira, título e prioridade |
| **TestCaseScenario** | Template de cenário reutilizável vinculado a um caso de teste |
| **Execution** | Ciclo de execução de uma suite (sprint, versão, responsável, datas) |
| **ExecutionBatch** | Lote que agrupa múltiplas suites numa execução unificada |
| **ExecutionTestCase** | Resultado de um caso de teste numa execução (Pass/Fail/Blocked) |
| **Scenario** | Execução de um cenário específico dentro de um caso de teste |
| **Issue** | Bug ou melhoria vinculado a um caso de teste ou cenário |

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
(`ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, etc.) ainda não são usadas nesta fase e podem
ficar em branco.

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
- **PostgreSQL** >= 14 rodando localmente (ou via `docker compose up -d postgres`)

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
│   │   ├── config/          # Configuração do Jira (salva em config.json)
│   │   ├── executions/      # Execuções individuais e lotes (batch)
│   │   ├── jira/            # Integração com a API do Jira
│   │   ├── reports/         # Geração de relatórios .xlsx e .pdf
│   │   ├── suites/          # Suites, casos de teste e cenários
│   │   └── prisma/          # Serviço do Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma    # Schema do banco de dados (PostgreSQL)
│   │   └── migrations/      # Histórico de migrations
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx       # Lista de suites
│   │   │   ├── SuiteDetailPage.tsx     # Detalhes e execuções de uma suite
│   │   │   ├── ExecutionRunPage.tsx    # Execução guiada de testes
│   │   │   ├── BatchExecutionPage.tsx  # Execução em lote (múltiplas suites)
│   │   │   └── ConfigPage.tsx          # Configuração do Jira
│   │   └── api/
│   │       └── client.ts    # Cliente HTTP (Axios)
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Funcionalidades Principais

### Suites de Teste

- **Importar do Jira**: informa o ID de uma task pai no Jira e o sistema importa automaticamente todos os subtasks como casos de teste
- **Criar manualmente**: cria uma suite diretamente no TestRun sem depender do Jira (chave gerada automaticamente como `SUITE-001`, `SUITE-002`, etc.)
- **Adicionar casos manualmente a suites manuais**: busca um caso pelo ID do Jira e adiciona à suite

### Casos de Teste

- Cada caso tem chave (ID), título, link e prioridade
- Suporte a **templates de cenários**: pré-cadastre os cenários que serão executados em cada ciclo

### Execuções

- **Execução individual**: vinculada a uma suite, com sprint, versão, datas, responsável
- **Lote de execução (Batch)**: agrupa múltiplas suites em um único ciclo de teste
  - Permite excluir casos de teste específicos do lote
  - Gera uma execução por suite dentro do lote

### Registro de Resultados

- Status por caso de teste: **Pass / Fail / Blocked / Pending**
- Status por cenário (quando configurados)
- Registro de comentários por caso/cenário
- Registro de issues (bugs e melhorias) vinculados ao caso ou ao cenário
  - Campos: tipo, chave Jira, título, severidade, status

### Relatórios

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

### Integração com o Jira

Acesse a página **Configurações** no app e preencha:
- URL do Jira (ex: `https://sua-empresa.atlassian.net`)
- E-mail da conta Atlassian
- API Token ([gere aqui](https://id.atlassian.com/manage-profile/security/api-tokens))


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

**Erro de credenciais Jira**

- Confirme que o token API não expirou
- Verifique se o e-mail é o mesmo da conta Atlassian
- Teste manualmente: `curl -u email:token https://sua-empresa.atlassian.net/rest/api/3/myself`

---

## Roadmap

- [ ] Autenticação de usuários
- [ ] Múltiplos projetos Jira
- [ ] Criação de suites/casos de teste integrados ao Jira