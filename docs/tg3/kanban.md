# Kanban do TG3 (implementação da aplicação)

Quadro no Notion: https://app.notion.com/p/25916e0ce8714718aac8ae09499e857b

Espelho do quadro do grupo; atualizar junto com o Notion. O histórico da Sprint 3 está em
[docs/sprint3/kanban.md](../sprint3/kanban.md).

## Concluído

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Back-end em camadas e API REST (Sprint 3) | André | UC-02 a UC-09, UC-11 | PR #8, `src/api/app.js` (19/10) |
| Roteiro de requisições da API | André | | PR #9, `docs/sprint3/demo-api.http` |
| Permissões mínimas na esteira e política de segurança | Rodrigo | | PRs #12 e #14 (19/10) |
| Dados de exemplo para a demonstração | Cristian | UC-06, UC-07 | `src/infra/dadosExemplo.js` |
| CORS, listagem de escolinhas e API servindo o front-end | Cristian | UC-10 (parcial) | `src/api/app.js`, `tests/api.test.js` |
| Front-end React: busca com filtros (IBGE) | Cristian | UC-06 | `frontend/src/paginas/Busca.jsx` |
| Front-end React: perfil, doação e comprovante | Cristian | UC-07, UC-08, UC-09 | `frontend/src/paginas/Perfil.jsx`, `componentes/Doacao.jsx` |
| Front-end React: área da escolinha (ViaCEP) | Cristian | UC-02, UC-03, UC-04, UC-11 | `frontend/src/paginas/Escolinha.jsx` |
| Blueprint de hospedagem no Render, publicando só com a esteira verde | Cristian | | `render.yaml`, `docs/tg3/deploy-render.md` |
| README, Kanban e daily do TG3 | Cristian | | `README.md`, `docs/tg3/` |

## Em andamento

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Pull request do TG3 para `dev` e depois para `main` | Grupo | | Aguardando revisão |
| Criar o serviço no Render e anotar a URL no README | Grupo | | Depende de acesso de administrador ao repositório |
| Vídeo, prints (.docx) e .zip da entrega de 16/11 | Grupo | | |

## A fazer (depois do MVP)

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Autenticação e papéis (doador, escolinha, administrador) | | UC-01 | |
| Persistência em PostgreSQL no lugar do repositório em memória | | todos | |
| Integração com gateway de pagamento e serviço de e-mail reais | | UC-08 | |
| Painel completo da escolinha (doações recebidas, encerrar pedido) | | UC-10 | |
| Gestão de usuários e moderação | | UC-12, UC-13 | |
