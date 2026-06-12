### Ideia adaptada: Testrun — Plataforma local de execução de ciclos de teste integrada ao Jira

### Problema atual

Hoje o fluxo de QA envolve várias etapas manuais:

1. Criar a suíte de testes no Jira.

2. Criar e associar os casos de teste à suíte.

3. Copiar links e títulos dos casos para uma planilha modelo.

4. Preencher manualmente dados do ciclo (sprint, versão, datas, funcionalidade).

5. Atualizar status, responsáveis, comentários e issues durante a execução.

6. Consolidar métricas e gráficos de progresso.

Esse processo é repetitivo, sujeito a erros e dificulta o acompanhamento centralizado da execução dos testes.

### Solução proposta

Criar o Testrun, uma aplicação local para profissionais de QA que automatiza a importação de suítes do Jira, gerencia a execução do ciclo de testes e gera relatórios profissionais em .xlsx e .pdf.

### Contexto da aplicação

O fluxo da aplicação começa trazendo as suítes de teste do Jira para um ambiente estruturado onde o QA pode:

* Definir os metadados do ciclo de teste;

* Executar os casos de teste;

* Registrar resultados, bugs e melhorias;

* Gerar um relatório final compartilhável.


### Público-alvo

* Analistas de QA;

* Engenheiros de Teste;

* Coordenadores de Qualidade;

* Squads de desenvolvimento ágil.

### Modelo de entidades

* Suíte de Teste → entidade principal.

* Execução de Teste → representa um ciclo de execução da suíte.

* Caso de Teste → itens vinculados à suíte.

* Issue → bugs ou melhorias associados a um caso de teste.

### Relações

* Uma suíte possui N execuções.

* Uma suíte possui N casos de teste.

* Um caso de teste pode possuir N issues (bugs/melhorias).

### Integração com o Jira

A aplicação deverá consumir a API do Jira utilizando:

* JIRA_URL

* USER_EMAIL

* API_TOKEN

### Capacidades da integração

1. Autenticar no Jira via API.

2. Buscar uma suíte de teste pelo ID da task no Jira.

3. Importar automaticamente os casos de teste filhos da suíte.

4. Armazenar no sistema:

   * Link do caso de teste;

   * Título;

   * Status;

   * Anexos, comentários, bugs e melhorias.

### Fluxo principal da aplicação

1. Configuração do Jira O usuário informa URL, e-mail e token da API.

2. Importação da suíte O usuário informa o ID da suíte no Jira e o sistema importa automaticamente os casos de teste.

3. Criação da execução O usuário preenche os metadados do ciclo:

   * Sprint

   * Versão do sistema

   * Data de início

   * Data de fim

   * Funcionalidade testada
   
   * responsáveis


4. Execução dos testes Para cada caso de teste, o QA pode:

   * Alterar status (Passed, Failed, In Progress, Blocked)

   * Definir responsável

   * Adicionar comentários

   * Vincular bugs e melhorias


5. Dashboard e métricas A aplicação exibe gráficos e indicadores em tempo real:

   * Total de testes

   * Total executado

   * Total aprovado

   * Total falhado

   * Total bloqueado

6. Exportação do relatório

   * .xlsx

   * .pdf

### Funcionalidades essenciais

### Importação de suíte do Jira

* Busca por ID da suíte.

* Importação automática dos casos de teste.

* Sincronização de informações básicas do Jira.

### Gestão dos casos de teste

* Alterar status do teste.

* Editar responsável e comentários.

* Excluir casos (localmente, sem apagar no Jira).

* Vincular bugs e melhorias.


### Dashboard de execução

* Indicadores numéricos.

* Gráficos de progresso e distribuição de status.

* Visão rápida do andamento do ciclo.

### Exportação de relatórios

* Geração do relatorio .xlsx/.pdf com cabeçalho, resultados, resumo executivo e grafico


### Estrutura do relatório exportado

O relatório final deve conter:

1. Cabeçalho da execução

   * Nome da suíte

   * Sprint

   * Versão do sistema

   * Datas de início e fim

   * Funcionalidade testada

   * Responsável pela execução
2. Resumo executivo

   * Total de testes

   * Percentual de aprovação

   * Falhas e bloqueios

   * Gráficos de status
3. Detalhamento dos casos de teste

   * Key do Jira

   * Título

   * Status

   * Responsável

   * Comentários

   * Issues vinculadas
4. Bugs e melhorias

   * Lista consolidada de issues relacionadas à execução.

### Execução local

A aplicação será executada localmente na máquina do QA, sem necessidade inicial de infraestrutura em nuvem. 

### Benefícios esperados

* Eliminação do trabalho manual de montagem de planilhas.

* Padronização da execução dos ciclos de teste.

* Maior rastreabilidade entre Jira e execução.

* Relatórios profissionais gerados automaticamente.

* Visibilidade em tempo real do progresso dos testes.

### Objetivo final

O Testrun deve transformar o processo atual — baseado em planilhas manuais — em um fluxo integrado, rastreável e automatizado, onde a suíte de teste é importada do Jira, executada em um ambiente dedicado e exportada como um relatório completo.
