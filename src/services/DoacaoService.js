'use strict';

const { Doacao } = require('../domain/Doacao');
const { emCentavos } = require('../domain/validacoes');

/** Pagamento recusado pelo gateway (UC-08, fluxo A1): nada é registrado. */
class PagamentoRecusadoError extends Error {
  constructor() {
    super('Pagamento recusado pelo gateway. Nenhuma doação foi registrada.');
    this.name = 'PagamentoRecusadoError';
  }
}

/** Orquestra o caso de uso Realizar Doação (UC-08) e a emissão do comprovante (UC-09). */
class DoacaoService {
  constructor({ gateway, notificador, doacoes }) {
    this.gateway = gateway;
    this.notificador = notificador;
    this.doacoes = doacoes;
    this._filas = new Map();
  }

  /**
   * Valida tudo antes de cobrar, cobra no gateway (RF07), registra a doação e atualiza a
   * necessidade (RF08), notifica a escolinha (RF09) e devolve o comprovante (UC-09).
   *
   * @param {object} dados
   * @param {import('../domain/Necessidade').Necessidade} dados.necessidade
   * @param {string} dados.escolinhaId  escolinha que recebe a notificação
   * @param {string} dados.doadorId
   * @param {number} dados.valor
   * @param {string} dados.formaPagamento
   * @param {boolean} [dados.anonima]
   * @returns {Promise<object>} comprovante da doação
   */
  async realizar(dados) {
    // Doações para a mesma necessidade rodam uma de cada vez: sem isso, duas doações simultâneas
    // passariam na validação e a segunda seria cobrada e só depois rejeitada por exceder a meta.
    // ponytail: fila em memória, vale só para um processo; com PostgreSQL, trocar por lock na linha.
    const id = dados.necessidade.id;
    const executar = () => this._realizar(dados);
    const atual = (this._filas.get(id) ?? Promise.resolve()).then(executar, executar);
    this._filas.set(id, atual);
    return atual;
  }

  async _realizar({ necessidade, escolinhaId, doadorId, valor, formaPagamento, anonima = false }) {
    const dados = { necessidadeId: necessidade.id, doadorId, valor, formaPagamento, anonima };

    // 1. Nenhuma cobrança acontece com dados inválidos. Daqui em diante vale o valor já
    // arredondado em centavos, para que o valor cobrado seja o mesmo valor registrado.
    const { valor: valorValidado } = new Doacao(dados);
    if (!necessidade.estaAberta()) {
      throw new Error(`Não é possível doar para uma necessidade com status ${necessidade.status}.`);
    }
    if (emCentavos(valorValidado) > emCentavos(necessidade.valorRestante())) {
      throw new Error(`Valor da doação excede o restante da meta (R$ ${necessidade.valorRestante().toFixed(2)}).`);
    }

    // 2. Cobrança. Recusada: nada é gravado nem notificado (A1).
    const pagamento = await this.gateway.processar({ valor: valorValidado, formaPagamento });
    if (!pagamento.aprovado) {
      throw new PagamentoRecusadoError();
    }

    // 3. Registro da doação confirmada. Se o registro falhar, a cobrança é estornada antes de
    // devolver o erro, para o doador nunca pagar por uma doação que não ficou registrada.
    // ponytail: com PostgreSQL, registrar e salvar devem ficar na mesma transação.
    let doacao;
    try {
      doacao = new Doacao({ ...dados, valor: valorValidado, transacaoId: pagamento.transacaoId });
      necessidade.registrarDoacao(doacao.valor);
      this.doacoes.salvar(doacao);
    } catch (erro) {
      await this._estornar(pagamento.transacaoId);
      throw erro;
    }

    // 4. Notificação à escolinha; doação anônima não revela o doador (A2).
    // Uma falha aqui não desfaz a doação já cobrada e registrada: só é registrada no log.
    try {
      await this.notificador.notificarDoacaoRecebida({
        escolinhaId,
        necessidadeId: necessidade.id,
        valor: doacao.valor,
        doador: doacao.identificacaoParaEscolinha(),
      });
    } catch (erro) {
      console.error('Falha ao notificar a escolinha sobre a doação', doacao.id, erro);
    }

    // 5. Comprovante para o doador (UC-09).
    return doacao.gerarComprovante();
  }

  /** Desfaz a cobrança de uma doação que não pôde ser registrada. Uma falha aqui vai para o log. */
  async _estornar(transacaoId) {
    try {
      await this.gateway.estornar(transacaoId);
    } catch (erro) {
      console.error('Falha ao estornar a cobrança', transacaoId, erro);
    }
  }
}

module.exports = { DoacaoService, PagamentoRecusadoError };
