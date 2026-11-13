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
| Pull requests #18 (TG3) e #19 (dev) integrados na `main` | Rodrigo | | PRs #18 e #19 (10/11) |
| Serviço no ar no Render pelo Blueprint `doagol`, publicando a `main` com CI verde | Rodrigo | | https://doagol.onrender.com, `render.yaml` |
| Persistência em PostgreSQL no Neon: migrations, repositórios e doação transacional com lock na necessidade | Rodrigo | UC-08 | PR #21, `src/infra/` |
| Revisão de concorrência: `RegraNegocioError`, nova tentativa na conexão, `CHECK` de status, salvar sem sobrescrever dinheiro | Rodrigo | UC-08 | commit 220fc36 (PR #21) |
| Dados de exemplo ampliados: 12 escolinhas, 24 crianças, 42 necessidades e doações fictícias | Rodrigo | UC-06, UC-07 | commit 7086def (PR #22) |
| Front com animações (GSAP, ScrollTrigger e Lenis), hero, "O app por dentro", tour e cards com selo "Quase lá" | Rodrigo | UC-06 | PR #20, `frontend/src/componentes/` |
| Botão "Animações" com preferência salva | Rodrigo | | commit e877c60 (PR #20) |
| Seletor próprio do DoaGol no lugar dos `select` nativos | Rodrigo | UC-06 | commit 810e3a7 (PR #20) |
| Tela de doação refeita (valores rápidos, formas de pagamento, chave de anônimo, comprovante com código para copiar) | Rodrigo | UC-08, UC-09 | commit a283dc2 (PR #20) |
| Fundo de campo visto de cima no perfil e na área da escolinha | Rodrigo | UC-07 | commits 3c6359b e c8bd891 (PR #20) |
| README, SECURITY e Dependabot atualizados; `body-parser` corrigido | Rodrigo | | commits 973550a, 31fd766 e 7557b60 (PR #20) |
| Prints de todas as telas e `Telas-DoaGol.docx` | Rodrigo | | `docs/tg3/prints/`, `docs/tg3/Telas-DoaGol.docx` |
| Script que monta o `GrupoARC.zip` da entrega | Rodrigo | | `scripts/gerar-entrega.sh` |

## Em andamento

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Vídeo de até 3 minutos, sem áudio | Rodrigo | | Roteiro em `docs/tg3/roteiro-video.md` |
| Documentação (capítulos 1 a 9) | Grupo | | `docs/documentacao/` |
| Entrega do `GrupoARC.zip` até 16/11, 23:59 | Grupo | | `./scripts/gerar-entrega.sh` |

## A fazer (depois do MVP)

| Tarefa | Responsável | Casos de uso | Evidência |
|---|---|---|---|
| Autenticação e papéis (doador, escolinha, administrador) | | UC-01 | |
| Integração com gateway de pagamento e serviço de e-mail reais | | UC-08 | |
| Painel completo da escolinha (doações recebidas, encerrar pedido) | | UC-10 | |
| Gestão de usuários e moderação | | UC-12, UC-13 | |
