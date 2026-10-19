# Sprint 3: casos de uso implementados

Rastreabilidade entre os casos de uso da Entrega 1, o código e os testes desta sprint.
O back-end segue a arquitetura em camadas: `api` (Express) → `services` (orquestração) →
`domain` (regras de negócio) → `infra` (repositórios e integrações simulados).

## Casos de uso principais

| UC | Requisitos | Código | Testes | Endpoint |
|---|---|---|---|---|
| UC-03 Cadastrar Criança | RF03, RF06, RNF01 | [`src/domain/Crianca.js`](../../src/domain/Crianca.js), [`src/domain/Escolinha.js`](../../src/domain/Escolinha.js) (`cadastrarCrianca`) | [`tests/Crianca.test.js`](../../tests/Crianca.test.js), [`tests/Escolinha.test.js`](../../tests/Escolinha.test.js), [`tests/api.test.js`](../../tests/api.test.js) | `POST /escolinhas/:id/criancas` |
| UC-06 Buscar Crianças/Necessidades | RF05, RF06 | [`src/services/BuscaService.js`](../../src/services/BuscaService.js) | [`tests/BuscaService.test.js`](../../tests/BuscaService.test.js), [`tests/api.test.js`](../../tests/api.test.js) | `GET /criancas?cidade=&uf=&tipo=` |
| UC-08 Realizar Doação | RF07, RF08, RF09, RNF05 | [`src/services/DoacaoService.js`](../../src/services/DoacaoService.js), [`src/domain/Doacao.js`](../../src/domain/Doacao.js) | [`tests/DoacaoService.test.js`](../../tests/DoacaoService.test.js), [`tests/Doacao.test.js`](../../tests/Doacao.test.js), [`tests/api.test.js`](../../tests/api.test.js) | `POST /necessidades/:id/doacoes` |

## Casos de uso de apoio

| UC | Requisitos | Código | Testes | Endpoint |
|---|---|---|---|---|
| UC-02 Cadastrar Escolinha | RF02 | [`src/domain/Escolinha.js`](../../src/domain/Escolinha.js) | [`tests/Escolinha.test.js`](../../tests/Escolinha.test.js), [`tests/api.test.js`](../../tests/api.test.js) | `POST /escolinhas` |
| UC-04 Cadastrar Necessidade | RF04, RF08 | [`src/domain/Necessidade.js`](../../src/domain/Necessidade.js) (Entrega 2) | [`tests/Necessidade.test.js`](../../tests/Necessidade.test.js), [`tests/api.test.js`](../../tests/api.test.js) | `POST /criancas/:id/necessidades` |
| UC-07 Ver Perfil da Criança | RF06, RNF01 | [`src/domain/Crianca.js`](../../src/domain/Crianca.js) (`perfilPublico`) | [`tests/Crianca.test.js`](../../tests/Crianca.test.js), [`tests/api.test.js`](../../tests/api.test.js) | `GET /criancas/:id` |
| UC-09 Emitir Comprovante | RF09 | [`src/domain/Doacao.js`](../../src/domain/Doacao.js) (`gerarComprovante`) | [`tests/Doacao.test.js`](../../tests/Doacao.test.js), [`tests/DoacaoService.test.js`](../../tests/DoacaoService.test.js) | resposta do `POST /necessidades/:id/doacoes` |
| UC-11 Aprovar Escolinha | RF02 | [`src/domain/Escolinha.js`](../../src/domain/Escolinha.js) (`aprovar`, `rejeitar`) | [`tests/Escolinha.test.js`](../../tests/Escolinha.test.js), [`tests/api.test.js`](../../tests/api.test.js) | `POST /escolinhas/:id/aprovar` |

A separação em camadas (RNF06) está em [`src/api/app.js`](../../src/api/app.js), que só traduz HTTP
para chamadas aos serviços e ao domínio e converte erros em códigos de status.

## Passos e fluxos alternativos no código

### UC-03 Cadastrar Criança

