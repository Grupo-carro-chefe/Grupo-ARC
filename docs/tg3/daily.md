# Daily do TG3

## 10 e 11/11/2026

### O que foi feito

- Pull requests #18 (TG3) e #19 (dev) integrados; depois #20 (front), #21 (banco) e #22 (dev), todos na `main`.
- Aplicação no ar no Render pelo Blueprint `doagol`: https://doagol.onrender.com.
- Banco PostgreSQL no Neon, com migrations, repositórios e doação em transação com lock na necessidade. Sem `DATABASE_URL`, o app continua usando os repositórios em memória.
- Revisão de concorrência: erro de regra de negócio próprio, nova tentativa na conexão, `CHECK` de status e salvamento que não sobrescreve o dinheiro arrecadado.
- Dados de exemplo ampliados para 12 escolinhas, 24 crianças e 42 necessidades.
- Front com animações (GSAP, ScrollTrigger e Lenis), botão "Animações", seletores próprios, tela de doação refeita e fundo de campo.
- README, SECURITY e Dependabot atualizados.
- Prints de todas as telas, `Telas-DoaGol.docx` e script de montagem do zip da entrega.

### O que será feito

- Gravar o vídeo (roteiro em `docs/tg3/roteiro-video.md`).
- Fechar a documentação (capítulos 7, 8 e 9).
- Gerar o `GrupoARC.zip` com `scripts/gerar-entrega.sh` e entregar até 16/11, 23:59.

### Impedimentos

- No plano gratuito do Render o serviço dorme após 15 minutos sem acesso e leva até 1 minuto para acordar: abrir a URL antes de gravar.
- Divergência de arredondamento a decidir: a barra do comprovante arredonda e a API trunca o percentual.


## Semana de 09/11 a 15/11/2026

### O que foi feito

- Revisão dos critérios do TG3 (front-end, back-end, consumo de API, hospedagem) contra o estado do repositório.
- API: CORS, `GET /escolinhas`, `GET /escolinhas/:id/criancas` e opção de servir o front-end compilado.
- Dados de exemplo carregados ao subir o servidor, passando pelas mesmas regras de domínio do cadastro.
- Testes novos para as rotas e os dados de exemplo, mantendo a cobertura mínima da esteira.
- Front-end em React com busca, perfil, doação, comprovante e área da escolinha.
- Consumo das APIs públicas do IBGE (estados e cidades) e do ViaCEP (endereço), com alternativa manual.
- Blueprint do Render com deploy condicionado à esteira verde.

### O que será feito

- Revisar e aprovar o pull request do TG3 na `dev` e levar para a `main`.
- Criar o serviço no Render e conferir a aplicação no ar.
- Gravar o vídeo da demonstração e montar o .docx com as telas para a entrega de 16/11.

### Impedimentos

- Criar o serviço no Render exige uma conta ligada ao GitHub com acesso de administrador ao repositório.
- No plano gratuito o serviço dorme sem acesso; é preciso abrir a URL antes da apresentação.
