'use strict';

const { Doacao } = require('../domain/Doacao');
const { emCentavos } = require('../domain/validacoes');
const { RegraNegocioError } = require('../domain/erros');
const { BloqueioEmMemoria } = require('../infra/BloqueioEmMemoria');

/** Pagamento recusado pelo gateway (UC-08, fluxo A1): nada é registrado. */
class PagamentoRecusadoError extends Error {
  constructor() {
    super('Pagamento recusado pelo gateway. Nenhuma doação foi registrada.');
    this.name = 'PagamentoRecusadoError';
  }
}

/** Orquestra o caso de uso Realizar Doação (UC-08) e a emissão do comprovante (UC-09). */
class DoacaoService {
  /**
   * @param {object} dependencias
   * @param {object} dependencias.gateway
   * @param {object} dependencias.notificador
   * @param {{salvar(doacao): *}} dependencias.doacoes
   * @param {{executar(necessidade, trabalho): Promise<*>}} [dependencias.bloqueio]  serializa as
   *   doações de uma necessidade e grava a doação junto com o arrecadado. Sem informar, usa a
   *   fila em memória (um processo só); com PostgreSQL, `BloqueioPostgres` (linha travada).
   */
  constructor({ gateway, notificador, doacoes, bloqueio }) {
    this.gateway = gateway;
    this.notificador = notificador;
    this.doacoes = doacoes;
    this.bloqueio = bloqueio ?? new BloqueioEmMemoria({ salvar: (doacao) => this.doacoes.salvar(doacao) });
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
  async realizar({ necessidade, escolinhaId, doadorId, valor, formaPagamento, anonima = false }) {
    const dados = { necessidadeId: necessidade.id, doadorId, valor, formaPagamento, anonima };
    let pagamento = null;
    let doacao;

    // Doações para a mesma necessidade rodam uma de cada vez (ver `bloqueio`): sem isso, duas
    // doações simultâneas passariam na validação e a segunda seria cobrada e só depois rejeitada
    // por exceder a meta. Dentro do bloqueio, `atual` é a necessidade no estado mais recente.
    try {
      doacao = await this.bloqueio.executar(necessidade, async (atual, tx) => {
        // 1. Nenhuma cobrança acontece com dados inválidos. Daqui em diante vale o valor já
        // arredondado em centavos, para que o valor cobrado seja o mesmo valor registrado.
        const { valor: valorValidado } = new Doacao(dados);
        if (!atual.estaAberta()) {
          throw new RegraNegocioError(`Não é possível doar para uma necessidade com status ${atual.status}.`);
        }
        if (emCentavos(valorValidado) > emCentavos(atual.valorRestante())) {
          throw new RegraNegocioError(`Valor da doação excede o restante da meta (R$ ${atual.valorRestante().toFixed(2)}).`);
        }

        // 2. Cobrança. Recusada: nada é gravado nem notificado (A1).
        pagamento = await this.gateway.processar({ valor: valorValidado, formaPagamento });
        if (!pagamento.aprovado) {
          throw new PagamentoRecusadoError();
        }

        // 3. Registro da doação confirmada, na mesma unidade do arrecadado (no PostgreSQL, a mesma
        // transação).
        const nova = new Doacao({ ...dados, valor: valorValidado, transacaoId: pagamento.transacaoId });
        await tx.registrar(nova);
        return nova;
      });
    } catch (erro) {
      // Se o registro (ou o COMMIT) falhou depois da cobrança, ela é estornada antes de devolver
      // o erro, para o doador nunca pagar por uma doação que não ficou registrada.
      if (pagamento?.aprovado) {
        await this._estornar(pagamento.transacaoId);
      }
      throw erro;
    }

    // 4. Notificação à escolinha; doação anônima não revela o doador (A2). Já com a doação
    // confirmada. Uma falha aqui não desfaz a doação já cobrada e registrada: só vai para o log.
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