| Passo da especificação | Onde está no código |
|---|---|
| A escolinha, com cadastro aprovado, informa os dados da criança | `Escolinha.cadastrarCrianca()` recusa escolinhas que não estão `APROVADA` e vincula a criança ao `id` da escolinha |
| O sistema valida os dados | construtor de `Crianca`: nome civil e apelido obrigatórios; data `AAAA-MM-DD` existente, não futura e de menor de 18 anos; endereço com logradouro, cidade e UF válida |
| O sistema guarda os dados sensíveis com acesso restrito (RNF01) | propriedades `_nomeCivil`, `_dataNascimento`, `_endereco`; só `dadosRestritos()` as devolve |
| O perfil fica visível aos doadores só com dados públicos (RF06) | `perfilPublico()` e `toJSON()`: apelido, idade, cidade, UF e necessidades ativas |
| **A1. Dados inválidos:** o sistema informa o erro e não cadastra | o construtor lança `Error` com a mensagem; a API responde **400** `{ erro }` e nada é salvo |

### UC-06 Buscar Crianças/Necessidades

| Passo da especificação | Onde está no código |
|---|---|
| O doador informa filtros de cidade, UF e tipo de necessidade | `GET /criancas?cidade=&uf=&tipo=`; filtros vazios são ignorados |
| O sistema busca crianças com necessidades abertas | `BuscaService.buscar()`: cidade sem acento e sem caixa, UF em maiúsculas, só necessidades `ABERTA` (do tipo pedido, se houver) |
| O sistema exibe os resultados sem dados sensíveis | cada resultado é `perfilPublico()`; a resposta traz `{ total, resultados }` |
| **A1. Nenhum resultado:** o sistema sugere ampliar a busca | `total: 0` e `mensagem: 'Nenhuma criança encontrada. Tente remover algum filtro.'` |
| Tipo de necessidade inexistente | `Error` "Tipo de necessidade inválido" → **400** |

### UC-08 Realizar Doação (inclui UC-09)

| Passo da especificação | Onde está no código |
|---|---|
| O doador escolhe a necessidade, o valor, a forma de pagamento e se quer ser anônimo | `POST /necessidades/:id/doacoes` com `doadorId`, `valor`, `formaPagamento` (`PIX`, `CARTAO_CREDITO`, `BOLETO`) e `anonima` |
| O sistema valida a doação antes de cobrar | `DoacaoService.realizar()`, passo 1: monta uma `Doacao` só para validar, exige necessidade `ABERTA` e valor até o restante da meta (comparado em centavos). Nenhum dado inválido chega ao gateway |
| O sistema envia a cobrança ao gateway de pagamento (RF07) | passo 2: `gateway.processar({ valor, formaPagamento })` |
| O pagamento é confirmado; o sistema registra a doação e atualiza o valor arrecadado (RF08) | passo 3: `Doacao` imutável com `transacaoId` (RNF05), `necessidade.registrarDoacao()` e `doacoes.salvar()` |
| O sistema notifica a escolinha (RF09) | passo 4: `notificador.notificarDoacaoRecebida()`; uma falha na notificação é registrada no log e não desfaz a doação já cobrada |
| O sistema emite o comprovante (UC-09) | passo 5: `doacao.gerarComprovante()`, com código `DOA-XXXXXXXX`; a API responde **201** |
| **A1. Pagamento recusado:** o sistema informa e nada é registrado | `PagamentoRecusadoError` → **402**; nada é gravado, notificado nem somado à necessidade |
| **A2. Doação anônima:** a escolinha não vê quem doou | `identificacaoParaEscolinha()` devolve `'Doador anônimo'` na notificação |

Doações simultâneas para a mesma necessidade são processadas uma de cada vez, para que nenhuma seja
cobrada e depois rejeitada por exceder a meta.

### Códigos de status da API

| Situação | Status |
|---|---|
| Consulta ou aprovação bem-sucedida | 200 |
| Recurso criado (escolinha, criança, necessidade, doação) | 201 |
| Regra de negócio violada ou JSON malformado | 400 |
| Pagamento recusado | 402 |
| Escolinha, criança ou necessidade inexistente | 404 |
| Falha inesperada (registrada no log, sem expor detalhes) | 500 |

## O que ainda não está implementado

- **Autenticação e papéis (UC-01):** o `doadorId` vem no corpo da requisição e a rota de aprovação de escolinha está aberta.
- **Gateway de pagamento e e-mail reais:** usamos `GatewayPagamentoSimulado` e `NotificadorEmMemoria`.
- **PostgreSQL:** os dados ficam em `RepositorioEmMemoria` e se perdem ao reiniciar o servidor.
- **Front-end React:** a API pode ser exercitada com `curl` ou pelos testes.
- **UC-10** (painel da escolinha), **UC-12** e **UC-13** (gestão de usuários e moderação).
