# Daily semanal da Sprint 3

## Semana de 12/10 a 18/10/2026

### O que foi feito

- Leitura das Entregas 1 e 2 para alinhar a implementação aos casos de uso e ao diagrama de classes.
- Back-end em camadas: `api`, `services`, `domain` e `infra`.
- Classes `Escolinha`, `Crianca` e `Doacao`, com privacidade dos dados da criança e doação imutável.
- Serviços de busca (UC-06) e de doação (UC-08, com comprovante do UC-09).
- API REST em Express com as rotas de escolinha, criança, necessidade, busca e doação.
- Testes novos com Jest e supertest, mantendo a cobertura mínima exigida pela esteira.
- Jenkins próprio na AWS Academy, com o build #1 do job DoaGol verde.

### O que será feito

- Abrir o pull request da Sprint 3 para a `dev` e pedir revisão de Rodrigo e Cristian.
- Criar o webhook do GitHub apontando para o Jenkins.
- Começar a autenticação e os papéis de usuário (UC-01).
- Definir com o grupo a configuração do PostgreSQL e a estrutura do front-end em React.

### Impedimentos

- O webhook depende de um administrador do repositório no GitHub.
- O Learner Lab da AWS Academy encerra a sessão a cada 4 horas, e o IP público da EC2 muda quando a instância reinicia, o que obriga a atualizar o webhook.
