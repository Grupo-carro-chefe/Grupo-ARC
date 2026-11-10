'use strict';

const { Escolinha } = require('../../domain/Escolinha');
const { Crianca } = require('../../domain/Crianca');
const { Necessidade } = require('../../domain/Necessidade');
const { Doacao } = require('../../domain/Doacao');
const { emCentavos } = require('../../domain/validacoes');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Um id que não é UUID nunca existe no banco; sem esta checagem o Postgres daria erro 500, e não 404. */
function idValido(id) {
  return typeof id === 'string' && UUID.test(id);
}

function linhaParaEscolinha(l) {
  return Escolinha.reconstituir({
    id: l.id, nome: l.nome, cidade: l.cidade, uf: l.uf, status: l.status, motivoRejeicao: l.motivo_rejeicao,
  });
}

function linhaParaNecessidade(l) {
  return Necessidade.reconstituir({
    id: l.id,
    tipo: l.tipo,
    descricao: l.descricao,
    // bigint chega como texto; centavos cabem folgados em Number.
    estimadoCentavos: Number(l.valor_estimado_centavos),
    arrecadadoCentavos: Number(l.valor_arrecadado_centavos),
    status: l.status,
  });
}

function linhaParaCrianca(l, necessidades) {
  return Crianca.reconstituir({
    id: l.id,
    escolinhaId: l.escolinha_id,
    apelido: l.apelido,
    nomeCivil: l.nome_civil,
    // A consulta traz a data já como texto (data_nascimento_texto), sem passar por fuso horário.
    dataNascimento: l.data_nascimento_texto,
    endereco: {
      logradouro: l.logradouro,
      cidade: l.cidade,
      uf: l.uf,
      // Campos opcionais só entram se foram informados, como no cadastro original.
      ...(l.numero !== null && { numero: l.numero }),
      ...(l.bairro !== null && { bairro: l.bairro }),
      ...(l.cep !== null && { cep: l.cep }),
    },
    necessidades,
  });
}

function linhaParaDoacao(l) {
  return new Doacao({
    id: l.id,
    necessidadeId: l.necessidade_id,
    doadorId: l.doador_id,
    valor: Number(l.valor_centavos) / 100,
    formaPagamento: l.forma_pagamento,
    anonima: l.anonima,
    transacaoId: l.transacao_id,
    data: l.data,
  });
}

/** Valores da doação na ordem das colunas de `INSERT INTO doacoes`. */
function doacaoParaLinha(d) {
  return [d.id, d.necessidadeId, d.doadorId, emCentavos(d.valor), d.formaPagamento, d.anonima, d.transacaoId, d.data];
}

module.exports = { idValido, linhaParaEscolinha, linhaParaNecessidade, linhaParaCrianca, linhaParaDoacao, doacaoParaLinha };
