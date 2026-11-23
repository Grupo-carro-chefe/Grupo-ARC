# Plano e casos de teste do DoaGol

Documento da parte 4 do projeto (Testes). Reúne a estratégia de testes, o ambiente, os casos de teste formais e a lista completa dos testes automatizados, com o resultado da execução de 23/11/2026.

## 1. Estratégia

| Nível | O que cobre | Ferramenta | Arquivos |
|---|---|---|---|
| Unidade (domínio) | Regras de negócio das classes `Necessidade`, `Escolinha`, `Crianca` e `Doacao` | Jest | `Necessidade`, `Escolinha`, `Crianca`, `Doacao`, `erros`, `reconstituir` |
| Unidade (serviço) | Orquestração da busca e da doação, com gateway, notificador e repositórios simulados | Jest | `BuscaService`, `DoacaoService` |
| Unidade (infra) | Conexão, transação, repetição com espera e dados de exemplo | Jest | `conexao`, `liberacaoCliente`, `tentarComEspera`, `dadosExemplo` |
| Integração (API) | Rotas REST de ponta a ponta, códigos HTTP e privacidade das respostas | Jest + supertest | `api` |
| Integração (banco) | Migrations, repositórios, transação e concorrência num PostgreSQL de verdade | Jest + PostgreSQL 17 | `postgres`, `postgresDoacao` |

Critérios de aceitação da esteira: todos os testes passam e a cobertura fica acima dos limites do [`jest.config.js`](../../jest.config.js): 95% de linhas e instruções, 100% de funções e 85% de ramos. Se um teste falhar ou a cobertura cair, o job fica vermelho e a entrega (Release) e a implantação (GitHub Pages) não rodam.

## 2. Ambiente e execução

| Onde | Como roda | Banco |
|---|---|---|
| Máquina local | `npm test` ou `npm run test:coverage` | Sem `DATABASE_URL_TESTE`, os testes de PostgreSQL são ignorados; com ela, rodam contra o banco indicado |
| GitHub Actions ([`ci.yml`](../../.github/workflows/ci.yml)) | A cada push ou pull request na `main` e na `dev`, em Node 20 e 22 | Contêiner `postgres:17` como serviço do job |
| Jenkins na AWS EC2 ([`infra/jenkins`](../../infra/jenkins)) | A cada push na `main`, via webhook | Sem banco (testes de PostgreSQL ignorados) |

Para rodar localmente com o banco:

```bash
# PostgreSQL local com usuário doagol, senha doagol_teste e banco doagol_teste
export DATABASE_URL_TESTE=postgresql://doagol:doagol_teste@localhost:5432/doagol_teste
npm ci
npm run test:coverage
```

## 3. Resultado da execução (23/11/2026)

`npm run test:coverage` com PostgreSQL: 15 suítes, 315 casos, 315 passaram, 0 falharam, 0 ignorados. Cobertura: 100% de instruções, 96,29% de ramos, 100% de funções e 100% de linhas.

| Arquivo | Nível | Assunto | Casos | Passaram |
|---|---|---|---|---|
| [`Necessidade.test.js`](../../tests/Necessidade.test.js) | Unidade (domínio) | Necessidade: criação, doações, percentual, edição e encerramento (UC-04, RF08) | 34 | 34 |
| [`Escolinha.test.js`](../../tests/Escolinha.test.js) | Unidade (domínio) | Escolinha: cadastro, aprovação, rejeição e cadastro de criança (UC-02, UC-11, UC-03) | 18 | 18 |
| [`Crianca.test.js`](../../tests/Crianca.test.js) | Unidade (domínio) | Criança: validação, CEP, idade, necessidades e privacidade (UC-03, UC-07, RNF01) | 64 | 64 |
| [`Doacao.test.js`](../../tests/Doacao.test.js) | Unidade (domínio) | Doação: validação, imutabilidade, anonimato e comprovante (UC-08, UC-09, RNF05) | 30 | 30 |
| [`erros.test.js`](../../tests/erros.test.js) | Unidade (domínio e API) | Erros de regra de negócio e erros de infraestrutura que não vazam | 9 | 9 |
| [`reconstituir.test.js`](../../tests/reconstituir.test.js) | Unidade (domínio) | Reconstrução dos objetos do domínio a partir do banco | 5 | 5 |
| [`BuscaService.test.js`](../../tests/BuscaService.test.js) | Unidade (serviço) | Busca por cidade, UF e tipo (UC-06) | 17 | 17 |
| [`DoacaoService.test.js`](../../tests/DoacaoService.test.js) | Unidade (serviço) | Fluxo da doação: cobrança, registro, estorno e notificação (UC-08) | 25 | 25 |
| [`tentarComEspera.test.js`](../../tests/tentarComEspera.test.js) | Unidade (infra) | Repetição com espera ao conectar no banco | 4 | 4 |
| [`dadosExemplo.test.js`](../../tests/dadosExemplo.test.js) | Unidade (infra) | Dados de exemplo da demonstração | 10 | 10 |
| [`conexao.test.js`](../../tests/conexao.test.js) | Unidade (infra) | Configuração da conexão e das transações | 8 | 8 |
| [`liberacaoCliente.test.js`](../../tests/liberacaoCliente.test.js) | Unidade (infra) | Devolução das conexões do pool em caso de erro | 4 | 4 |
| [`api.test.js`](../../tests/api.test.js) | Integração (API REST, supertest) | Rotas da API, códigos HTTP e integração com o front-end | 46 | 46 |
| [`postgres.test.js`](../../tests/postgres.test.js) | Integração (PostgreSQL real) | Migrations, repositórios e carga de dados no PostgreSQL | 30 | 30 |
| [`postgresDoacao.test.js`](../../tests/postgresDoacao.test.js) | Integração (API + PostgreSQL real) | Doação transacional e concorrência (SELECT ... FOR UPDATE) | 11 | 11 |
| **Total** | | | **315** | **315** |

## 4. Casos de teste formais

Cada caso aponta para o teste automatizado que o executa. "Obtido" é o resultado da execução de 23/11/2026.

