# Proposta de evolução do Dashboard de QA

A ideia é manter o dashboard focado em indicadores que realmente ajudam a entender a saúde do sistema e direcionam ações, evitando métricas muito genéricas.

## 1. Operação (manter)

Essas informações continuam sendo importantes porque mostram o que está acontecendo no momento.

* Execuções em andamento.
* Bugs **Ready for Test**.
* Melhorias **Ready for Test**.
* Seção **Atenção** (execuções travadas, falhas de integração, filas, etc.).
* Lista de bugs em **Ready for Test** ou **Testing**.
* Últimas execuções realizadas.

---

## 2. Densidade de defeitos por módulo (nova seção)

Adicionar um gráfico mostrando a quantidade de bugs por **label** (ou módulo).

Exemplo:

* Login – 18 bugs
* Financeiro – 12 bugs
* Relatórios – 5 bugs
* API – 20 bugs

Isso permite identificar rapidamente quais áreas do sistema apresentam maior incidência de defeitos e, consequentemente, merecem maior atenção.

Para isso, seria necessário padronizar a abertura de bugs, tornando obrigatório informar a label correspondente ao módulo afetado.

---

## 3. Taxa de sucesso × severidade dos defeitos (nova seção)

Adicionar um gráfico de barras empilhadas relacionando o resultado das execuções com a gravidade dos bugs encontrados.

Exemplo:

Execução A

* 92% dos testes aprovados
* 3 bugs críticos
* 5 médios
* 8 baixos

Execução B

* 98% dos testes aprovados
* 1 bug médio
* 2 baixos

Dessa forma, uma execução com poucos testes reprovados, mas contendo bugs críticos, fica claramente destacada.

Também seria interessante considerar melhorias vinculadas às execuções, permitindo visualizar a distribuição por severidade ou prioridade.

---

## 4. Índice de cobertura de requisitos (nova seção)

Adicionar um indicador de cobertura funcional.

A proposta é relacionar os épicos do Jira com as suítes de teste correspondentes.

O dashboard poderia apresentar informações como:

* Percentual de funcionalidades que possuem cobertura de testes.
* Quantidade de funcionalidades sem cobertura.
* Quantidade de casos de teste existentes.
* Quantidade de casos automatizados.
* Percentual de automação.

Exemplo:

* 120 funcionalidades cadastradas.
* 105 possuem cobertura de testes (87,5%).
* 980 casos de teste.
* 760 automatizados (77,5%).

Para isso, seria necessário ajustar o cadastro das suítes para que elas também sejam vinculadas aos épicos ou funcionalidades correspondentes.

---

## 5. MTTR e idade dos defeitos (nova seção)

Adicionar indicadores relacionados ao tempo de resolução dos bugs.

Exibir:

* MTTR (Mean Time To Repair).
* Idade média dos bugs em aberto.
* Quantidade de bugs acima do SLA definido.

Exemplo:

* MTTR: 4,2 dias.
* 7 bugs com mais de 15 dias abertos.
* 2 bugs críticos acima do SLA.

Esses indicadores ajudam a identificar gargalos no processo de correção e evitam que defeitos permaneçam esquecidos por longos períodos.

---

## Consideração final

Acredito que o dashboard pode ser organizado em três grandes blocos:

### Operação

* Execuções em andamento.
* Ready for Test.
* Atenção.
* Últimas execuções.

### Qualidade

* Densidade de defeitos por módulo.
* Taxa de sucesso × severidade.
* Cobertura de requisitos.
* Cobertura de automação.

### Eficiência

* MTTR.
* Idade dos defeitos.
* Bugs acima do SLA.

Com essa estrutura, o dashboard deixa de mostrar apenas o que está acontecendo e passa a responder também:

* Onde estão os problemas?
* Quais áreas são mais frágeis?
* Quanto do sistema está protegido por testes?
* Quão rápido estamos corrigindo defeitos?
* A qualidade está melhorando ou piorando ao longo do tempo?

Eu acrescentaria apenas mais dois indicadores que costumam gerar muito valor e aproveitam os dados que vocês já possuem:

Taxa de regressão: percentual de bugs encontrados em funcionalidades que já haviam sido aprovadas anteriormente. Isso mostra se as alterações estão introduzindo novos problemas em áreas já estáveis.
Tendência da qualidade: gráficos mostrando a evolução nas últimas semanas (taxa de aprovação dos testes, bugs críticos abertos e MTTR). Um valor isolado diz pouco; a tendência mostra se a qualidade está evoluindo ou se deteriorando.

Na minha visão, esses dois indicadores, junto com os que você propôs, fecham um dashboard bastante completo, cobrindo operação, qualidade e eficiência do processo de QA.