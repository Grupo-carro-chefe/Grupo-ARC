'use strict';

const { Escolinha } = require('../src/domain/Escolinha');
const { Necessidade, TipoNecessidade } = require('../src/domain/Necessidade');

/**
 * Data 'AAAA-MM-DD' (UTC) de `anos` atrás. Serve só para idades "folgadas" (ex.: 10 anos),
 * que continuam válidas com o passar do tempo; os limites exatos usam jest.useFakeTimers.
 */
function anosAtras(anos) {
  const data = new Date();
  data.setUTCFullYear(data.getUTCFullYear() - anos);
  return data.toISOString().slice(0, 10);
}

/** Dados válidos de uma criança, permitindo sobrescrever campos. */
function dadosCrianca(sobrescrever = {}) {
  return {
    nomeCivil: 'Maria Aparecida da Silva',
    dataNascimento: anosAtras(10),
    apelido: 'Mari',
    endereco: { logradouro: 'Rua das Acácias', numero: '120', bairro: 'Jardim Ângela', cidade: 'São Paulo', uf: 'SP', cep: '04930-000' },
    ...sobrescrever,
  };
}

/** Escolinha já aprovada, pronta para cadastrar crianças. */
function escolinhaAprovada(sobrescrever = {}) {
  const escolinha = new Escolinha({ nome: 'Escolinha Bola Pra Frente', cidade: 'São Paulo', uf: 'SP', ...sobrescrever });
  escolinha.aprovar();
  return escolinha;
}

/** Criança válida de uma escolinha aprovada. */
function novaCrianca(sobrescrever = {}) {
  return escolinhaAprovada().cadastrarCrianca(dadosCrianca(sobrescrever));
}

/** Necessidade válida (chuteira de R$ 150), permitindo sobrescrever campos. */
function novaNecessidade(sobrescrever = {}) {
  return new Necessidade({
    tipo: TipoNecessidade.MATERIAL_ESPORTIVO,
    descricao: 'Chuteira de futsal nº 33',
    valorEstimado: 150,
    ...sobrescrever,
  });
}

module.exports = { anosAtras, dadosCrianca, escolinhaAprovada, novaCrianca, novaNecessidade };
