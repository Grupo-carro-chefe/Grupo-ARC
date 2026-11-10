# Política de segurança

## Versões com suporte

O DoaGol é um projeto acadêmico em desenvolvimento. Só a versão mais recente da branch `main`
(a última [Release](https://github.com/Grupo-carro-chefe/Grupo-ARC/releases)) recebe correções.

| Versão | Suporte |
| ------ | ------- |
| 0.1.x (`main`, publicada em https://doagol.onrender.com) | :white_check_mark: |
| anteriores | :x: |

## Como relatar uma vulnerabilidade

Não abra uma issue pública para falhas de segurança, porque o sistema trata dados de crianças e de pagamentos.

- Envie o relato pela aba **Security → Report a vulnerability** deste repositório, ou
- Fale diretamente com um dos integrantes do grupo (André Ihsan Ward, Rodrigo Lucas Mascarenhas Leite Oliveira ou Cristian de Souza).

Inclua o que for possível: rota ou arquivo afetado, passos para reproduzir e o impacto.
Respondemos em até 7 dias. Se a falha for confirmada, a correção entra na próxima Release e o relato é creditado, se você quiser.

## Dados sensíveis

- Nunca envie senhas, chaves da AWS, tokens ou arquivos `.env`/`.pem` para o repositório.
- Dados de crianças (nome civil, nascimento e endereço) nunca devem aparecer em respostas da API, logs ou exemplos.
- A connection string do banco (`DATABASE_URL`) fica só no Environment do Render e num `.env.local` na máquina local. Ela nunca entra no repositório.
- O perfil público da criança (`perfilPublico()` em [`src/domain/Crianca.js`](src/domain/Crianca.js)) mostra apelido, idade, cidade e UF, além do identificador, da escolinha e dos pedidos abertos. Nome civil, data de nascimento e endereço ficam fora dele.
- O pagamento é simulado nesta versão. O [`GatewayPagamentoSimulado`](src/infra/GatewayPagamentoSimulado.js) aprova ou recusa cobranças sem falar com nenhum banco ou gateway real.

## O que o repositório já faz

- **Segredos:** o GitHub bloqueia o push de segredos conhecidos (push protection) e alerta sobre os que já estão no repositório (secret scanning).
- **Dependências:** os alertas do Dependabot estão ativos. O arquivo [`.github/dependabot.yml`](.github/dependabot.yml) configura atualizações semanais, em pull requests para a `dev`, para `npm` na raiz, `npm` em `frontend/` e GitHub Actions. Além disso, as atualizações de segurança do Dependabot estão ligadas: quando uma dependência tem vulnerabilidade conhecida, o GitHub abre um pull request automático para corrigi-la.
- **Análise de código:** CodeQL, na configuração padrão do GitHub, para JavaScript e GitHub Actions.
- **Proteção de branches:** a `main` e a `dev` só recebem mudanças por pull request com 1 aprovação, sem force push e sem exclusão. A `main` ainda exige que as checagens "Build e testes (Node 20)" e "Build e testes (Node 22)" passem.
- **Permissões mínimas no CI:** o workflow [`ci.yml`](.github/workflows/ci.yml) começa com `contents: read`. Só a entrega pede `contents: write`, e só a implantação pede `pages: write` e `id-token: write`.
- **Limite atual:** a API ainda não tem autenticação (UC-01 está planejado), então as rotas são abertas.
