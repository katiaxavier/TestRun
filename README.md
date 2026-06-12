# 🧪 Testrun - Plataforma de Execução de Ciclos de Teste

> Automatize a gestão de suites de teste do Jira e gere relatórios profissionais em .xlsx e .pdf

![Badge Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![License](https://img.shields.io/badge/license-UNLICENSED-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)

## 📋 Sobre o Projeto

O **Testrun** é uma aplicação desktop de QA que automatiza o fluxo de execução de testes integrado ao Jira. Ele elimina tarefas manuais repetitivas, centralizando a gestão de ciclos de teste, coleta de resultados e geração de relatórios profissionais.

### 🎯 Problema Resolvido

O fluxo atual de QA envolve várias etapas manuais:
- ✖️ Criação manual de suites e casos de teste no Jira
- ✖️ Cópia e preenchimento manual em planilhas
- ✖️ Atualização descentralizada de status e métricas
- ✖️ Consolidação manual de relatórios

### ✨ Solução

Com o Testrun:
- ✅ **Importação automática** de suites do Jira
- ✅ **Interface intuitiva** para execução de testes
- ✅ **Rastreamento centralizado** de resultados
- ✅ **Geração automática** de relatórios em .xlsx e .pdf
- ✅ **Integração bidirecional** com Jira

---

## 👥 Público-Alvo

- 🧑‍💼 Analistas de QA
- 🔬 Engenheiros de Teste
- 📊 Coordenadores de Qualidade
- 👨‍💻 Squads de desenvolvimento ágil

---

## 🏗️ Arquitetura & Stack Técnico

### Backend (NestJS + Prisma)
```
Node.js + Express | NestJS Framework | TypeScript | Prisma ORM | PostgreSQL
```

**Dependências principais:**
- `@nestjs/common` - Framework NestJS
- `@prisma/client` - ORM para banco de dados
- `exceljs` - Geração de relatórios Excel
- `pdfmake` - Geração de relatórios PDF
- `class-validator` - Validação de DTOs

### Frontend (React + Vite + Tailwind)
```
React 19 | TypeScript | Vite | Tailwind CSS | Recharts | React Router
```

**Dependências principais:**
- `react` - UI library
- `react-router-dom` - Roteamento
- `axios` - Cliente HTTP
- `recharts` - Gráficos e visualizações
- `framer-motion` - Animações
- `@phosphor-icons/react` - Ícones

### Banco de Dados
```
PostgreSQL 15 (Docker)
```

---

## 📊 Modelo de Dados

```
┌─────────────────────┐
│   Suite de Teste    │
│   (Importada Jira)  │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌───────────────┐
│Execução │  │ Caso de Teste │
│de Teste │  │               │
└─────────┘  └───────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ Issue/Bug    │
              │ (Jira Link)  │
              └──────────────┘
```

### Entidades

| Entidade | Descrição |
|----------|-----------|
| **Suite de Teste** | Entidade principal - agrupa casos de teste |
| **Execução de Teste** | Representa um ciclo de execução da suite |
| **Caso de Teste** | Itens vinculados à suite (importados do Jira) |
| **Issue** | Bugs ou melhorias associadas a casos de teste |

### Relacionamentos

- Uma suite possui **N execuções**
- Uma suite possui **N casos de teste**
- Um caso de teste pode possuir **N issues** (bugs/melhorias)

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** >= 18.x
- **npm** ou **yarn**
- **Docker** e **Docker Compose**
- **Git**

### 1️⃣ Clonar o Repositório

```bash
git clone <seu-repositorio>
cd TestRun
```

### 2️⃣ Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/testrun"

# Jira Integration
JIRA_URL=https://seu-dominio.atlassian.net
JIRA_USER_EMAIL=seu-email@empresa.com
JIRA_API_TOKEN=seu-token-api-jira
```

### 3️⃣ Iniciar Banco de Dados

```bash
docker compose up -d
```

Isso iniciará:
- **PostgreSQL 15** na porta `5432`

### 4️⃣ Instalar Dependências

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev
```

**Frontend:**
```bash
cd frontend
npm install
```

### 5️⃣ Executar em Desenvolvimento

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

Backend rodará em: `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend rodará em: `http://localhost:5173`

---

## 📁 Estrutura do Projeto

```
TestRun/
├── backend/
│   ├── src/
│   │   ├── config/              # Módulo de configuração Jira
│   │   ├── executions/          # Módulo de execuções de teste
│   │   ├── jira/                # Integração com API Jira
│   │   ├── reports/             # Geração de relatórios
│   │   ├── suites/              # Gestão de suites de teste
│   │   ├── prisma/              # Serviço do Prisma ORM
│   │   ├── app.controller.ts    # Controller principal
│   │   ├── app.module.ts        # Módulo raiz
│   │   └── main.ts              # Entry point
│   ├── prisma/
│   │   └── schema.prisma        # Schema do banco de dados
│   ├── test/
│   │   └── app.e2e-spec.ts      # Testes E2E
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis
│   │   │   ├── Modal.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── pages/               # Páginas da aplicação
│   │   │   ├── ConfigPage.tsx       # Configuração Jira
│   │   │   ├── DashboardPage.tsx    # Dashboard principal
│   │   │   ├── ExecutionRunPage.tsx # Execução de testes
│   │   │   └── SuiteDetailPage.tsx  # Detalhes da suite
│   │   ├── api/
│   │   │   └── client.ts        # Cliente HTTP (Axios)
│   │   ├── assets/              # Imagens e recursos
│   │   ├── App.tsx              # Componente raiz
│   │   └── main.tsx             # Entry point
│   ├── public/
│   └── package.json
│
├── docker-compose.yml           # Configuração dos serviços Docker
├── especificacoes.md            # Especificações detalhadas
└── README.md                    # Este arquivo
```

---

## 🔌 Integração com Jira

### Configuração Inicial

1. **Obtenha suas credenciais Jira:**
   - URL: `https://seu-dominio.atlassian.net`
   - E-mail: Seu e-mail da conta Jira
   - Token: Gere em [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

2. **Configure no Testrun:**
   - Abra a página de **Configuração**
   - Preencha URL, E-mail e Token
   - Teste a conexão

### Capacidades de Integração

✅ Autenticar no Jira via API  
✅ Buscar suite de teste pelo ID da task  
✅ Importar automaticamente casos de teste filhos  
✅ Armazenar links, títulos, status e comentários  
✅ Associar bugs e melhorias aos casos  

---

## 📊 Fluxo Principal da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CONFIGURAÇÃO DO JIRA                                     │
│    • Informar URL, E-mail e Token da API                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 2. IMPORTAÇÃO DA SUITE                                      │
│    • Informar ID da suite no Jira                           │
│    • Sistema importa automaticamente casos de teste         │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 3. CRIAÇÃO DA EXECUÇÃO                                      │
│    • Preencher metadados do ciclo:                          │
│      - Sprint, Versão, Datas, Funcionalidade, Responsáveis │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 4. EXECUÇÃO DOS TESTES                                      │
│    • Executar cada caso de teste                            │
│    • Registrar resultado (Pass/Fail/Blocked)                │
│    • Comentários e bugs encontrados                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 5. GERAÇÃO DE RELATÓRIOS                                    │
│    • Consolidar métricas e gráficos de progresso            │
│    • Exportar em .xlsx e .pdf                               │
│    • Compartilhar com stakeholders                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Comandos Disponíveis

### Backend

```bash
# Desenvolvimento
npm run start:dev          # Iniciar com hot-reload

# Build e Produção
npm run build              # Compilar para produção
npm run start:prod         # Iniciar em produção

# Qualidade de Código
npm run lint              # Executar ESLint
npm run format            # Formatar código com Prettier

# Testes
npm run test              # Executar testes unitários
npm run test:watch        # Testes em modo watch
npm run test:cov          # Cobertura de testes
npm run test:e2e          # Testes end-to-end

# Banco de Dados
npx prisma migrate dev    # Criar novas migrações
npx prisma studio        # Visualizar dados (GUI)
```

### Frontend

```bash
# Desenvolvimento
npm run dev               # Iniciar servidor de desenvolvimento

# Build e Produção
npm run build             # Compilar para produção
npm run preview           # Visualizar build local

# Qualidade de Código
npm run lint              # Executar ESLint
```

---

## 📄 Geração de Relatórios

### Formatos Suportados

**Excel (.xlsx)**
- Tabelas estruturadas
- Gráficos de progresso
- Resumo executivo
- Análise por prioridade

**PDF**
- Relatório profissional
- Gráficos visuais
- Pronto para compartilhar
- Fácil impressão

### Como Gerar

1. Acesse a suite de teste
2. Finalize a execução
3. Clique em "Gerar Relatório"
4. Escolha o formato (Excel ou PDF)
5. Download automático

---

## 🔐 Segurança

- ✅ Credenciais Jira armazenadas de forma segura
- ✅ Validação de entrada (DTO com class-validator)
- ✅ Autenticação via token Jira
- ✅ Dados locais (não sincronizam na nuvem)

---

## 🐛 Troubleshooting

### Erro de Conexão com PostgreSQL

```bash
# Verificar se Docker está rodando
docker ps

# Reiniciar containers
docker compose down
docker compose up -d
```

### Erro de Credenciais Jira

- Verifique se a URL, e-mail e token estão corretos
- Confirme que o token não expirou
- Teste a API manualmente: `curl -u email:token https://seu-url/rest/api/3/myself`

### Frontend não carrega

- Limpe o cache: `rm -rf node_modules package-lock.json && npm install`
- Verifique se o backend está rodando em `http://localhost:3000`

---

## 📚 Documentação Adicional

- [Especificações Detalhadas](./especificacoes.md)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev)
- [Jira API Documentation](https://developer.atlassian.com/cloud/jira/rest/v3)

---

## 📈 Roadmap

- [ ] Autenticação de usuários
- [ ] Múltiplos projetos Jira
- [ ] Histórico de execuções
- [ ] Integração com outras ferramentas (Azure DevOps, TestRail)
- [ ] Dashboard com KPIs
- [ ] Notificações em tempo real

---

<div align="center">

**Feito com ❤️ para profissionais de QA**

⭐ Se este projeto foi útil, considere dar uma estrela!

</div>