| ID | UC / requisito | Nível | Cenário | Entrada | Resultado esperado | Teste automatizado | Obtido |
|---|---|---|---|---|---|---|---|
| CT-01 | UC-02 / RF02 | Unidade | Cadastrar escolinha com dados válidos | Nome, cidade e UF válidos | Escolinha criada com status PENDENTE e sem motivo de rejeição | `Escolinha.test.js`: "caso 1: nasce PENDENTE, sem motivo de rejeição" | Passou |
| CT-02 | UC-02 / RF02 | Integração (API) | Cadastrar escolinha com dados inválidos | POST /escolinhas com UF "ZZ" | HTTP 400 com {erro: "UF inválida: ZZ."}; nada é salvo | `api.test.js`: "POST /escolinhas com dados inválidos responde 400" | Passou |
| CT-03 | UC-11 / RF02 | Unidade | Aprovar uma escolinha já aprovada | aprovar() chamado duas vezes | Erro de regra de negócio; status continua APROVADA | `Escolinha.test.js`: "caso 4: não aprova duas vezes" | Passou |
| CT-04 | UC-11 / RF02 | Unidade | Rejeitar escolinha sem informar motivo | rejeitar() sem motivo ou com motivo vazio | Erro; escolinha continua PENDENTE | `Escolinha.test.js`: "caso 3: rejeitar() exige motivo (ausente) e mantém PENDENTE" | Passou |
| CT-05 | UC-03 / RF03 | Integração (API) | Escolinha pendente tenta cadastrar criança | POST /escolinhas/:id/criancas para escolinha PENDENTE | HTTP 400; criança não é cadastrada | `api.test.js`: "escolinha pendente não cadastra criança (400)" | Passou |
| CT-06 | UC-03 / RF03, RF06 | Integração (API) | Escolinha aprovada cadastra criança | Nome civil, apelido, nascimento e endereço válidos | HTTP 201; resposta traz só o perfil público, sem nome civil, nascimento ou endereço | `api.test.js`: "escolinha aprovada cadastra (201) e a resposta é o perfil público, sem dados sensíveis" | Passou |
| CT-07 | UC-03 (A1) | Unidade | Data de nascimento inexistente | dataNascimento = 31 de fevereiro | Erro de validação; criança não é criada | `Crianca.test.js`: "caso inválido (A1): rejeita 31 de fevereiro" | Passou |
| CT-08 | UC-03 (A1) | Unidade | Criança que completa 18 anos hoje | Nascimento há exatamente 18 anos | Erro de validação (a criança precisa ter menos de 18 anos); não é criada | `Crianca.test.js`: "caso inválido (A1): rejeita 18 anos completos hoje" | Passou |
| CT-09 | UC-03 / RF03 | Unidade | CEP com hífen e CEP com 7 dígitos | cep = "01310-100" e cep = "0131010" | "01310-100" é gravado como 01310100; o de 7 dígitos é recusado | `Crianca.test.js`: "aceita CEP com hífen e grava 01310100 / recusa CEP inválido (7 dígitos)" | Passou |
| CT-10 | RNF01 / RF06 | Unidade | Serializar a criança em JSON | JSON.stringify(crianca) | Saída sem nome civil, data de nascimento ou endereço | `Crianca.test.js`: "caso 2: JSON.stringify não vaza nome civil, nascimento nem endereço" | Passou |
| CT-11 | UC-04 / RF04 | Unidade | Cadastrar necessidade com meta inválida | valorEstimado = 0, negativo ou com 3 casas decimais | Erro de validação; necessidade não é criada | `Necessidade.test.js`: "caso inválido: rejeita valor zero / rejeita mais de 2 casas decimais" | Passou |
| CT-12 | RF08 | Unidade | Atingir a meta exatamente | Meta R$ 150,00; doações que somam R$ 150,00 | Status muda de ABERTA para ATENDIDA | `Necessidade.test.js`: "caso 2: muda para ATENDIDA quando a meta é atingida exatamente" | Passou |
| CT-13 | RF08 | Unidade | Somar centavos sem erro de ponto flutuante | Doações de R$ 0,10 e R$ 0,20 | Arrecadado = R$ 0,30 exatos (valores guardados em centavos) | `Necessidade.test.js`: "caso 3: soma centavos sem erro de ponto flutuante" | Passou |
| CT-14 | UC-04 / RF04 | Unidade | Reduzir a meta abaixo do já arrecadado | editar() com meta menor que o arrecadado | Erro; descrição e meta continuam as anteriores | `Necessidade.test.js`: "caso 3: rejeita meta menor que o valor já arrecadado sem alterar nada" | Passou |
| CT-15 | RF08 | Unidade | Percentual arrecadado arredonda para baixo | Meta R$ 90,00 e R$ 30,00 arrecadados | percentualArrecadado() = 33 | `Necessidade.test.js`: "meta R$ 90 com R$ 30 arrecadados => 33%" | Passou |
| CT-16 | UC-06 / RF05 | Unidade | Buscar cidade sem acento e em caixa diferente | cidade = "sao paulo", "SAO PAULO", "  são paulo  " | Encontra as crianças de "São Paulo" | `BuscaService.test.js`: "caso 3: filtra por cidade sem diferenciar acento nem caixa" | Passou |
| CT-17 | UC-06 / RF05 | Unidade | Combinar filtros de cidade, UF e tipo | cidade, uf e tipo preenchidos | Só crianças com necessidade ABERTA daquele tipo naquela cidade e UF | `BuscaService.test.js`: "caso 5: combina cidade, UF e tipo" | Passou |
| CT-18 | UC-06 (A1) | Integração (API) | Busca sem resultados | GET /criancas?uf=AM (sem crianças no AM) | HTTP 200 com total 0 e mensagem sugerindo remover filtros | `api.test.js`: "nenhum resultado (A1) traz total 0 e mensagem de orientação" | Passou |
| CT-19 | UC-06 | Integração (API) | Tipo de necessidade inválido | GET /criancas?tipo=COMIDA | HTTP 400 com "Tipo de necessidade inválido: COMIDA." | `api.test.js`: "tipo inválido responde 400" | Passou |
| CT-20 | UC-07 / RF06 | Integração (API) | Ver o perfil da criança | GET /criancas/:id (existente e inexistente) | 200 com perfil público; 404 para id inexistente | `api.test.js`: "GET /criancas/:id devolve o perfil público (200) sem dados sensíveis" | Passou |
| CT-21 | UC-08, UC-09 / RF07-RF09 | Integração (API) | Realizar doação válida | POST /necessidades/:id/doacoes com valor, PIX e doadorId | HTTP 201; comprovante com código DOA-XXXXXXXX; progresso atualizado | `api.test.js`: "POST /necessidades/:id/doacoes devolve o comprovante (201) e atualiza o progresso" | Passou |
| CT-22 | UC-08 (A2) | Unidade (serviço) | Doação anônima | anonima = true | A notificação à escolinha não identifica o doador | `DoacaoService.test.js`: "caso 3 (A2): doação anônima não revela o doador à escolinha" | Passou |
| CT-23 | UC-08 (A1) | Integração (API) | Pagamento recusado pelo gateway | Gateway simulado configurado para recusar | HTTP 402; nada é gravado, notificado nem somado | `api.test.js`: "pagamento recusado (A1) responde 402 e nada é registrado" | Passou |
| CT-24 | UC-08 / RF08 | Unidade (serviço) | Doação acima do valor restante | Valor maior que meta menos arrecadado | Erro antes da cobrança; o gateway não é chamado | `DoacaoService.test.js`: "caso inválido: valor acima do restante não chega ao gateway" | Passou |
| CT-25 | UC-08 / RF07 | Unidade (serviço) | Falha ao registrar depois da cobrança | Repositório lança erro após o pagamento | A cobrança é estornada no gateway e o erro é devolvido | `DoacaoService.test.js`: "caso 8: se o registro falhar depois da cobrança, o pagamento é estornado" | Passou |
| CT-26 | UC-08 / RF09 | Unidade (serviço) | Falha ao notificar a escolinha | Notificador lança erro | A doação já cobrada continua registrada; a falha vai para o log | `DoacaoService.test.js`: "caso 5: falha na notificação não desfaz a doação já cobrada" | Passou |
| CT-27 | RNF05 | Unidade | Tentar alterar uma doação registrada | Atribuir novo valor a doacao.valor | Objeto congelado: o valor não muda | `Doacao.test.js`: "caso 2: não permite alterar valor" | Passou |
| CT-28 | RF08 / RNF05 | Integração (PostgreSQL) | Doações simultâneas na mesma necessidade | 20 doações de R$ 10,00 ao mesmo tempo, meta R$ 100,00 | Exatamente 10 passam; arrecadado = R$ 100,00; só as aceitas são cobradas | `postgresDoacao.test.js`: "20 doações de R$ 10 numa meta de R$ 100: exatamente 10 passam" | Passou |
| CT-29 | RF08 | Integração (PostgreSQL) | Falha no meio da transação da doação | Erro depois do registro da doação | ROLLBACK: nada fica gravado e a cobrança é estornada | `postgresDoacao.test.js`: "se falhar depois do registro, nada é gravado (rollback) e a cobrança é estornada" | Passou |
| CT-30 | RNF06 | Integração (PostgreSQL) | Aplicar as migrations | Subir o banco duas vezes; uma migration com erro | Esquema aplicado uma vez só; a migration com erro é desfeita e não fica registrada | `postgres.test.js`: "aplicam o esquema, registram o nome e não repetem na segunda execução" | Passou |
| CT-31 | RF08 | Integração (PostgreSQL) | Banco protege a regra da meta | UPDATE direto com arrecadado acima da meta | O PostgreSQL recusa (restrição CHECK) | `postgres.test.js`: "o banco rejeita arrecadado acima da meta, mesmo que a aplicação erre" | Passou |
| CT-32 | RNF01 | Unidade (API) | Erro de infraestrutura com dado secreto | Erro "password authentication failed for user ..." | HTTP 500 com mensagem genérica, sem repetir o texto do erro | `erros.test.js`: "password authentication failed for user "dono" vira 500 genérico" | Passou |
| CT-33 | RNF06 | Integração (API) | Requisições malformadas | JSON malformado; corpo acima do limite | HTTP 400 e HTTP 413, nunca 500 | `api.test.js`: "POST /escolinhas com JSON malformado responde 400" | Passou |
| CT-34 | RNF06 | Integração (PostgreSQL) | Persistência após reinício | Cadastro, busca e doação; depois nova instância da API | Os dados continuam disponíveis na nova instância | `postgresDoacao.test.js`: "cadastro, busca, doação e comprovante; tudo continua lá numa nova instância (reinício)" | Passou |

