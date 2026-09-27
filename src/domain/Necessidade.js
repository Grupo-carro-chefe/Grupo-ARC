'use strict';

const { randomUUID } = require('crypto');

/**
 * Tipos de necessidade que uma escolinha pode cadastrar para uma criança (RF04).
 */
const TipoNecessidade = Object.freeze({
  MATERIAL_ESPORTIVO: 'MATERIAL_ESPORTIVO',
  FINANCEIRA: 'FINANCEIRA',
  TRANSPORTE: 'TRANSPORTE',
});

/**
 * Ciclo de vida de uma necessidade:
 *   ABERTA  --(meta atingida)-->  ATENDIDA
 *   ABERTA  --(encerrar())----->  ENCERRADA
 */
const StatusNecessidade = Object.freeze({
  ABERTA: 'ABERTA',
  ATENDIDA: 'ATENDIDA',
  ENCERRADA: 'ENCERRADA',
});

/** Arredonda para centavos, evitando erros de ponto flutuante (0.1 + 0.2). */
function emCentavos(valor) {
  return Math.round(valor * 100);
}

function validarValorPositivo(valor, campo) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${campo} deve ser um número maior que zero.`);
  }
  if (Math.abs(valor * 100 - emCentavos(valor)) > 1e-6) {
    throw new Error(`${campo} deve ter no máximo duas casas decimais.`);
  }
}

function validarDescricao(descricao) {
  if (typeof descricao !== 'string' || descricao.trim().length === 0) {
    throw new Error('Descrição é obrigatória.');
  }
}

/**
 * Necessidade concreta de uma criança (ex.: "Chuteira de futsal nº 33"),
 * à qual as doações ficam vinculadas (RF04, RF07, RF08).
 */
class Necessidade {
  /**
   * @param {object} dados
   * @param {string} dados.tipo           um dos valores de TipoNecessidade
   * @param {string} dados.descricao
   * @param {number} dados.valorEstimado  meta em reais (> 0)
   * @param {string} [dados.id]
   */
  constructor({ tipo, descricao, valorEstimado, id = randomUUID() } = {}) {
    if (!Object.values(TipoNecessidade).includes(tipo)) {
      throw new Error(`Tipo de necessidade inválido: ${tipo}.`);
    }
    validarDescricao(descricao);
    validarValorPositivo(valorEstimado, 'Valor estimado');

    this.id = id;
    this.tipo = tipo;
    this.descricao = descricao.trim();
    this._estimadoCentavos = emCentavos(valorEstimado);
    this._arrecadadoCentavos = 0;
    this.status = StatusNecessidade.ABERTA;
  }

  get valorEstimado() {
    return this._estimadoCentavos / 100;
  }

  get valorArrecadado() {
    return this._arrecadadoCentavos / 100;
  }

  estaAberta() {
    return this.status === StatusNecessidade.ABERTA;
  }

  /** Quanto ainda falta para atingir a meta, em reais. */
  valorRestante() {
    return (this._estimadoCentavos - this._arrecadadoCentavos) / 100;
  }

  /** Percentual arrecadado da meta, inteiro de 0 a 100 (barra de progresso do perfil). */
  percentualArrecadado() {
    return Math.floor((this._arrecadadoCentavos * 100) / this._estimadoCentavos);
  }

  /**
   * Registra o valor de uma doação com pagamento já confirmado (RF08).
   * Ao atingir a meta, a necessidade passa automaticamente para ATENDIDA.
   */
  registrarDoacao(valor) {
    if (!this.estaAberta()) {
      throw new Error(`Não é possível doar para uma necessidade com status ${this.status}.`);
    }
    validarValorPositivo(valor, 'Valor da doação');
    if (emCentavos(valor) > this._estimadoCentavos - this._arrecadadoCentavos) {
      throw new Error(`Valor da doação excede o restante da meta (R$ ${this.valorRestante().toFixed(2)}).`);
    }

    this._arrecadadoCentavos += emCentavos(valor);
    if (this._arrecadadoCentavos === this._estimadoCentavos) {
      this.status = StatusNecessidade.ATENDIDA;
    }
    return this.valorArrecadado;
  }

  /** Edita descrição e/ou valor estimado de uma necessidade aberta (RF04). */
  editar({ descricao, valorEstimado } = {}) {
    if (!this.estaAberta()) {
      throw new Error('Só é possível editar necessidades abertas.');
    }
    if (descricao !== undefined) validarDescricao(descricao);
    if (valorEstimado !== undefined) {
      validarValorPositivo(valorEstimado, 'Valor estimado');
      if (emCentavos(valorEstimado) < this._arrecadadoCentavos) {
        throw new Error('Valor estimado não pode ser menor que o valor já arrecadado.');
      }
    }

    if (descricao !== undefined) this.descricao = descricao.trim();
    if (valorEstimado !== undefined) {
      this._estimadoCentavos = emCentavos(valorEstimado);
      if (this._arrecadadoCentavos === this._estimadoCentavos) {
        this.status = StatusNecessidade.ATENDIDA;
      }
    }
  }

  /** Encerra manualmente a necessidade; ela deixa de receber doações (RF04). */
  encerrar() {
    if (!this.estaAberta()) {
      throw new Error(`Necessidade já está ${this.status} e não pode ser encerrada.`);
    }
    this.status = StatusNecessidade.ENCERRADA;
  }
}

module.exports = { Necessidade, TipoNecessidade, StatusNecessidade };
