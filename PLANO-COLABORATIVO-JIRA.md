# TestRun → Ferramenta Colaborativa de QA com Jira como fonte de identidade

## Context

Hoje o TestRun é uma aplicação **local, single-user, sem autenticação**. Todos os dados são globais:
não existe conceito de `User` nem de `Project`, e qualquer pessoa com acesso à rede lê/escreve tudo.
A integração Jira usa **Basic Auth** (email + API token) guardados em **`config.json` em texto puro**
(`backend/src/config/config.service.ts`), e a importação de Suites é manual, uma issue por vez, via
`issuelinks` (`backend/src/jira/jira.service.ts` → `importSuite`). O banco é **SQLite** (`backend/prisma/dev.db`).

O objetivo é torná-lo **colaborativo**: login via conta Atlassian (OAuth), o usuário vê **apenas os projetos
a que já tem acesso no Jira**, e dentro de cada projeto **Suites e Execuções são compartilhadas por todos os
membros** (a Suite pertence ao Projeto, não ao usuário). Sincronização de Suites do Jira é **manual por botão**,
usando o token OAuth do usuário logado.

Decisões confirmadas com o usuário:
1. **Uma única organização Atlassian** (não é SaaS multi-tenant).
2. **Sync manual por botão** com o token OAuth do próprio usuário (background/conta de serviço → depois).
3. **Autorização binária**: se o usuário enxerga o projeto no Jira, ele vê e edita tudo no TestRun daquele projeto.
4. **Migrar SQLite → PostgreSQL** (concorrência de escrita real).

---

## Análise da arquitetura (respostas diretas)

**A modelagem faz sentido para QA colaborativo?** Sim. `Projeto → Suites → Casos → Execuções`, com dados
compartilhados por projeto, é o modelo padrão (TestRail, Xray, Zephyr). A ideia de a Suite pertencer ao Projeto
(e não ao usuário) é a decisão correta.

**Existe arquitetura melhor?** A ideia central é boa; os ajustes necessários são: (a) **não é single-tenant só
no conceito — precisa de `Project` e escopo por projeto em TODA query** (hoje nenhuma query filtra); (b) **sessão
própria** em vez de depender do token Atlassian a cada request; (c) **espelhar conteúdo (suites/casos) no banco**,
mas **consultar/cachear permissões** do Jira (elas são domínio do Jira e mudam).

**Jira como fonte de auth?** Sim para **autenticação** (OAuth 2.0 3LO da Atlassian — evita gerenciar senhas).
Para **autorização**, usar o acesso a projeto do Jira como *visibilidade* é adequado, desde que **cacheado** com TTL
(não dá para bater no Jira a cada request). Granularidade fina (viewer/editor) fica desacoplada, para depois.

**Sincronizar issues para banco próprio ou consultar o Jira sempre?** **Híbrido**:
- **Espelhar** suites/casos no banco (Execuções referenciam casos por ID estável, precisam de histórico, relatórios
  e performance) — é o que já é feito, mantém-se.
- **Consultar + cachear** a **lista de projetos acessíveis** e a **checagem de membership** (permissão muda no Jira).
- Nunca consultar o Jira para renderizar o conteúdo de uma suite já importada.

**Como implementar authN/authZ de forma escalável?** OAuth 3LO → cria/atualiza `User` local → emite **sessão própria
(JWT em cookie httpOnly)**. Tokens Atlassian ficam **no servidor, cifrados**. Guards do NestJS: `JwtAuthGuard`
(sessão) + `ProjectAccessGuard` (membership cacheado, revalidação por TTL contra o Jira).

**Riscos** (detalhados na seção Riscos abaixo): concorrência do SQLite, staleness de permissão, expiração/revogação
de consentimento OAuth, segurança dos tokens, rate limit do Jira, Jira como ponto único de login.

**Melhorias antes de começar** (ver Fase 0): migrar para Postgres, externalizar config/segredos (fim do
`config.json` em texto puro), registrar app OAuth, e planejar a migração de dados (backfill de `Project`).

---

## Arquitetura recomendada

**Fluxo de login (Atlassian OAuth 2.0 3LO):**
1. Frontend → `GET /auth/login` → backend redireciona para `https://auth.atlassian.com/authorize`
   (`audience=api.atlassian.com`, `scope=read:me read:jira-work offline_access`, `state`, `prompt=consent`).