## 5. Lista completa dos testes automatizados

Gerada a partir da saída do Jest (`npx jest --json`).

### Necessidade.test.js (34 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | Necessidade > criação | caso 1: cria necessidade válida com status ABERTA e nada arrecadado | Passou |
| 2 | Necessidade > criação | caso 2: remove espaços extras da descrição | Passou |
| 3 | Necessidade > criação | caso inválido: rejeita tipo inexistente | Passou |
| 4 | Necessidade > criação | caso inválido: rejeita descrição vazia | Passou |
| 5 | Necessidade > criação | caso inválido: rejeita valor zero | Passou |
| 6 | Necessidade > criação | caso inválido: rejeita valor negativo | Passou |
| 7 | Necessidade > criação | caso inválido: rejeita valor não numérico | Passou |
| 8 | Necessidade > criação | caso inválido: rejeita mais de 2 casas decimais | Passou |
| 9 | Necessidade > registrarDoacao() | caso 1: soma doações parciais e mantém a necessidade ABERTA | Passou |
| 10 | Necessidade > registrarDoacao() | caso 2: muda para ATENDIDA quando a meta é atingida exatamente | Passou |
| 11 | Necessidade > registrarDoacao() | caso 3: soma centavos sem erro de ponto flutuante | Passou |
| 12 | Necessidade > registrarDoacao() | caso 4: rejeita doação maior que o restante da meta | Passou |
| 13 | Necessidade > registrarDoacao() | caso inválido: rejeita valor 0 | Passou |
| 14 | Necessidade > registrarDoacao() | caso inválido: rejeita valor -20 | Passou |
| 15 | Necessidade > registrarDoacao() | caso inválido: rejeita valor NaN | Passou |
| 16 | Necessidade > registrarDoacao() | caso inválido: rejeita valor Infinity | Passou |
| 17 | Necessidade > registrarDoacao() | caso inválido: rejeita doação para necessidade ATENDIDA | Passou |
| 18 | Necessidade > registrarDoacao() | caso inválido: rejeita doação para necessidade ENCERRADA | Passou |
| 19 | Necessidade > percentualArrecadado() | meta R$ 150 com R$ 0 arrecadados => 0% | Passou |
| 20 | Necessidade > percentualArrecadado() | meta R$ 150 com R$ 120 arrecadados => 80% | Passou |
| 21 | Necessidade > percentualArrecadado() | meta R$ 80 com R$ 60 arrecadados => 75% | Passou |
| 22 | Necessidade > percentualArrecadado() | meta R$ 90 com R$ 30 arrecadados => 33% | Passou |
| 23 | Necessidade > percentualArrecadado() | meta R$ 80 com R$ 80 arrecadados => 100% | Passou |
| 24 | Necessidade > valorRestante() | caso 1: sem doações, o restante é a própria meta | Passou |
| 25 | Necessidade > valorRestante() | caso 2: desconta o que já foi arrecadado | Passou |
| 26 | Necessidade > valorRestante() | caso 3: é zero quando a necessidade foi atendida | Passou |
| 27 | Necessidade > editar() | caso 1: altera descrição e valor estimado de uma necessidade aberta | Passou |
| 28 | Necessidade > editar() | caso 2: reduzir a meta até o valor arrecadado marca como ATENDIDA | Passou |
| 29 | Necessidade > editar() | caso 3: rejeita meta menor que o valor já arrecadado sem alterar nada | Passou |
| 30 | Necessidade > editar() | caso 4: rejeita descrição vazia | Passou |
| 31 | Necessidade > editar() | caso 5: não permite editar necessidade encerrada | Passou |
| 32 | Necessidade > encerrar() | caso 1: encerra uma necessidade aberta | Passou |
| 33 | Necessidade > encerrar() | caso 2: não encerra uma necessidade já encerrada | Passou |
| 34 | Necessidade > encerrar() | caso 3: não encerra uma necessidade já atendida | Passou |

