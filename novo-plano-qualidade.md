# Plano de Melhorias do Dashboard de QA

## Objetivo

Refinar o dashboard para que ele não apenas apresente métricas, mas também facilite a tomada de decisão. O foco é tornar cada indicador autoexplicativo, mostrando contexto, tendência e priorização.

---

# 1. Dashboard de Qualidade

## 1.1. Adicionar cards de resumo (Health KPIs)

### Objetivo

Permitir que o usuário identifique rapidamente o estado geral da qualidade antes de analisar os gráficos.

### Sugestão

Adicionar uma linha de indicadores acima dos gráficos.

Exemplo:

- Taxa de aprovação dos testes
- Bugs críticos em aberto
- Cobertura de requisitos
- Cobertura de automação
- Tendência da qualidade

Exemplo visual:

| Indicador | Valor |
|-----------|------:|
| Taxa de aprovação | 96,3% |
| Bugs críticos | 2 |
| Cobertura | 87% |
| Automação | 81% |
| Tendência | ↑ +3% |

---

## 1.2. Melhorar a Densidade de Defeitos

### Situação atual

O gráfico mostra apenas a quantidade de bugs por label.

### Melhoria

Transformar em uma densidade real.

Ao invés de:

- Financeiro → 18 bugs

Mostrar:

- Financeiro → 18 bugs / 240 testes (7,5%)
- Login → 15 bugs / 40 testes (37%)

Assim é possível comparar áreas de tamanhos diferentes.

---

## 1.3. Melhorar o gráfico de Severidade

### Situação atual

Não fica claro o que cada barra representa.

### Melhoria

Adicionar contexto.

Exemplo:

- por Sprint
- por Execução
- por Release

Além disso, exibir tooltip contendo:

- Total de testes
- Testes reprovados
- Bugs por severidade
- Melhorias encontradas

---

## 1.4. Melhorar Cobertura de Requisitos

### Situação atual

Os cards mostram apenas números.

### Melhoria

Adicionar indicadores mais claros.

Exemplo:

Cobertura

```
87%

351 de 402 épicos possuem suíte
```

Automação

```
78%

880 de 1130 casos automatizados
```

---

## 1.5. Adicionar Tendência

Sempre que possível, mostrar evolução.

Exemplo

```
Cobertura

81%

↑ +6% últimos 30 dias
```

ou

```
Bugs críticos

4

↓ -2 esta semana
```

---

# 2. Dashboard de Eficiência

## 2.1. Melhorar indicador de Bugs acima do SLA

### Situação atual

Mostra apenas a quantidade.

### Melhoria

Separar em três estados.

Exemplo

- 🟢 Dentro do SLA
- 🟡 Próximos do SLA
- 🔴 Acima do SLA

Assim o usuário entende rapidamente a situação.

---

## 2.2. Adicionar contexto ao MTTR

### Situação atual

Exibe apenas o valor.

Exemplo

```
25 dias
```

### Melhoria

Comparar com períodos anteriores.

Exemplo

```
25 dias

↓ 18% em relação ao mês passado
```

ou

```
Meta

20 dias

Atual

25 dias
```

---

## 2.3. Melhorar Idade Média dos Defeitos

Adicionar indicadores complementares.

Exemplo

```
Idade média

38 dias

Maior idade

74 dias

Menor idade

5 dias
```

ou

```
38 dias

↑ +7 dias nos últimos 30 dias
```

---

## 2.4. Melhorar tabela de Bugs acima do SLA

Adicionar colunas úteis.

Sugestão

- Data de abertura
- Percentual acima do SLA

Exemplo

| Bug | Severidade | SLA | Dias | % SLA |
|-----|------------|-----|------|-------:|
| BUG-123 | Alta | 15 | 35 | 233% |

---

## 2.5. Criar indicador de criticidade do SLA

Além dos dias em aberto, calcular quanto o bug ultrapassou o SLA.

Exemplo

```
35 dias

233% do SLA
```

Esse indicador ajuda na priorização.

---

# 3. Melhorias Gerais

## 3.1. Adicionar Tooltips

Todos os cards e gráficos devem possuir um tooltip explicando:

- o que significa;
- como é calculado;
- qual a interpretação do indicador.

---

## 3.2. Tornar os gráficos clicáveis

Permitir drill-down.

Exemplo

```
Financeiro

18 bugs
```

↓

Lista de bugs daquela label.

---

## 3.3. Melhorar uso das cores

Utilizar cores para representar saúde.

Exemplo

- 🟢 saudável
- 🟡 atenção
- 🔴 crítico

Evitar utilizar vermelho apenas como cor padrão.

---

## 3.4. Adicionar filtros globais

Todos os dashboards devem responder aos mesmos filtros.

Sugestão

- Projeto
- Sprint
- Release
- Período
- Responsável
- Ambiente

---

# Melhoria futura

## Health Score

Criar um indicador geral da saúde do projeto.

Exemplo

```
Health Score

92%

🟢 Saudável
```

Composição sugerida

- 40% Taxa de aprovação
- 25% Bugs críticos
- 20% Cobertura de requisitos
- 15% MTTR

Além do valor, exibir os fatores que mais impactaram o resultado.

Exemplo

```
✔ Aprovação excelente

✔ Cobertura boa

⚠ Bugs críticos impactando

✔ MTTR dentro da meta
```

---

# Priorização

## Alta prioridade

- Cards de resumo da Qualidade.
- Melhorar contexto dos gráficos.
- Adicionar tendências.
- Melhorar indicadores de SLA.
- Melhorar tabela de bugs acima do SLA.

## Média prioridade

- Drill-down nos gráficos.
- Melhorar cores.
- Adicionar comparativos históricos.
- Exibir percentual acima do SLA.

## Baixa prioridade

- Health Score.
- Comparativos entre releases.
- Indicadores por squad.
- Benchmark entre projetos.