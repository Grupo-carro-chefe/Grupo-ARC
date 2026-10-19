'use strict';

const { randomUUID } = require('crypto');
const { textoObrigatorio, emCentavos } = require('./validacoes');

/** Formas de pagamento aceitas na doação (RF07). */
const FormaPagamento = Object.freeze({
  PIX: 'PIX',
  CARTAO_CREDITO: 'CARTAO_CREDITO',
  BOLETO: 'BOLETO',
});

/**
 * Doação feita a uma necessidade (UC-08, RF07, RF08). Depois de criada, é imutável (RNF05):
 * o histórico de doações serve de trilha de auditoria e não pode ser alterado.
 */
class Doacao {
  /**
   * @param {object} dados
   * @param {string} dados.necessidadeId
   * @param {string} dados.doadorId
   * @param {number} dados.valor           em reais (> 0, no máximo duas casas decimais)
   * @param {string} dados.formaPagamento  um dos valores de FormaPagamento
   * @param {boolean} [dados.anonima]      oculta o doador para a escolinha (UC-08, A2)
   * @param {string|null} [dados.transacaoId]  identificador do gateway de pagamento
   * @param {string} [dados.id]
   * @param {Date} [dados.data]            guardada como texto ISO, para não ser alterada depois
   */
  constructor({
    necessidadeId,
    doadorId,
    valor,
    formaPagamento,
    anonima = false,
    transacaoId = null,
    id = randomUUID(),
    data = new Date(),
  } = {}) {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new Error('Valor da doação deve ser um número maior que zero.');
    }
    if (Math.abs(valor * 100 - emCentavos(valor)) > 1e-6) {
      throw new Error('Valor da doação deve ter no máximo duas casas decimais.');
    }
    if (!Object.values(FormaPagamento).includes(formaPagamento)) {
      throw new Error(`Forma de pagamento inválida: ${formaPagamento}.`);
    }
    if (typeof anonima !== 'boolean') {
      throw new Error('O campo anônima deve ser verdadeiro ou falso.');
    }

    this.id = id;
    this.necessidadeId = textoObrigatorio(necessidadeId, 'Necessidade');
    this.doadorId = textoObrigatorio(doadorId, 'Doador');
    this.valor = emCentavos(valor) / 100;
    this.formaPagamento = formaPagamento;
    this.anonima = anonima;
    this.transacaoId = transacaoId;
    this.data = new Date(data).toISOString();
    Object.freeze(this);
  }

  /** Como o doador aparece para a escolinha: anônimo ou pelo identificador (UC-08, A2). */
  identificacaoParaEscolinha() {
    return this.anonima ? 'Doador anônimo' : this.doadorId;
  }

  /** Comprovante entregue ao doador ao final da doação (UC-09). */
  gerarComprovante() {
    return {
      codigo: `DOA-${this.id.slice(0, 8).toUpperCase()}`,
      doacaoId: this.id,
      necessidadeId: this.necessidadeId,
      doadorId: this.doadorId,
      valor: this.valor,
      formaPagamento: this.formaPagamento,
      anonima: this.anonima,
      transacaoId: this.transacaoId,
      data: this.data,
    };
  }
}

module.exports = { Doacao, FormaPagamento };
