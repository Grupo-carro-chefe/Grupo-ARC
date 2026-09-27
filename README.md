# DoaGol

![CI](https://github.com/Grupo-carro-chefe/Grupo-ARC/actions/workflows/ci.yml/badge.svg)

Sistema de Gestão de Doações para Escolinhas de Futebol Social. Trabalho da disciplina de
Laboratório de Engenharia de Software, Universidade Presbiteriana Mackenzie.

| Integrante | RA |
|---|---|
| André Ihsan Ward | 10425684 |
| Rodrigo Lucas Mascarenhas Leite Oliveira | 10427925 |
| Cristian de Souza | 10436050 |

## Entrega 2: classe implementada e testes

Para a camada de aplicação, adotamos **Node.js**, mantendo JavaScript de ponta a ponta com o
front-end em React definido na arquitetura (Capítulo 6). Os testes unitários usam **Jest**, e a
integração contínua roda no **GitHub Actions**.

A classe implementada é **`Necessidade`** (diagrama de classes, Figura 5.2), que representa a
necessidade concreta de uma criança (ex.: "Chuteira de futsal nº 33") e concentra as regras dos
requisitos **RF04** (cadastrar, editar e encerrar necessidades) e **RF08** (atualizar o valor
arrecadado após a confirmação do pagamento).

| Arquivo | Conteúdo |
|---|---|
| [`src/domain/Necessidade.js`](src/domain/Necessidade.js) | Classe `Necessidade` e os enums `TipoNecessidade` e `StatusNecessidade` |
| [`tests/Necessidade.test.js`](tests/Necessidade.test.js) | Classe de teste (Jest) com 6 grupos de teste e 34 casos |

### Regras de negócio

- Uma necessidade nasce `ABERTA`, com tipo válido, descrição obrigatória e meta maior que zero (no máximo duas casas decimais).
- `registrarDoacao(valor)` só aceita valores positivos, até o restante da meta, e só enquanto a necessidade está `ABERTA`. Quando a meta é atingida, ela passa para `ATENDIDA`.
- `percentualArrecadado()` alimenta a barra de progresso do perfil da criança (Figura 4.3) e arredonda para baixo.
- `editar()` não permite reduzir a meta abaixo do que já foi arrecadado.
- `encerrar()` só funciona para necessidades abertas.
- Os valores são guardados em centavos para evitar erros de ponto flutuante (`0.1 + 0.2`).

### Métodos de teste

| # | Método testado | Casos |
|---|---|---|
| 1 | criação (`constructor`) | 8 |
| 2 | `registrarDoacao()` | 10 |
| 3 | `percentualArrecadado()` | 5 |
| 4 | `valorRestante()` | 3 |
| 5 | `editar()` | 5 |
| 6 | `encerrar()` / `estaAberta()` | 3 |

## Como executar

Requer Node.js 20 ou mais recente.

```bash
npm install
npm test               # roda os testes
npm run test:coverage  # roda os testes com relatório de cobertura
```

## Esteira de integração contínua

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda no GitHub Actions a cada
`push` ou pull request na branch `main`, e também pode ser disparado manualmente na aba
**Actions**. Etapas:

1. Baixa o código do repositório.
2. Configura o Node.js (matriz com as versões 20 e 22).
3. Instala as dependências com `npm ci`.
4. Executa os testes com cobertura mínima exigida (95% de linhas, 85% de branches). Se algum teste falhar ou a cobertura cair, a esteira fica vermelha.
5. Publica o relatório de cobertura como artefato da execução.
