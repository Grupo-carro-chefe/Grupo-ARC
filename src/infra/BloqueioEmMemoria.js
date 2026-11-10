'use strict';

/**
 * Serializa as doações de uma mesma necessidade com uma fila de promises por id, para uso sem
 * banco. Vale só para um processo; com PostgreSQL a trava é `BloqueioPostgres` (linha travada).
 * Mesma interface do `BloqueioPostgres`.
 */
class BloqueioEmMemoria {
  /** @param {{salvar(doacao): *}} doacoes  repositório onde a doação registrada é guardada */
  constructor(doacoes) {
    this.doacoes = doacoes;
    this._filas = new Map();
  }

  /**
   * @param {object} necessidade  objeto vivo, que é alterado direto pelo domínio
   * @param {(atual: object, tx: {registrar(doacao): Promise<void>}) => Promise<*>} trabalho
   */
  async executar(necessidade, trabalho) {
    // Sem a fila, duas doações simultâneas passariam na validação e a segunda seria cobrada e só
    // depois rejeitada por exceder a meta. O `then(executar, executar)` segue a fila mesmo se
    // a anterior falhou.
    const executar = () =>
      trabalho(necessidade, {
        registrar: async (doacao) => {
          necessidade.registrarDoacao(doacao.valor);
          await this.doacoes.salvar(doacao);
        },
      });
    const atual = (this._filas.get(necessidade.id) ?? Promise.resolve()).then(executar, executar);
    this._filas.set(necessidade.id, atual);
    return atual;
  }
}

module.exports = { BloqueioEmMemoria };
