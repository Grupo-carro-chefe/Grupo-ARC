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

## Entrega 3: início da implementação (Sprint 3)

Nesta sprint o projeto passou a ter um back-end em camadas, com uma API REST em **Express 5**
que implementa os casos de uso **UC-03 Cadastrar Criança**, **UC-06 Buscar Crianças/Necessidades**
e **UC-08 Realizar Doação** (com o comprovante do UC-09), além do cadastro e da aprovação de
escolinhas (UC-02 e UC-11) como apoio.

### Estrutura de pastas

```
src/
├── api/        app.js: rotas Express e tradução de erros em códigos HTTP
├── services/   BuscaService (UC-06) e DoacaoService (UC-08)
├── domain/     Necessidade, Escolinha, Crianca, Doacao e validações
├── infra/      repositório em memória, gateway de pagamento e notificador simulados
└── server.js   sobe a API
tests/          testes Jest de cada classe, dos serviços e da API (supertest)
docs/sprint3/   casos de uso, Kanban e daily da sprint
```

### Como rodar a API

```bash
npm install
npm start      # sobe em http://localhost:3000 (ou na porta definida em PORT)
```

| Método e rota | Caso de uso | O que faz |
|---|---|---|
| `GET /saude` | | Verifica se a API está no ar |
| `POST /escolinhas` | UC-02 | Cadastra uma escolinha, que nasce `PENDENTE` |
| `POST /escolinhas/:id/aprovar` | UC-11 | Aprova o cadastro da escolinha |
| `POST /escolinhas/:id/criancas` | UC-03 | Cadastra uma criança (só escolinha aprovada) |
| `POST /criancas/:id/necessidades` | UC-04 | Cadastra uma necessidade para a criança |
| `GET /criancas?cidade=&uf=&tipo=` | UC-06 | Busca crianças com necessidades abertas |
| `GET /criancas/:id` | UC-07 | Perfil público da criança |
| `POST /necessidades/:id/doacoes` | UC-08, UC-09 | Realiza a doação e devolve o comprovante |

As respostas nunca trazem nome civil, data de nascimento ou endereço da criança (RF06, RNF01).

### O que ainda não existe

- Autenticação e papéis de usuário (UC-01): por enquanto as rotas são abertas.
- Gateway de pagamento e serviço de e-mail reais (hoje são simulados).
- Persistência em PostgreSQL (hoje os dados ficam em memória e somem ao reiniciar).
- Front-end em React.
- Painel da escolinha (UC-10) e gestão de usuários e moderação (UC-12, UC-13).

### Documentação da sprint

- [Casos de uso implementados](docs/sprint3/casos-de-uso.md): rastreabilidade entre UC, requisitos, código, testes e rotas.
- [Kanban](docs/sprint3/kanban.md), espelho do [quadro no Notion](https://app.notion.com/p/25916e0ce8714718aac8ae09499e857b).
- [Daily semanal](docs/sprint3/daily.md).

## Esteira de CI/CD

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda no GitHub Actions a cada
`push` ou pull request nas branches `main` e `dev`, e também pode ser disparado manualmente na aba
**Actions**.

```
push/PR ──> GitHub Actions: Build e testes (Node 20 e 22) ──┬──> Entrega: pacote versionado (Release)
   │                                                        └──> Implantação: relatório no GitHub Pages
   │                                                        (estas duas só na main)
   │
   └──> webhook (push na main) ──> Jenkins na AWS EC2: npm ci + testes com cobertura
```

### Integração contínua (todas as branches)

1. Baixa o código do repositório.
2. Configura o Node.js (matriz com as versões 20 e 22).
3. Instala as dependências com `npm ci`.
4. Executa os testes com cobertura mínima exigida (95% de linhas, 85% de branches). Se algum teste falhar ou a cobertura cair, a esteira fica vermelha e nada é entregue.
5. Publica o relatório de cobertura como artefato da execução.

### Entrega e implantação contínuas (só na `main`, depois dos testes passarem)

- **Entrega:** gera o pacote `doagol-<versão>.tgz` com `npm pack` e publica em
  [Releases](https://github.com/Grupo-carro-chefe/Grupo-ARC/releases), com uma versão nova a cada execução.
- **Implantação:** publica o relatório de cobertura em
  [grupo-carro-chefe.github.io/Grupo-ARC](https://grupo-carro-chefe.github.io/Grupo-ARC/).

### Fluxo de branches

O trabalho é feito na `dev` (via pull request) e chega à `main` por um pull request de `dev` para `main`.
As duas branches exigem pull request com aprovação, e a `main` só aceita o merge com os testes passando.

## Jenkins na AWS

Além do GitHub Actions, o projeto também roda num Jenkins instalado numa instância EC2 do
AWS Academy Learner Lab, seguindo o laboratório da Aula 7 (com Node.js no lugar do Maven).
A cada push na `main`, o GitHub avisa o Jenkins por webhook, e o Jenkins baixa o código e roda
`npm ci` e `npm run test:coverage`. O relatório de cobertura fica arquivado em cada build.

A configuração está versionada em [`infra/`](infra/), sem nenhuma senha ou chave:

| Arquivo | Conteúdo |
|---|---|
| [`infra/aws/criar-jenkins-ec2.sh`](infra/aws/criar-jenkins-ec2.sh) | Cria a EC2 (Ubuntu 24.04, t3.small, chave `vockey`) e o Security Group com as portas 8080 e 22 |
| [`infra/aws/jenkins-user-data.sh`](infra/aws/jenkins-user-data.sh) | User Data da instância: instala Java 21, Git, Node.js 22 e Jenkins LTS |
| [`infra/jenkins/doagol-job.xml`](infra/jenkins/doagol-job.xml) | Job `DoaGol`: Git na `main`, gatilhos por webhook e Poll SCM, testes com cobertura, arquivamento de `coverage/` |
| [`infra/jenkins/importar-job.sh`](infra/jenkins/importar-job.sh) | Cria o job num Jenkins pela API REST, pedindo usuário e senha na hora |

### Como recriar

1. No AWS Academy, abra o Learner Lab, clique em **Start Lab** e espere a bolinha ficar verde.
2. No terminal do lab, rode `git clone https://github.com/Grupo-carro-chefe/Grupo-ARC.git` e depois
   `bash Grupo-ARC/infra/aws/criar-jenkins-ec2.sh`. O script mostra o IP público.
3. Depois de 3 a 5 minutos, abra `http://<IP>:8080`, use a senha inicial (o script mostra o comando que a exibe),
   instale os plugins sugeridos e crie o usuário administrador.
4. No WSL ou no Linux, rode `bash infra/jenkins/importar-job.sh http://<IP>:8080`.
5. No GitHub, em **Settings > Webhooks**, adicione `http://<IP>:8080/github-webhook/`
   (content type `application/json`, só o evento push).

O IP público muda sempre que a instância é parada ou o lab reinicia. Nesse caso, atualize o webhook com o IP novo.
Pare a instância quando não estiver em uso, para não consumir o crédito do lab.
