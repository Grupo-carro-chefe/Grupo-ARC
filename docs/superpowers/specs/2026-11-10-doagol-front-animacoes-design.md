# DoaGol: animações e visual do front-end

Data: 10/11/2026. Entrega do TG3: 16/11/2026.

## Por que

O MVP funciona, mas a busca ainda parece trabalho de faculdade: cards com camisa e inicial, hero parado. A banca abre a página uma vez na apresentação. O objetivo é que a primeira tela e o scroll mostrem o produto sem ninguém precisar explicar.

## Metas

- Hero com entrada animada de cerca de 3 s.
- Scroll suave com profundidade (o campo fica para trás) e um tour que mostra busca, perfil e comprovante.
- Cards limpos com números que contam e sinal de "quase lá".
- Tela do produto inclinada com balões, logo abaixo do hero.

## Fora do escopo

- Mudar API, regras de negócio ou rotas do back-end.
- Fotos de crianças. O app expõe só o perfil público (apelido, idade, cidade); foto de menor num app de doação é risco, mesmo que a skill de design peça foto em avatar.
- Three.js. A descida da câmera usa 3D de CSS; um mundo WebGL pesaria no plano grátis do Render sem ganho para a banca.
- Telas de Perfil, Doação e Escolinha ganham só o visual dos cards novos e a rolagem suave. Redesenho delas fica para depois.

## O que não pode acontecer

- Tela quebrada ou vazia sem JavaScript, com animação desativada no sistema ou num navegador sem suporte.
- Animação que esconde o título ou a busca: os dois ficam legíveis antes de a animação terminar.
- Testes do back-end quebrando ou bundle `public/app.js` desatualizado em relação a `frontend/src`.

## Decisões aprovadas

### 1. Hero (página de busca)

Ordem da sequência, só na abertura da página:

1. 0 a 1,4 s: o gramado começa inclinado (`rotateX` cerca de 62°) e a câmera desce até ele ficar de frente.
2. 0,8 a 2,2 s: o giz risca a linha do meio e o círculo central (traço SVG).
3. 1,9 a 3,0 s: uma bola de futebol rola da esquerda e para na marca do centro, girando.
4. A partir de 0,35 s: o título sobe palavra por palavra (intervalo de 0,06 s); depois o subtítulo; a caixa de busca encaixa por último.

Referência visual: mockup `hero-combinado.html`.

### 2. Tela inclinada com balões (D)

Entre o hero e a lista. Uma janela do app mostrando o perfil de uma criança entra inclinada e endireita com o scroll. O total arrecadado conta de 0 até o valor. Dois balões com setas desenhadas: "IBGE + ViaCEP" (estado, cidade e endereço pelas APIs públicas) e "Comprovante na hora" (código da doação e PIX). Referência: `scroll-produto.html`, opção D. Os dados da janela vêm da API (primeira criança da lista), sem número inventado.

### 3. Scroll

- Rolagem suave em toda a página.
- B, campo fica para trás: ao descer, o hero anda mais devagar que a página, encolhe até cerca de 92% e escurece; a lista sobe por cima como uma folha com cantos arredondados e sombra.
- E, tour com a tela presa: depois da lista, uma seção fixa com texto à esquerda e a janela do app à direita. A tela troca de busca para perfil e depois para comprovante conforme o scroll, com transição de 0,6 a 0,8 s e uma barra de progresso verde. Substitui um "Como funciona" genérico.

Referência: `fluxo-b-e-fluido.html`.

### 4. Cards da busca

- Visual: card branco, borda clara, nome e idade, cidade/UF, escolinha, até 2 pedidos com etiqueta de tipo, barra, "R$ X de R$ Y" e porcentagem. Sai a camisa com a inicial.
- Entrada: cascata em onda quando os cards aparecem; a barra enche enquanto R$ e % contam desacelerando; um brilho passa pela barra no fim; selo "Quase lá" quando o pedido passa de 70%.
- Mouse: inclinação leve na direção do cursor e um botão pequeno (pílula de cerca de 30 px de altura) "Doar · faltam R$ X" que sobe por baixo.
- Toque e teclado: o botão de doar fica visível sem hover; o card inteiro continua sendo um link para o perfil.

Referência: `cards-final.html`.

## Como fazer (decidido)

- GSAP + ScrollTrigger para a sequência do hero e para as cenas de scroll; Lenis como único motor de rolagem suave, ligado ao ScrollTrigger. Pacotes npm em `frontend/`, empacotados pelo esbuild no `public/app.js`.
- `prefers-reduced-motion: reduce`: sem Lenis, sem cenas presas e sem contagem; tudo aparece no estado final.
- Título dividido em palavras com o texto inteiro preservado para leitor de tela.
- Cores e fonte atuais (`--gramado`, `--amarelo`, Poppins).
- Textos novos passam por `stop-slop` e `copy-editing`: sem travessão, sem "não é X, é Y".

## Fica a critério de quem implementa

- Divisão em componentes React e nomes de arquivo.
- Desenho da bola (SVG simples ou ícone) e das setas.
- Ajuste fino de tempos e curvas dentro das faixas acima.
- Comportamento no celular: pode simplificar ou tirar a tela presa e a inclinação se ficarem pesadas.

## Verificação

- `npm run build:front` sem erro e `npm test` verde.
- App local em `http://localhost:3100`: hero, scroll, cards, perfil, doação e escolinha funcionando.
- Teclado, foco visível, animação desativada e largura de celular (390 px) conferidos.
