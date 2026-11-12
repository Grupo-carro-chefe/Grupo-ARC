# Roteiro do vídeo do TG3 (DoaGol)

Vídeo sem áudio, até 3 minutos, mostrando a aplicação funcionando. Como não há narração, cada cena leva uma legenda curta na tela (no editor ou em texto sobreposto). O tempo alvo é 2:45, com 15 segundos de margem.

Endereços usados na gravação:
- App local: http://localhost:3100
- App publicado: https://doagol.onrender.com
- GitHub Actions: https://github.com/Grupo-carro-chefe/Grupo-ARC/actions
- PR da entrega: #20 (branch `feat/front-animacoes`)

## Checklist de preparação (1 minuto)

1. Navegador em tela cheia (F11), zoom 100% (Ctrl+0), janela em 1920x1080 ou 1440x900. Telas com largura acima de 860 px mostram as animações completas (bola do hero e janela inclinada).
2. Menu do topo com "Animações: ligadas". Se estiver "desligadas", clicar uma vez antes de gravar (a página recarrega). Se o Windows estiver com "reduzir movimento" ligado, o site desliga as animações sozinho.
3. Servidor reiniciado para dados limpos. No WSL, derrubar o processo da porta 3100 e subir de novo com `PORT=3100 node src/server.js` a partir da pasta do projeto. O Claude pode fazer esse reinício se você pedir.
4. Abas abertas na ordem: (1) http://localhost:3100, (2) GitHub Actions, (3) https://doagol.onrender.com. Abrir a aba 3 uns 2 minutos antes: o plano Free do Render dorme após 15 minutos sem acesso.
5. Notificações do Windows desligadas (Não Perturbe ativo). Fechar as outras abas e manter a barra de tarefas oculta.
6. Gravador: Xbox Game Bar (Win+Alt+R) com microfone desligado e áudio do sistema desligado, ou OBS sem fonte de áudio. Sem áudio, o vídeo final não tem faixa de som.
7. Teste rápido: abrir a Busca e confirmar que aparecem 24 crianças (os primeiros cards são Kauã, Lívia, Pedrinho, Juju, Davi e Gabi), com Kauã em 40% na chuteira (R$ 72,00 de R$ 180,00), Juju em 75% e Gabi em 71%. A área da escolinha lista 12 escolinhas: 10 aprovadas, 1 pendente e 1 rejeitada. Se algum valor vier diferente, o servidor já tinha doações de testes: reiniciar antes de gravar.

## Tempo das cenas

| Cena | Tempo | Conteúdo |
|---|---|---|
| 1 | 0:00 a 0:15 | Abertura do hero e botão de animações |
| 2 | 0:15 a 0:45 | Rolagem, "O app por dentro", cards com selo e tour |
| 3 | 0:45 a 1:10 | Busca com filtros (estado e tipo) |
| 4 | 1:10 a 1:45 | Perfil da criança e doação anônima com comprovante |
| 5 | 1:45 a 2:30 | Área da escolinha: cadastro, aprovação, criança com CEP e pedido |
| 6 | 2:30 a 2:45 | Fechamento: GitHub Actions, Render e README |

---

## Cena 1: abertura (0:00 a 0:15)

**Ações**
1. Carregar http://localhost:3100 e não mexer no mouse por 3 segundos. O campo se monta em 3D, o giz risca o meio de campo e a bola rola até o centro.
2. Deixar o título e a caixa de busca aparecerem por completo.
3. Mover o cursor até o menu do topo, onde está o botão "Animações: ligadas".

**Legendas**
- "Campo se monta com giz e bola"
- "Animações ligadas no menu do topo"

**Não fazer**
- Não clicar em "Animações". A página recarrega e a abertura começa de novo.
- Não rolar antes dos 3 segundos.

---

## Cena 2: rolagem, app por dentro e tour (0:15 a 0:45)

**Ações**
1. Rolar devagar com a roda do mouse. A rolagem é suave (Lenis). O campo recua e fica para trás enquanto a lista sobe.
2. Na seção "O app por dentro", a janela inclinada endireita ao rolar. O total de Kauã conta até R$ 72,00 arrecadados de R$ 290,00. Os dois balões aparecem: "IBGE + ViaCEP" e "Comprovante na hora".
3. Continuar até os cards. Os pedidos a partir de 70% mostram o selo "Quase lá", como o de Juju (75%) e o de Gabi (71%).
4. Seguir para "Como doar". O texto fica à esquerda e a janela à direita troca de tela: busca, perfil e comprovante. Rolar em ritmo de uns 5 segundos por passo.

**Legendas**
- "Campo recua e a lista sobe"
- "Dados de estado e cidade vêm do IBGE"
- "Pedidos perto da meta ganham o selo Quase lá"
- "Como doar em três passos"

**Não fazer**
- Não rolar rápido. Cards e barras contam só quando entram na tela, e o tour depende da rolagem para trocar de passo.
- Não voltar ao topo nesta cena.

---

## Cena 3: busca com filtros (0:45 a 1:10)

**Ações**
1. Rolar de volta ao topo com a roda do mouse.
2. No campo Estado, clicar, digitar `sao` (sem acento) e escolher "São Paulo". A lista mostra "5 crianças precisam de ajuda" (Kauã, Lívia, Thiago, Miguel e Aninha). A página desce até os resultados.
3. No campo Tipo de pedido, escolher "Transporte". A lista mostra "2 crianças precisam de ajuda" (Kauã, com o bilhete de ônibus, e Miguel, com o passe mensal). Sem o filtro de estado, o tipo Transporte daria 7 crianças.
4. Clicar no cartão de Kauã. Ele abre o perfil.