### Escolinha.test.js (18 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | Escolinha > criação | caso 1: nasce PENDENTE, sem motivo de rejeição | Passou |
| 2 | Escolinha > criação | caso 2: remove espaços extras e normaliza a UF | Passou |
| 3 | Escolinha > criação | caso inválido: rejeita nome vazio | Passou |
| 4 | Escolinha > criação | caso inválido: rejeita cidade ausente | Passou |
| 5 | Escolinha > criação | caso inválido: rejeita UF inválida | Passou |
| 6 | Escolinha > criação | caso inválido: chamada sem argumentos não quebra com TypeError | Passou |
| 7 | Escolinha > aprovar() e rejeitar() | caso 1: aprovar() muda para APROVADA | Passou |
| 8 | Escolinha > aprovar() e rejeitar() | caso 2: rejeitar() muda para REJEITADA e guarda o motivo | Passou |
| 9 | Escolinha > aprovar() e rejeitar() | caso 3: rejeitar() exige motivo (ausente) e mantém PENDENTE | Passou |
| 10 | Escolinha > aprovar() e rejeitar() | caso 3: rejeitar() exige motivo (vazio) e mantém PENDENTE | Passou |
| 11 | Escolinha > aprovar() e rejeitar() | caso 4: não aprova duas vezes | Passou |
| 12 | Escolinha > aprovar() e rejeitar() | caso 5: não aprova escolinha rejeitada | Passou |
| 13 | Escolinha > aprovar() e rejeitar() | caso 6: não rejeita escolinha aprovada | Passou |
| 14 | Escolinha > cadastrarCrianca() | caso 1: escolinha aprovada cadastra criança vinculada a ela | Passou |
| 15 | Escolinha > cadastrarCrianca() | caso 2: ignora escolinhaId vindo nos dados | Passou |
| 16 | Escolinha > cadastrarCrianca() | caso 3: escolinha pendente não cadastra crianças | Passou |
| 17 | Escolinha > cadastrarCrianca() | caso 3: escolinha rejeitada não cadastra crianças | Passou |
| 18 | Escolinha > cadastrarCrianca() | caso 4: repassa os erros de validação da criança (A1) | Passou |

### Crianca.test.js (64 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | Crianca > criação | caso 1: cria criança válida com perfil público e dados restritos separados | Passou |
| 2 | Crianca > criação | caso 2: guarda os dados sensíveis em propriedades com prefixo _ | Passou |
| 3 | Crianca > criação | caso 3: remove espaços extras e normaliza a UF para maiúsculas | Passou |
| 4 | Crianca > criação | caso 4: aceita data de nascimento como Date, usando o dia em UTC | Passou |
| 5 | Crianca > criação | caso 5: aceita 29 de fevereiro em ano bissexto | Passou |
| 6 | Crianca > criação | caso 6: aceita criança nascida hoje (idade 0) | Passou |
| 7 | Crianca > criação | caso 7: aceita quem faz 18 anos amanhã (ainda tem 17) | Passou |
| 8 | Crianca > criação | caso 8: guarda número, bairro e CEP opcionais e ignora os ausentes | Passou |
| 9 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | aceita CEP com hífen e grava 01310100 | Passou |
| 10 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | aceita CEP só dígitos e grava 01310100 | Passou |
| 11 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | aceita CEP com espaços nas pontas e grava 01310100 | Passou |
| 12 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | aceita CEP com ponto e grava 01310100 | Passou |
| 13 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | aceita CEP com espaço no meio e grava 01310100 | Passou |
| 14 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | CEP undefined significa sem CEP e não grava o campo | Passou |
| 15 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | CEP null significa sem CEP e não grava o campo | Passou |
| 16 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | CEP "" significa sem CEP e não grava o campo | Passou |
| 17 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | CEP "   " significa sem CEP e não grava o campo | Passou |
| 18 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (letras) | Passou |
| 19 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (letra no fim) | Passou |
| 20 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (7 dígitos) | Passou |
| 21 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (9 dígitos) | Passou |
| 22 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (dois separadores) | Passou |
| 23 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (número JSON) | Passou |
| 24 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (objeto) | Passou |
| 25 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (lista) | Passou |
| 26 | Crianca > criação > CEP (opcional, validado no servidor, gravado só com os 8 dígitos) | recusa CEP inválido (booleano) | Passou |
| 27 | Crianca > criação | caso 9: guarda o endereço congelado, sem referência ao objeto recebido | Passou |
| 28 | Crianca > criação | caso inválido (A1): rejeita nome civil vazio | Passou |
| 29 | Crianca > criação | caso inválido (A1): rejeita nome civil ausente | Passou |
| 30 | Crianca > criação | caso inválido (A1): rejeita apelido vazio | Passou |
| 31 | Crianca > criação | caso inválido (A1): rejeita escolinha ausente | Passou |
| 32 | Crianca > criação | caso inválido (A1): rejeita data no formato brasileiro | Passou |
| 33 | Crianca > criação | caso inválido (A1): rejeita data sem zeros à esquerda | Passou |
| 34 | Crianca > criação | caso inválido (A1): rejeita data numérica | Passou |
| 35 | Crianca > criação | caso inválido (A1): rejeita data ausente | Passou |
| 36 | Crianca > criação | caso inválido (A1): rejeita 31 de fevereiro | Passou |
| 37 | Crianca > criação | caso inválido (A1): rejeita 29 de fevereiro em ano comum | Passou |
| 38 | Crianca > criação | caso inválido (A1): rejeita mês 13 | Passou |
| 39 | Crianca > criação | caso inválido (A1): rejeita Date inválido | Passou |
| 40 | Crianca > criação | caso inválido (A1): rejeita data de amanhã | Passou |
| 41 | Crianca > criação | caso inválido (A1): rejeita data no ano que vem | Passou |
| 42 | Crianca > criação | caso inválido (A1): rejeita 18 anos completos hoje | Passou |
| 43 | Crianca > criação | caso inválido (A1): rejeita adulto de 30 anos | Passou |
| 44 | Crianca > criação | caso inválido (A1): rejeita endereço ausente | Passou |
| 45 | Crianca > criação | caso inválido (A1): rejeita endereço nulo | Passou |
| 46 | Crianca > criação | caso inválido (A1): rejeita logradouro vazio | Passou |
| 47 | Crianca > criação | caso inválido (A1): rejeita cidade ausente | Passou |
| 48 | Crianca > criação | caso inválido (A1): rejeita UF inexistente | Passou |
| 49 | Crianca > criação | caso inválido (A1): rejeita UF não textual | Passou |
| 50 | Crianca > criação | caso inválido (A1): chamada sem argumentos não quebra com TypeError | Passou |
| 51 | Crianca > idade() | caso 1: ainda não fez aniversário no ano | Passou |
| 52 | Crianca > idade() | caso 2: faz aniversário hoje | Passou |
| 53 | Crianca > idade() | caso 3: já fez aniversário no ano | Passou |
| 54 | Crianca > idade() | caso 4: aceita uma data de referência | Passou |
| 55 | Crianca > necessidades | caso 1: adicionarNecessidade() vincula uma Necessidade | Passou |
| 56 | Crianca > necessidades | caso 2: adicionarNecessidade() rejeita objeto comum | Passou |
| 57 | Crianca > necessidades | caso 2: adicionarNecessidade() rejeita undefined | Passou |
| 58 | Crianca > necessidades | caso 3: a lista devolvida é uma cópia | Passou |
| 59 | Crianca > necessidades | caso 4: necessidadesAtivas() traz só as ABERTAS | Passou |
| 60 | Crianca > privacidade | caso 1: perfilPublico() traz apelido, idade, cidade, UF e as necessidades ativas | Passou |
| 61 | Crianca > privacidade | caso 2: JSON.stringify não vaza nome civil, nascimento nem endereço | Passou |
| 62 | Crianca > privacidade | caso 3: toJSON() devolve exatamente o perfil público | Passou |
| 63 | Crianca > privacidade | caso 4: dadosRestritos() traz nome civil, nascimento AAAA-MM-DD e endereço | Passou |
| 64 | Crianca > privacidade | caso 5: alterar a cópia de dadosRestritos() não altera a criança | Passou |

