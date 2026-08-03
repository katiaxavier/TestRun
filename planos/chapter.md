**Título:** Suporte a Cenários/Charters dentro da Execução de Casos de Teste

## Objetivo

Adicionar suporte à execução de testes no modelo de Charter/Exploratório, permitindo que um caso de teste possua múltiplos cenários (áreas de concentração) durante uma execução.

O objetivo é evitar a duplicação de casos de teste e permitir que cada cenário tenha seu próprio resultado, issues, evidências e observações.

---

## Contexto

Atualmente, uma execução é composta por uma suíte contendo casos de teste importados do Jira.

Cada caso de teste possui informações de execução como:

* Key
* Titulo
* prioridade
* Status
* Responsável
* B&M

Em testes exploratórios (Charter), um único caso de teste pode ser executado em diferentes áreas de concentração.

Exemplo:

```text
Teste A

- Processamento A
- Processamento B
- Processamento C
```

Hoje isso é controlado externamente em planilhas através da duplicação do título do teste, alterando apenas o cenário executado.

Deseja-se trazer esse conceito para dentro da aplicação.

---

## Nova Funcionalidade

Adicionar a possibilidade de criar **Cenários de Execução** dentro de um Caso de Teste durante a execução.

### Estrutura desejada

```text
Execução
 └─ Teste A
      ├─ Cenário: Processamento A
      ├─ Cenário: Processamento B
      └─ Cenário: Processamento C
```

---

## Comportamento

### Casos de Teste sem Cenários

O comportamento atual deve permanecer inalterado.

### Casos de Teste com Cenários

Quando um ou mais cenários forem adicionados:

* O status deixa de ser controlado diretamente no Caso de Teste.
* O status passa a ser controlado individualmente por cada cenário.
* Issues passam a ser vinculadas ao cenário.
* Evidências passam a ser vinculadas ao cenário.
* Comentarios passam a ser vinculadas ao cenário.

Exemplo:

```text
Teste A

Cenário: Processamento A
Status: Passed

Cenário: Processamento B
Status: Failed
B&M: BUG-123

Cenário: Processamento C
Status: Passed
```

---

## Regra de Agregação de Status

Quando um Caso de Teste possuir cenários, seu status deve ser calculado automaticamente com base nos cenários.

Sugestão:

| Cenários                              | Status do Caso |
| ------------------------------------- | -------------- |
| Todos Passed                          | Passed         |
| Pelo menos um Failed                  | Failed         |
| Pelo menos um Blocked e nenhum Failed | Blocked        |
| Todos Not Executed                    | Not Executed   |
| Mistos                                | In Progress    |

O status calculado deve ser exibido apenas para consulta e não deve ser editável.

---

## Interface

### Dentro do Caso de Teste

Adicionar ação:

```text
+ Adicionar Cenário
```

Ao clicar:

```text
Nome do Cenário
[________________]

[Salvar]
```

---

### Exibição

```text
▼ Teste A

Status Geral: Failed

Cenários

✓ Processamento A
✗ Processamento B
✓ Processamento C
```

---

## Dados dos Cenários

Cada cenário deve possuir:

* Nome
* Status
* Issues

Ao clicar no cenario vai abrir o drawer igual como se fosse no caso de teste.
---

## Compatibilidade

* Não alterar a integração com Jira.
* Não criar novos Casos de Teste no Jira.
* Não duplicar Casos de Teste importados.
* Funcionalidade opcional.
* Casos de teste existentes continuam funcionando normalmente.