**Legendas**
- "Digite sao e escolha São Paulo"
- "Lista atualizada pela API do IBGE"
- "Filtro por tipo de pedido"

**Não fazer**
- Não usar o campo Cidade. Ele depende do IBGE e muda a lista de um jeito que a cena não mostra.
- Não clicar em "Limpar filtros" antes do cartão de Kauã.

---

## Cena 4: perfil e doação (1:10 a 1:45)

**Ações**
1. Na página de Kauã, deixar a abertura acontecer: cartão, título palavra por palavra e pedidos com barras contando. A animação dura cerca de 1,5 segundo.
2. Clicar em "Doar para este pedido" no pedido "Chuteira de futsal nº 34" (40%).
3. Clicar no chip "R$ 10,00". A forma de pagamento já está em Pix.
4. Marcar "Doar sem mostrar meu nome para a escolinha".
5. No campo "Seu e-mail", digitar `doador@exemplo.com`.
6. Clicar em "Doar R$ 10,00". Aparece o comprovante: "Doação confirmada", R$ 10,00 e "Anônima" no campo Doador.
7. Clicar em "Copiar código" e mostrar a mensagem "Código copiado".
8. No comprovante, a barra do cartão à esquerda sobe até a nova porcentagem da chuteira.

**Legendas**
- "Perfil com pedidos e progresso"
- "Doação de R$ 10 por Pix, sem mostrar o nome"
- "Pagamento simulado, sem cobrança real"
- "Comprovante com código para copiar"

**Não fazer**
- Não esperar a abertura repetir. Ela toca uma vez por visita ao perfil.
- Não usar um e-mail real. O domínio `exemplo.com` é reservado para testes.
- Não clicar em "Voltar para a busca" antes do comprovante.

---

## Cena 5: área da escolinha (1:45 a 2:30)

**Ações**
1. Clicar em "Sou escolinha" no menu do topo.
2. Em "Cadastrar nova escolinha", clicar no resumo para abrir o formulário. Preencher Nome "Escolinha Demo", Cidade "São Paulo" e UF "SP". Clicar em "Cadastrar escolinha". Aparece a mensagem de que o cadastro precisa ser aprovado.
3. Em "Aprovação do cadastro", clicar em "Aprovar cadastro (administrador)". Aparece "Cadastro aprovado".
4. Em "Cadastrar criança", preencher:
   - Nome completo: Nina Azevedo
   - Apelido: Nina
   - Nascimento: 10/03/2017
   - CEP: 01310-100. Clicar fora do campo (Tab). O ViaCEP preenche rua (Avenida Paulista), bairro (Bela Vista), cidade e UF.
   - Número: 1000
   Clicar em "Cadastrar criança".
5. Em "Cadastrar pedido", escolher a criança "Nina, 9 anos", tipo "Material esportivo", descrição "Chuteira de futsal nº 33" e valor "150,00". Clicar em "Publicar pedido".
6. Clicar em "Quero doar" no menu. Em Estado, escolher "São Paulo". Nina aparece na lista de São Paulo.

**Legendas**
- "Escolinha cadastrada e aprovada pelo administrador"
- "CEP preenche o endereço pelo ViaCEP"
- "Nome e endereço ficam privados"
- "Pedido publicado aparece na busca"

**Não fazer**
- Não usar nome de pessoa real. Os dados são fictícios.
- Não avançar para o passo seguinte sem a mensagem de sucesso aparecer na tela.
- Se a cena passar de 45 segundos, gravar em uma tomada separada e cortar no editor. Sem áudio, o corte não atrapalha.

---

## Cena 6: fechamento (2:30 a 2:45)

**Ações**
1. Aba do GitHub: abrir a lista de execuções do Actions ou o PR #20 e mostrar a execução mais recente com check verde. Confirmar o verde antes de gravar.
2. Aba do Render: mostrar https://doagol.onrender.com já carregado.
3. Aba do README no repositório: mostrar o topo com o badge de CI.

**Legendas**
- "CI roda no GitHub Actions"
- "Render publica depois da CI verde"
- "README descreve só o que existe"

**Não fazer**
- Não rolar o README até o fim. O fechamento dura 15 segundos.

---

## Pontos de atenção

- ViaCEP e IBGE são serviços externos. Se o IBGE não responder, a lista de estados usa uma lista interna e o filtro continua funcionando. Se o ViaCEP não responder, a tela mostra o aviso e pede o endereço à mão. Nesse caso, preencher o endereço à mão ou gravar a cena 5 de novo.
- O pagamento é simulado. A legenda "Pagamento simulado, sem cobrança real" precisa aparecer na cena 4.
- As animações dependem da tela. Abaixo de 861 px de largura, a bola do hero e a janela inclinada não se movem.
- Os dados somem quando o servidor reinicia. Gravar tudo de uma vez, na ordem das cenas, depois do reinício.
- Divergência a decidir antes de gravar: a barra do comprovante arredonda (`Math.round` em `frontend/src/componentes/BarraPedido.jsx`), e a API calcula com `Math.floor` (`src/domain/Necessidade.js`, `percentualArrecadado`). Depois de uma doação de R$ 10 na chuteira de Kauã, o comprovante mostra 46% e a lista mostra 45%. O roteiro não cita esse número. Vale alinhar o cálculo no código ou aceitar a diferença.