### Doacao.test.js (30 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | Doacao > criação | caso 1: cria doação válida com valores padrão | Passou |
| 2 | Doacao > criação | caso 2: aceita id, data, transação e anonimato informados | Passou |
| 3 | Doacao > criação | caso 3: aceita a forma de pagamento PIX | Passou |
| 4 | Doacao > criação | caso 3: aceita a forma de pagamento CARTAO_CREDITO | Passou |
| 5 | Doacao > criação | caso 3: aceita a forma de pagamento BOLETO | Passou |
| 6 | Doacao > criação | caso 4: normaliza o valor em centavos (0.1 + 0.2 vira 0.3) | Passou |
| 7 | Doacao > criação | caso inválido: rejeita valor zero | Passou |
| 8 | Doacao > criação | caso inválido: rejeita valor negativo | Passou |
| 9 | Doacao > criação | caso inválido: rejeita valor em texto | Passou |
| 10 | Doacao > criação | caso inválido: rejeita valor NaN | Passou |
| 11 | Doacao > criação | caso inválido: rejeita valor infinito | Passou |
| 12 | Doacao > criação | caso inválido: rejeita mais de 2 casas decimais | Passou |
| 13 | Doacao > criação | caso inválido: rejeita valor abaixo de 1 centavo | Passou |
| 14 | Doacao > criação | caso inválido: rejeita forma de pagamento inexistente | Passou |
| 15 | Doacao > criação | caso inválido: rejeita forma de pagamento ausente | Passou |
| 16 | Doacao > criação | caso inválido: rejeita anônima em texto | Passou |
| 17 | Doacao > criação | caso inválido: rejeita necessidade vazia | Passou |
| 18 | Doacao > criação | caso inválido: rejeita doador ausente | Passou |
| 19 | Doacao > criação | caso inválido: chamada sem argumentos não quebra com TypeError | Passou |
| 20 | Doacao > imutabilidade | caso 1: o objeto é congelado | Passou |
| 21 | Doacao > imutabilidade | caso 2: não permite alterar valor | Passou |
| 22 | Doacao > imutabilidade | caso 2: não permite alterar doadorId | Passou |
| 23 | Doacao > imutabilidade | caso 2: não permite alterar anonima | Passou |
| 24 | Doacao > imutabilidade | caso 2: não permite alterar data | Passou |
| 25 | Doacao > imutabilidade | caso 3: não permite adicionar nem remover campos | Passou |
| 26 | Doacao > imutabilidade | caso 4: alterar o Date original não altera a doação | Passou |
| 27 | Doacao > identificação e comprovante | caso 1: doação identificada mostra o doador para a escolinha | Passou |
| 28 | Doacao > identificação e comprovante | caso 2: doação anônima esconde o doador da escolinha (A2) | Passou |
| 29 | Doacao > identificação e comprovante | caso 3: comprovante traz todos os dados e código DOA- com 8 caracteres do id | Passou |
| 30 | Doacao > identificação e comprovante | caso 4: código do comprovante gerado com id aleatório segue o padrão | Passou |

### erros.test.js (9 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | RegraNegocioError | é um Error com nome próprio e mantém a mensagem | Passou |
| 2 | RegraNegocioError | as regras do domínio lançam RegraNegocioError | Passou |
| 3 | RegraNegocioError | as regras dos serviços lançam RegraNegocioError | Passou |
| 4 | RegraNegocioError | NaoEncontradoError vem do mesmo módulo de erros | Passou |
| 5 | tratador de erros da API: falhas de infraestrutura não vazam | Connection terminated unexpectedly vira 500 genérico | Passou |
| 6 | tratador de erros da API: falhas de infraestrutura não vazam | timeout exceeded when trying to connect vira 500 genérico | Passou |
| 7 | tratador de erros da API: falhas de infraestrutura não vazam | getaddrinfo ENOTFOUND ep-segredo-123.neon.tech vira 500 genérico | Passou |
| 8 | tratador de erros da API: falhas de infraestrutura não vazam | password authentication failed for user "dono" vira 500 genérico | Passou |
| 9 | tratador de erros da API: falhas de infraestrutura não vazam | regra de negócio continua 400 com a mensagem e erro programático (TypeError) vira 500 com o erro no log | Passou |

### reconstituir.test.js (5 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | reconstituir objetos do domínio a partir do que foi salvo | Escolinha volta com o status e o motivo de rejeição salvos | Passou |
| 2 | reconstituir objetos do domínio a partir do que foi salvo | Escolinha sem motivo guarda null | Passou |
| 3 | reconstituir objetos do domínio a partir do que foi salvo | Necessidade volta com meta, arrecadado e status, e segue aceitando doações | Passou |
| 4 | reconstituir objetos do domínio a partir do que foi salvo | Crianca volta mesmo com mais de 17 anos hoje, sem expor dados restritos no JSON | Passou |
| 5 | reconstituir objetos do domínio a partir do que foi salvo | Crianca reconstituída traz as necessidades e as ativas aparecem no perfil | Passou |

