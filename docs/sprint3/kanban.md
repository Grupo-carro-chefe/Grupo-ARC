# Kanban da Sprint 3

Quadro no Notion: https://app.notion.com/p/25916e0ce8714718aac8ae09499e857b

Espelho do quadro do grupo; atualizar junto com o Notion.

## Concluído

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Repositório do grupo e fluxo dev → main com pull request | Rodrigo | | Commits iniciais e PRs #1 a #7 (18/08 e 28/09) |
| Entrega 1: requisitos, casos de uso, classes, sequência e arquitetura | Grupo | UC-01 a UC-13 | DoaGol_Trabalho_LabES.pdf (set/2026) |
| Classe Necessidade com 34 testes Jest | André | UC-04 | `src/domain/Necessidade.js` (27/09) |
| Esteira de CI no GitHub Actions (Node 20 e 22, cobertura mínima) | André | | `.github/workflows/ci.yml` (27-28/09) |
| Entrega e implantação contínuas (Release e GitHub Pages) | Rodrigo | | PR #3 (28/09) |
| Jenkins na AWS versionado em infra/ | Rodrigo | | PR #5 (28/09) |
| README com stack e instruções | André | | `README.md` |
| Jenkins próprio na AWS Academy com build #1 verde do job DoaGol | André | | EC2 Ubuntu 24.04, Node 22, build #1 (18/10) |

## Em andamento

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Classes Escolinha e Crianca com privacidade dos dados da criança | André | UC-02, UC-03, UC-11 | `src/domain/Escolinha.js`, `src/domain/Crianca.js` |
| Busca de crianças por cidade, UF e tipo de necessidade | André | UC-06 | `src/services/BuscaService.js` |
| Realizar doação com gateway, notificação e comprovante | André | UC-08, UC-09 | `src/domain/Doacao.js`, `src/services/DoacaoService.js` |
| API REST Express em camadas (api, services, domain, infra) | André | UC-02 a UC-09, UC-11 | `src/api/app.js` |
| Testes novos mantendo a cobertura mínima da esteira | André | | `tests/` (`npm run test:coverage`) |
| Documentar a sprint: casos de uso, Kanban e daily | André | | `docs/sprint3/` |
| Pull request da Sprint 3 para dev e depois para main | André | | Aguardando revisão do grupo |
| Webhook do GitHub apontando para o Jenkins | André | | Aguardando ✓ verde em Recent Deliveries |

## A fazer

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Autenticação e papéis (doador, escolinha, administrador) | | UC-01 | |
| Persistência em PostgreSQL no lugar do repositório em memória | | todos | |
| Front-end React: login, busca, perfil da criança e doação | | UC-01, UC-06, UC-07, UC-08 | |
| Integração com gateway de pagamento e serviço de e-mail reais | | UC-08 | |
| Painel da escolinha | | UC-10 | |
| Gestão de usuários e moderação | | UC-12, UC-13 | |