2. Callback `GET /auth/callback` troca o `code` no `https://auth.atlassian.com/oauth/token`.
3. Backend descobre o **cloudId** via `GET https://api.atlassian.com/oauth/token/accessible-resources`
   (org única → cloudId fixo, guardado em env/tabela).
4. Perfil via `GET https://api.atlassian.com/me` → upsert `User` (`atlassianAccountId` único).
5. Guarda **access/refresh tokens cifrados** no `User`; emite **sessão própria** (JWT httpOnly cookie).
6. Todas as chamadas Jira passam a ir por `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...` com
   `Authorization: Bearer <accessToken>` (refresh automático quando expira).

**Autorização:** `ProjectAccessGuard` resolve o `projectId` da rota/recurso, checa `ProjectMembership` (cache).
Se `lastCheckedAt` estiver além do TTL (ex.: 15 min), revalida contra o Jira (`GET /rest/api/3/project/search`
com o token do usuário lista só o que ele pode ver) e atualiza o cache.

**Projetos:** `GET /projects` chama `project/search` com o token do usuário → lista projetos acessíveis; faz upsert
de `Project` e de `ProjectMembership` do usuário. Frontend ganha um **seletor de projeto**.

**Sync de Suites (manual):** botão "Sincronizar" dentro do projeto → `POST /projects/:projectId/suites/sync`
usa o token OAuth do usuário logado; reaproveita/ajusta `importSuite`. Suites criadas ficam com `projectId` e
aparecem para **todos** os membros do projeto.

---

## Modelo de dados (Prisma) — mudanças em `backend/prisma/schema.prisma`

**Novos modelos:**
```prisma
model User {
  id                 String   @id @default(uuid())
  atlassianAccountId String   @unique
  email              String?
  displayName        String
  avatarUrl          String?
  accessToken        String?  // cifrado em repouso
  refreshToken       String?  // cifrado em repouso
  accessTokenExpires DateTime?
  memberships        ProjectMembership[]
  executions         Execution[]        // createdBy
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Project {
  id             String   @id @default(uuid())
  jiraProjectId  String   @unique   // id numérico do projeto no Jira
  jiraProjectKey String   @unique   // ex.: "PROJ"
  name           String
  lastSyncedAt   DateTime?
  suites         Suite[]
  batches        ExecutionBatch[]
  memberships    ProjectMembership[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ProjectMembership {   // cache de "usuário pode acessar projeto" (vindo do Jira)
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  lastCheckedAt DateTime @default(now())
  @@unique([userId, projectId])
}
```

**Ajustes em modelos existentes:**
- `Suite`: adicionar `projectId String` + relação com `Project` (cascade). Trocar `jiraKey String? @unique` e
  `manualKey String? @unique` por **unicidade por projeto**: `@@unique([projectId, jiraKey])` e `@@unique([projectId, manualKey])`.
- `ExecutionBatch`: adicionar `projectId String` + relação com `Project`.
- `Execution`: adicionar `createdById String?` + relação com `User` (mantém `responsible` texto por ora).
- `provider = "postgresql"` no datasource (era `sqlite`).

**Migração de dados (backfill):** as suites globais de hoje não têm projeto. Estratégia: derivar `jiraProjectKey`
do prefixo do `jiraKey` (ex.: `PROJ-100` → `PROJ`), criar os `Project` correspondentes e ligar cada suite; suites
manuais (`isManual`) vão para um `Project` "default" a definir. Script único de migração (Prisma migrate + seed/script TS).

---

## Roteiro de implementação (fases)

**Fase 0 — Fundações**
- Trocar provider Prisma para PostgreSQL; ajustar `docker-compose.yml` (serviço `postgres` + volume) e
  `DATABASE_URL` por env.
- Externalizar config em variáveis de ambiente (`.env`): `DATABASE_URL`, `ATLASSIAN_CLIENT_ID/SECRET`,
  `OAUTH_REDIRECT_URI`, `JIRA_CLOUD_ID`, `TOKEN_ENC_KEY`, `SESSION_JWT_SECRET`, `FRONTEND_URL`.
