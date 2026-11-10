# Deploy no Render

O DoaGol roda num único serviço web do Render: a API Express serve também o front-end React já
compilado (`public/`). O plano gratuito é suficiente para a demonstração.

## Criar o serviço (uma vez)

1. Entre em <https://dashboard.render.com> com a conta do GitHub de quem administra o repositório.
2. Clique em **New > Blueprint** e escolha o repositório `Grupo-carro-chefe/Grupo-ARC`, branch `main`.
   O Render lê o [`render.yaml`](../../render.yaml) e mostra o serviço `doagol` com o plano Free.
3. Confirme em **Apply**. O primeiro deploy leva de 2 a 4 minutos.
4. Quando o status ficar **Live**, abra a URL do serviço (algo como `https://doagol.onrender.com`) e
   confira `/saude`, que deve responder `{"status":"ok"}`.
5. Atualize a URL no topo da seção TG3 do README.

### Se o Blueprint pedir cartão de crédito

Crie o serviço à mão, que no plano Free não pede cartão: **New > Web Service**, escolha o repositório e preencha:

| Campo | Valor |
|---|---|
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path (em Advanced) | `/saude` |
| Auto-Deploy (em Settings) | After CI Checks Pass |
| Variável de ambiente | `NODE_VERSION` = `22` |

## Depois de criado

- Cada merge na `main` com a esteira verde publica uma versão nova sozinho.
- O serviço gratuito dorme depois de 15 minutos sem acesso. Antes da apresentação, abra a URL um ou dois
  minutos antes para ele acordar.
- Os dados ficam em memória: a cada reinício voltam os exemplos. Para começar sem eles, defina
  `DADOS_EXEMPLO=false` nas variáveis de ambiente.

## Front-end em outro endereço (opcional)

Se quiserem publicar só o front-end no GitHub Pages, copie a pasta `public/` e, em `public/config.js`,
coloque a URL da API do Render em `window.DOAGOL_API_URL`. A API já responde com CORS liberado.