### BuscaService.test.js (17 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | BuscaService (UC-06) | caso 1: sem filtros, traz todas as crianças com necessidade aberta | Passou |
| 2 | BuscaService (UC-06) | caso 2: filtra por UF, ignorando caixa e espaços | Passou |
| 3 | BuscaService (UC-06) | caso 3: filtra por cidade sem diferenciar acento nem caixa ("São Paulo") | Passou |
| 4 | BuscaService (UC-06) | caso 3: filtra por cidade sem diferenciar acento nem caixa ("sao paulo") | Passou |
| 5 | BuscaService (UC-06) | caso 3: filtra por cidade sem diferenciar acento nem caixa ("SAO PAULO") | Passou |
| 6 | BuscaService (UC-06) | caso 3: filtra por cidade sem diferenciar acento nem caixa ("  são paulo  ") | Passou |
| 7 | BuscaService (UC-06) | caso 3: filtra por cidade sem diferenciar acento nem caixa ("SÃO PAULO") | Passou |
| 8 | BuscaService (UC-06) | caso 4: filtra por tipo de necessidade | Passou |
| 9 | BuscaService (UC-06) | caso 5: combina cidade, UF e tipo | Passou |
| 10 | BuscaService (UC-06) | caso 6: filtros vazios são ignorados | Passou |
| 11 | BuscaService (UC-06) | caso 7: não traz criança sem necessidades | Passou |
| 12 | BuscaService (UC-06) | caso 8: não traz criança cujas necessidades foram encerradas ou atendidas | Passou |
| 13 | BuscaService (UC-06) | caso 9: com filtro de tipo, exige necessidade aberta daquele tipo | Passou |
| 14 | BuscaService (UC-06) | caso 10 (A1): nenhum resultado devolve lista vazia | Passou |
| 15 | BuscaService (UC-06) | caso 11: tipo inválido lança erro | Passou |
| 16 | BuscaService (UC-06) | caso 12: devolve só o perfil público, sem dados sensíveis (RNF01) | Passou |
| 17 | BuscaService (UC-06) | caso 13: repositório vazio devolve lista vazia | Passou |

### DoacaoService.test.js (25 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | DoacaoService (UC-08) > fluxo principal | caso 1: cobra, registra, atualiza a necessidade e devolve o comprovante (UC-09) | Passou |
| 2 | DoacaoService (UC-08) > fluxo principal | caso 2: notifica a escolinha identificando o doador | Passou |
| 3 | DoacaoService (UC-08) > fluxo principal | caso 3 (A2): doação anônima não revela o doador à escolinha | Passou |
| 4 | DoacaoService (UC-08) > fluxo principal | caso 4: doar exatamente o restante deixa a necessidade ATENDIDA | Passou |
| 5 | DoacaoService (UC-08) > fluxo principal | caso 5: falha na notificação não desfaz a doação já cobrada | Passou |
| 6 | DoacaoService (UC-08) > fluxo principal | caso 6: doações simultâneas para a mesma necessidade não cobram além da meta | Passou |
| 7 | DoacaoService (UC-08) > fluxo principal | caso 7: uma doação que falha não trava as próximas da mesma necessidade | Passou |
| 8 | DoacaoService (UC-08) > fluxo principal | caso 8: se o registro falhar depois da cobrança, o pagamento é estornado | Passou |
| 9 | DoacaoService (UC-08) > fluxo principal | caso 9: falha no estorno vai para o log e o erro original é devolvido | Passou |
| 10 | DoacaoService (UC-08) > fluxo principal | caso 10: cobra o mesmo valor arredondado que registra (0.1 + 0.2 vira 0.3) | Passou |
| 11 | DoacaoService (UC-08) > pagamento recusado (A1) | caso 1: lança PagamentoRecusadoError | Passou |
| 12 | DoacaoService (UC-08) > pagamento recusado (A1) | caso 2: nada é gravado, notificado nem somado à necessidade | Passou |
| 13 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: valor zero não chega ao gateway | Passou |
| 14 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: valor em texto não chega ao gateway | Passou |
| 15 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: valor com 3 casas não chega ao gateway | Passou |
| 16 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: valor abaixo de 1 centavo não chega ao gateway | Passou |
| 17 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: forma de pagamento inválida não chega ao gateway | Passou |
| 18 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: doador ausente não chega ao gateway | Passou |
| 19 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: anônima em texto não chega ao gateway | Passou |
| 20 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: valor acima do restante não chega ao gateway | Passou |
| 21 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: necessidade encerrada não recebe doação | Passou |
| 22 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: necessidade atendida não recebe doação | Passou |
| 23 | DoacaoService (UC-08) > validação antes de cobrar | caso inválido: excesso calculado em centavos, sem erro de ponto flutuante | Passou |
| 24 | BloqueioEmMemoria: limpeza da fila (L6) | remove a entrada da fila quando a última tarefa da necessidade termina | Passou |
| 25 | BloqueioEmMemoria: limpeza da fila (L6) | não remove a entrada enquanto ainda há tarefa esperando | Passou |

### tentarComEspera.test.js (4 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | tentarComEspera | devolve o resultado na primeira tentativa, sem esperar | Passou |
| 2 | tentarComEspera | repete com backoff de 1 s, 2 s e 4 s e devolve quando uma tentativa funciona | Passou |
| 3 | tentarComEspera | depois de 3 repetições sem sucesso, desiste com o último erro | Passou |
| 4 | tentarComEspera | informa cada falha, só com a classe e o código, e usa o relógio de verdade por padrão | Passou |

### dadosExemplo.test.js (10 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | dados de exemplo | nascimentoComIdade gera uma data com a idade pedida, inclusive sem informar hoje | Passou |
| 2 | dados de exemplo | carrega escolinhas, crianças, necessidades e doações e devolve as quantidades | Passou |
| 3 | dados de exemplo | 12 escolinhas: 10 aprovadas, 1 pendente (UC-11) e 1 rejeitada com motivo, em 9 estados das 5 regiões | Passou |
| 4 | dados de exemplo | todas as crianças são menores de idade (7 a 15 anos) e vinculadas a uma escolinha aprovada | Passou |
| 5 | dados de exemplo | as seis crianças originais continuam e a primeira da busca tem pedidos abertos (tour do front) | Passou |
| 6 | dados de exemplo | necessidades variadas: metas de R$ 30 a R$ 400, 0% a 95%, ao menos 6 "quase lá" e 2 atendidas | Passou |
| 7 | dados de exemplo | a soma das doações de cada necessidade é o arrecadado dela, e nenhuma passa da meta (L8) | Passou |
| 8 | dados de exemplo | as doações são fictícias, variadas e dos últimos 30 dias | Passou |
| 9 | dados de exemplo | é determinística: duas cargas dão os mesmos valores e doações (só os ids mudam) | Passou |
| 10 | dados de exemplo | a saída pública não traz nome civil nem endereço das crianças (RNF01) | Passou |

