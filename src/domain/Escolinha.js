'use strict';

const { randomUUID } = require('crypto');
const { Crianca } = require('./Crianca');
const { textoObrigatorio, ufValida } = require('./validacoes');

/**
 * Ciclo de cadastro de uma escolinha (UC-02, UC-11):
 *   PENDENTE  --(aprovar())-------->  APROVADA
 *   PENDENTE  --(rejeitar(motivo))->  REJEITADA
 */
const StatusEscolinha = Object.freeze({
  PENDENTE: 'PENDENTE',
  APROVADA: 'APROVADA',
  REJEITADA: 'REJEITADA',
});

/** Escolinha de futebol social que cadastra crianças e necessidades (RF02, RF03). */
class Escolinha {
  /**
   * @param {object} dados
   * @param {string} dados.nome
   * @param {string} dados.cidade
   * @param {string} dados.uf
   * @param {string} [dados.id]
   */
  constructor({ nome, cidade, uf, id = randomUUID() } = {}) {
    this.id = id;
    this.nome = textoObrigatorio(nome, 'Nome');
    this.cidade = textoObrigatorio(cidade, 'Cidade');
    this.uf = ufValida(uf);
    this.status = StatusEscolinha.PENDENTE;
    this.motivoRejeicao = null;
  }

  estaAprovada() {
    return this.status === StatusEscolinha.APROVADA;
  }

  _exigirPendente(acao) {
    if (this.status !== StatusEscolinha.PENDENTE) {
      throw new Error(`Só é possível ${acao} escolinhas pendentes (status atual: ${this.status}).`);
    }
  }

  /** Aprova o cadastro após a validação pelo administrador (UC-11). */
  aprovar() {
    this._exigirPendente('aprovar');
    this.status = StatusEscolinha.APROVADA;
  }

  /** Rejeita o cadastro, registrando o motivo informado pelo administrador (UC-11). */
  rejeitar(motivo) {
    this._exigirPendente('rejeitar');
    this.motivoRejeicao = textoObrigatorio(motivo, 'Motivo da rejeição');
    this.status = StatusEscolinha.REJEITADA;
  }

  /** Cadastra uma criança vinculada a esta escolinha; exige cadastro aprovado (UC-03, RF03). */
  cadastrarCrianca(dados) {
    if (!this.estaAprovada()) {
      throw new Error('A escolinha precisa ter o cadastro aprovado para cadastrar crianças.');
    }
    return new Crianca({ ...dados, escolinhaId: this.id });
  }
}

module.exports = { Escolinha, StatusEscolinha };
