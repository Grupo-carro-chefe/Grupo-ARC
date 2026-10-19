# Política de segurança

## Versões com suporte

O DoaGol é um projeto acadêmico em desenvolvimento. Só a versão mais recente da branch `main`
(a última [Release](https://github.com/Grupo-carro-chefe/Grupo-ARC/releases)) recebe correções.

| Versão | Suporte |
| ------ | ------- |
| 0.1.x (main) | :white_check_mark: |
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