### conexao.test.js (8 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | conexão com o PostgreSQL (sem banco) | sslmode=require vira SSL com verificação de certificado explícita e sai da URL | Passou |
| 2 | conexão com o PostgreSQL (sem banco) | sem sslmode (Postgres local ou do CI) não usa SSL | Passou |
| 3 | conexão com o PostgreSQL (sem banco) | aceita opções extras e traz timeout de conexão para o Neon acordar | Passou |
| 4 | conexão com o PostgreSQL (sem banco) | URL inválida dá erro sem repetir o texto recebido (pode ter senha) | Passou |
| 5 | conexão com o PostgreSQL (sem banco) | comTransacao com cliente já emprestado reaproveita a transação, sem BEGIN próprio | Passou |
| 6 | conexão com o PostgreSQL (sem banco) | comTransacao com pool faz BEGIN/COMMIT, ou ROLLBACK se falhar, e sempre devolve a conexão | Passou |
| 7 | conexão com o PostgreSQL (sem banco) | um erro no ROLLBACK não esconde o erro original | Passou |
| 8 | repositório de crianças em memória | buscarPorNecessidadeId acha a criança dona da necessidade, ou null | Passou |

### liberacaoCliente.test.js (4 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | conexão do pool em caso de erro (L4) | BloqueioPostgres destrói o cliente (release(erro)) quando o trabalho falha, e devolve normal no sucesso | Passou |
| 2 | conexão do pool em caso de erro (L4) | necessidade inexistente: NaoEncontradoError e cliente destruído | Passou |
| 3 | conexão do pool em caso de erro (L4) | comTransacao destrói o cliente no erro e o devolve normalmente no sucesso | Passou |
| 4 | conexão do pool em caso de erro (L4) | rodarMigrations destrói o cliente quando uma migration falha | Passou |

### api.test.js (46 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | API REST | GET /saude responde 200 | Passou |
| 2 | API REST | criarApp() sem argumentos usa gateway e notificador simulados | Passou |
| 3 | API REST | POST sem corpo no cadastro de criança responde 400, não 500 | Passou |
| 4 | API REST | POST sem corpo no cadastro de necessidade responde 400, não 500 | Passou |
| 5 | API REST | POST sem corpo no doação responde 400, não 500 | Passou |
| 6 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas cria escolinha PENDENTE (201) | Passou |
| 7 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas ignora id e status enviados pelo cliente | Passou |
| 8 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas com dados inválidos responde 400 | Passou |
| 9 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas sem corpo responde 400, não 500 | Passou |
| 10 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas com JSON malformado responde 400 | Passou |
| 11 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas com corpo acima do limite responde 413, não 500 | Passou |
| 12 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas com charset não suportado responde 415, não 500 | Passou |
| 13 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas/:id/aprovar aprova (200) | Passou |
| 14 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas/:id/aprovar duas vezes responde 400 | Passou |
| 15 | API REST > escolinhas (UC-02, UC-11) | POST /escolinhas/:id/aprovar de escolinha inexistente responde 404 | Passou |
| 16 | API REST > cadastrar criança (UC-03) | escolinha pendente não cadastra criança (400) | Passou |
| 17 | API REST > cadastrar criança (UC-03) | CEP inválido no cadastro responde 400 e CEP vazio é aceito (201) | Passou |
| 18 | API REST > cadastrar criança (UC-03) | escolinha aprovada cadastra (201) e a resposta é o perfil público, sem dados sensíveis | Passou |
| 19 | API REST > cadastrar criança (UC-03) | ignora escolinhaId e id enviados no corpo | Passou |
| 20 | API REST > cadastrar criança (UC-03) | dados inválidos (A1): data inexistente responde 400 | Passou |
| 21 | API REST > cadastrar criança (UC-03) | dados inválidos (A1): maior de idade responde 400 | Passou |
| 22 | API REST > cadastrar criança (UC-03) | dados inválidos (A1): sem endereço responde 400 | Passou |
| 23 | API REST > cadastrar criança (UC-03) | escolinha inexistente responde 404 | Passou |
| 24 | API REST > necessidades e perfil (UC-04, UC-07) | POST /criancas/:id/necessidades cadastra (201) e devolve a criança | Passou |
| 25 | API REST > necessidades e perfil (UC-04, UC-07) | necessidade inválida responde 400 | Passou |
| 26 | API REST > necessidades e perfil (UC-04, UC-07) | necessidade para criança inexistente responde 404 | Passou |
| 27 | API REST > necessidades e perfil (UC-04, UC-07) | GET /criancas/:id devolve o perfil público (200) sem dados sensíveis | Passou |
| 28 | API REST > necessidades e perfil (UC-04, UC-07) | GET /criancas/:id inexistente responde 404 | Passou |
| 29 | API REST > busca (UC-06) | GET /criancas filtra por cidade, UF e tipo (200) sem dados sensíveis | Passou |
| 30 | API REST > busca (UC-06) | nenhum resultado (A1) traz total 0 e mensagem de orientação | Passou |
| 31 | API REST > busca (UC-06) | tipo inválido responde 400 | Passou |
| 32 | API REST > doação (UC-08, UC-09) | POST /necessidades/:id/doacoes devolve o comprovante (201) e atualiza o progresso | Passou |
| 33 | API REST > doação (UC-08, UC-09) | doação anônima (A2) não revela o doador à escolinha | Passou |
| 34 | API REST > doação (UC-08, UC-09) | necessidade atendida some da busca | Passou |
| 35 | API REST > doação (UC-08, UC-09) | valor acima do restante responde 400 | Passou |
| 36 | API REST > doação (UC-08, UC-09) | necessidade inexistente responde 404 | Passou |
| 37 | API REST > doação (UC-08, UC-09) | pagamento recusado (A1) responde 402 e nada é registrado | Passou |
| 38 | API REST > doação (UC-08, UC-09) | falha inesperada responde 500 sem expor detalhes | Passou |
| 39 | API REST > integração com o front-end (TG3) | respostas trazem o cabeçalho CORS | Passou |
| 40 | API REST > integração com o front-end (TG3) | pré-requisição OPTIONS responde 204 com os métodos permitidos | Passou |
| 41 | API REST > integração com o front-end (TG3) | GET /escolinhas lista as escolinhas cadastradas | Passou |
| 42 | API REST > integração com o front-end (TG3) | GET /escolinhas/:id/criancas lista só as crianças da escolinha, sem dados sensíveis | Passou |
| 43 | API REST > integração com o front-end (TG3) | GET /escolinhas/:id/criancas de escolinha inexistente responde 404 | Passou |
| 44 | API REST > integração com o front-end (TG3) | com dadosExemplo a busca já começa com crianças cadastradas | Passou |
| 45 | API REST > integração com o front-end (TG3) | com pastaPublica a API serve o front-end em / | Passou |
| 46 | API REST > integração com o front-end (TG3) | sem pastaPublica, / não serve arquivos (404) | Passou |

