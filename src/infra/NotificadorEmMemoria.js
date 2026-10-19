'use strict';

/**
 * Notificador em memória (UC-08, RF09): guarda as notificações em `enviadas`
 * no lugar do serviço de e-mail, que ainda não foi integrado.
 */
class NotificadorEmMemoria {
  constructor() {
    this.enviadas = [];
  }

  /** Avisa a escolinha de que uma necessidade recebeu doação. */
  async notificarDoacaoRecebida(notificacao) {
    this.enviadas.push(notificacao);
  }
}

module.exports = { NotificadorEmMemoria };