- Registrar app OAuth 3LO em developer.atlassian.com (scopes `read:me`, `read:jira-work`, `offline_access`).
- Utilitário de cifra para tokens (AES-GCM com `TOKEN_ENC_KEY`).

**Fase 1 — Autenticação**
- `AuthModule`: `AuthController` (`/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/me`), `AuthService`
  (troca de code, refresh, upsert de `User`, emissão de JWT httpOnly).
- Refatorar `JiraService` para receber `bearer token + cloudId` e usar `api.atlassian.com/ex/jira/{cloudId}`
  (remover Basic auth / `config.json`).
- `JwtAuthGuard` global; expor usuário via decorator `@CurrentUser()`.
- Frontend: página de login ("Entrar com Atlassian"), tratamento do retorno, guarda de rotas em
  `frontend/src/App.tsx`, exibição do usuário logado, logout.

**Fase 2 — Projetos**
- `ProjectsModule`: `GET /projects` (lista do Jira filtrada pelo usuário + upsert `Project`/`ProjectMembership`).
- Frontend: **seletor de projeto**; dashboard passa a operar dentro de um projeto.
- Rodar migração/backfill dos dados existentes para `Project`.

**Fase 3 — Autorização + escopo por projeto**
- `ProjectAccessGuard` com cache de `ProjectMembership` e revalidação por TTL.
- **Escopar por `projectId` TODAS as queries** hoje globais — pontos críticos:
  `suites.service.ts` (`findAll`, `findOne`, `importFromJira`, `createManual`, `deleteSuite`),
  `executions.service.ts`, `batch` service e `reports`. Rotas passam a incluir o projeto
  (ex.: `GET /projects/:projectId/suites`).

**Fase 4 — Sync de Suites por projeto (manual)**
- `POST /projects/:projectId/suites/sync` usando o token OAuth do usuário; reaproveita a lógica de `importSuite`
  e o upsert de `importFromJira` (`suites.service.ts:127`), agora com `projectId`.
- Botão "Sincronizar" na UI do projeto; novas suites aparecem para todos os membros.

**Fase 5 — Depois (fora deste plano)**
- Sync automático em background (exigirá conta de serviço ou refresh tokens dedicados).
- Papéis próprios (viewer/editor/admin) desacoplados do Jira.

---

## Riscos e mitigações
- **Concorrência SQLite** → resolvido migrando para Postgres (Fase 0).
- **Staleness de permissão** (usuário removido no Jira continua vendo o projeto) → cache com TTL curto e
  revalidação no `ProjectAccessGuard`; logout/expiração de sessão.
- **Consentimento OAuth expira/revogado** → refresh token; se falhar, forçar re-login. Como a sync é manual e
  usa o token do usuário logado, não há job de background quebrando silenciosamente.
- **Segurança dos tokens** → fim do `config.json` em texto puro; tokens cifrados (AES-GCM), sessão em cookie httpOnly.
- **Rate limit do Jira** na sync → sync manual reduz o risco; adicionar tratamento de 429/backoff.
- **Jira como ponto único de login** → sessão própria com TTL razoável mantém o app utilizável durante instabilidades
  curtas; ainda assim, indisponibilidade da Atlassian impede novos logins (risco aceito para uso interno).
- **Migração de dados** → o backfill por prefixo de `jiraKey` pode falhar para suites manuais; tratar com projeto
  "default" e validar antes de aplicar em produção.

---

## Verificação (end-to-end)
1. `docker compose up` sobe Postgres + backend + frontend; `prisma migrate deploy` aplica o schema novo.
2. Abrir o frontend → "Entrar com Atlassian" → consentir → cair logado, com `GET /auth/me` retornando o usuário.
3. `GET /projects` retorna **apenas** os projetos que a conta enxerga no Jira (validar com um usuário de teste sem
   acesso a um projeto → ele não aparece).
4. Selecionar um projeto → "Sincronizar" → suites aparecem; conferir no banco que a `Suite` tem `projectId`.
5. Logar com um **segundo usuário** do mesmo projeto → ele vê as mesmas suites/execuções (compartilhamento por projeto).
6. Tentar acessar via API uma suite de um projeto sem acesso → `ProjectAccessGuard` bloqueia (403).
7. Rodar os testes do backend (`npm test`) após ajustar os services escopados por projeto.
