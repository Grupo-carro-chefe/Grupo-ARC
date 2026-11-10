-- Esquema inicial do DoaGol. Dinheiro sempre em centavos inteiros (bigint), nunca float.

CREATE TABLE escolinhas (
  id              uuid PRIMARY KEY,
  nome            text        NOT NULL,
  cidade          text        NOT NULL,
  uf              char(2)     NOT NULL,
  status          text        NOT NULL DEFAULT 'PENDENTE'
                  CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA')),
  motivo_rejeicao text,
  criado_em       timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE criancas (
  id                 uuid PRIMARY KEY,
  escolinha_id       uuid        NOT NULL REFERENCES escolinhas (id),
  apelido            text        NOT NULL,
  -- Dados restritos (RNF01): só saem do banco para a escolinha e a administração.
  nome_civil         text        NOT NULL,
  data_nascimento    date        NOT NULL,
  logradouro         text        NOT NULL,
  numero             text,
  bairro             text,
  cep                text,
  cidade             text        NOT NULL,
  uf                 char(2)     NOT NULL,
  -- Cidade sem acento, em minúsculas: casa com a busca "São Paulo" = "sao paulo" usando índice.
  cidade_normalizada text        NOT NULL,
  criado_em          timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX criancas_busca_idx ON criancas (uf, cidade_normalizada);
CREATE INDEX criancas_escolinha_idx ON criancas (escolinha_id);

CREATE TABLE necessidades (
  id                         uuid PRIMARY KEY,
  crianca_id                 uuid        NOT NULL REFERENCES criancas (id),
  tipo                       text        NOT NULL
                             CHECK (tipo IN ('MATERIAL_ESPORTIVO', 'FINANCEIRA', 'TRANSPORTE')),
  descricao                  text        NOT NULL,
  valor_estimado_centavos    bigint      NOT NULL CHECK (valor_estimado_centavos > 0),
  valor_arrecadado_centavos  bigint      NOT NULL DEFAULT 0 CHECK (valor_arrecadado_centavos >= 0),
  status                     text        NOT NULL DEFAULT 'ABERTA'
                             CHECK (status IN ('ABERTA', 'ATENDIDA', 'ENCERRADA')),
  criado_em                  timestamptz NOT NULL DEFAULT clock_timestamp(),
  -- Última barreira: nem um bug na aplicação deixa arrecadar além da meta.
  CONSTRAINT necessidades_nao_excede_meta CHECK (valor_arrecadado_centavos <= valor_estimado_centavos)
);

CREATE INDEX necessidades_crianca_idx ON necessidades (crianca_id);
-- A busca só olha necessidades abertas, filtradas por tipo.
CREATE INDEX necessidades_abertas_tipo_idx ON necessidades (tipo, crianca_id) WHERE status = 'ABERTA';

CREATE TABLE doacoes (
  id               uuid PRIMARY KEY,
  necessidade_id   uuid        NOT NULL REFERENCES necessidades (id),
  -- Ainda não existe cadastro de doador (UC-01): o identificador vem do front como texto.
  doador_id        text        NOT NULL,
  valor_centavos   bigint      NOT NULL CHECK (valor_centavos > 0),
  forma_pagamento  text        NOT NULL CHECK (forma_pagamento IN ('PIX', 'CARTAO_CREDITO', 'BOLETO')),
  anonima          boolean     NOT NULL DEFAULT false,
  transacao_id     text,
  data             timestamptz NOT NULL
);

CREATE INDEX doacoes_necessidade_idx ON doacoes (necessidade_id);