### postgres.test.js (30 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | PostgreSQL real: migrations e repositórios > migrations | aplicam o esquema, registram o nome e não repetem na segunda execução | Passou |
| 2 | PostgreSQL real: migrations e repositórios > migrations | várias instâncias subindo juntas aplicam uma única vez | Passou |
| 3 | PostgreSQL real: migrations e repositórios > migrations | uma migration que falha desfaz tudo e não fica registrada | Passou |
| 4 | PostgreSQL real: migrations e repositórios > migrations | o banco rejeita arrecadado acima da meta, mesmo que a aplicação erre | Passou |
| 5 | PostgreSQL real: migrations e repositórios > migrations | chaves estrangeiras impedem criança sem escolinha e doação sem necessidade | Passou |
| 6 | PostgreSQL real: migrations e repositórios > escolinhas | salva, lê, atualiza o status e lista | Passou |
| 7 | PostgreSQL real: migrations e repositórios > escolinhas | guarda o motivo de rejeição | Passou |
| 8 | PostgreSQL real: migrations e repositórios > escolinhas | id inexistente ou que não é UUID devolve null (vira 404, não erro do banco) | Passou |
| 9 | PostgreSQL real: migrations e repositórios > crianças e necessidades | a criança volta completa, com dados restritos e necessidades, sem vazar no JSON | Passou |
| 10 | PostgreSQL real: migrations e repositórios > crianças e necessidades | endereço sem campos opcionais continua sem eles | Passou |
| 11 | PostgreSQL real: migrations e repositórios > crianças e necessidades | salvar de novo atualiza a criança e acrescenta só as necessidades novas | Passou |
| 12 | PostgreSQL real: migrations e repositórios > crianças e necessidades | salvar a criança com uma cópia velha não apaga o arrecadado de uma doação que entrou depois | Passou |
| 13 | PostgreSQL real: migrations e repositórios > crianças e necessidades | buscarPorNecessidadeId devolve a criança dona (chave estrangeira) | Passou |
| 14 | PostgreSQL real: migrations e repositórios > crianças e necessidades | necessidades.salvar muda só a descrição: nunca sobrescreve arrecadado nem status (L2) | Passou |
| 15 | PostgreSQL real: migrations e repositórios > crianças e necessidades | encerrar só vale se ainda está ABERTA no banco; uma já atendida não é encerrada por cópia velha | Passou |
| 16 | PostgreSQL real: migrations e repositórios > crianças e necessidades | o banco recusa status incoerente com o arrecadado (L3) | Passou |
| 17 | PostgreSQL real: migrations e repositórios > listar com filtros (busca) | cidade sem acento nem caixa, com índice em uf + cidade | Passou |
| 18 | PostgreSQL real: migrations e repositórios > listar com filtros (busca) | tipo exige necessidade ABERTA daquele tipo | Passou |
| 19 | PostgreSQL real: migrations e repositórios > listar com filtros (busca) | filtra por escolinha, e id que não é UUID não acha nada | Passou |
| 20 | PostgreSQL real: migrations e repositórios > listar com filtros (busca) | sem filtros lista todas; sem resultado devolve lista vazia | Passou |
| 21 | PostgreSQL real: migrations e repositórios > doações | salva e lê a doação com valor, data e anonimato idênticos | Passou |
| 22 | PostgreSQL real: migrations e repositórios > doações | doação é imutável: salvar o mesmo id duas vezes é erro | Passou |
| 23 | PostgreSQL real: carga dos dados de exemplo | semeia o banco vazio uma vez e não duplica na segunda | Passou |
| 24 | PostgreSQL real: carga dos dados de exemplo | duas instâncias subindo juntas semeiam uma vez só | Passou |
| 25 | PostgreSQL real: carga dos dados de exemplo | banco que já tem dados não recebe os exemplos | Passou |
| 26 | PostgreSQL real: carga dos dados de exemplo | se a carga falhar no meio, nada fica gravado e a próxima tentativa semeia | Passou |
| 27 | PostgreSQL real: inicialização | iniciarPostgres aplica as migrations, semeia só na primeira vez e entrega repositórios e trava | Passou |
| 28 | PostgreSQL real: inicialização | sem semear, o banco fica vazio | Passou |
| 29 | PostgreSQL real: inicialização | se não conseguir conectar, falha e não deixa o pool aberto | Passou |
| 30 | PostgreSQL real: inicialização | criarPool conecta e uma conexão ociosa que cai vai para o log sem derrubar o processo | Passou |

### postgresDoacao.test.js (11 casos)

| # | Grupo | Caso | Resultado |
|---|---|---|---|
| 1 | PostgreSQL real: API e doação transacional > fluxo completo pela API | cadastro, busca, doação e comprovante; tudo continua lá numa nova instância (reinício) | Passou |
| 2 | PostgreSQL real: API e doação transacional > fluxo completo pela API | mantém as regras e mensagens: 404 para id inválido, 400 acima da meta, 400 se não aberta, 402 recusado | Passou |
| 3 | PostgreSQL real: API e doação transacional > fluxo completo pela API | aprovar escolinha persiste | Passou |
| 4 | PostgreSQL real: API e doação transacional > transação da doação | se falhar depois do registro, nada é gravado (rollback) e a cobrança é estornada | Passou |
| 5 | PostgreSQL real: API e doação transacional > transação da doação | a doação e o arrecadado ficam na mesma transação: falha ao gravar a doação desfaz o arrecadado | Passou |
| 6 | PostgreSQL real: API e doação transacional > transação da doação | necessidade inexistente no banco dá erro claro | Passou |
| 7 | PostgreSQL real: API e doação transacional > transação da doação | o PagamentoRecusadoError continua sendo o erro devolvido quando o gateway recusa | Passou |
| 8 | PostgreSQL real: API e doação transacional > concorrência (SELECT ... FOR UPDATE) | 20 doações de R$ 10 numa meta de R$ 100: exatamente 10 passam, arrecadado = 100, só os aceitos são cobrados | Passou |
| 9 | PostgreSQL real: API e doação transacional > concorrência (SELECT ... FOR UPDATE) | valores quebrados: nunca passa da meta e o total confere com a soma dos comprovantes | Passou |
| 10 | PostgreSQL real: API e doação transacional > concorrência (SELECT ... FOR UPDATE) | duas instâncias (dois pools, como dois processos) disputando a mesma necessidade | Passou |
| 11 | PostgreSQL real: API e doação transacional > concorrência (SELECT ... FOR UPDATE) | necessidades diferentes não esperam uma pela outra e cada total fica certo | Passou |
