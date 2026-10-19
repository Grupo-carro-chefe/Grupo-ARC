'use strict';

const { randomUUID } = require('crypto');

/**
 * Gateway de pagamento simulado (UC-08, RF07). Aprova ou recusa todas as cobranças,
 * conforme configurado, até a integração com um gateway real.
 */
class GatewayPagamentoSimulado {
  constructor({ aprovar = true } = {}) {
    this.aprovar = aprovar;
  }

  /** @returns {Promise<{aprovado: boolean, transacaoId?: string}>} */
  async processar() {
    return this.aprovar ? { aprovado: true, transacaoId: `SIM-${randomUUID()}` } : { aprovado: false };
  }

  /** Desfaz uma cobrança aprovada. @returns {Promise<{estornado: boolean, transacaoId: string}>} */
  async estornar(transacaoId) {
    return { estornado: true, transacaoId };
  }
}

module.exports = { GatewayPagamentoSimulado };
