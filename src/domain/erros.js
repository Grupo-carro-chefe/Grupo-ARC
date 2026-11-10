'use strict';

/**
 * Violação de uma regra de negócio (valor inválido, status que não permite a operação...).
 * É o único erro cuja mensagem pode ir ao usuário (HTTP 400). Qualquer outro erro é falha
 * interna: a mensagem de erros de banco e de rede pode conter host, usuário ou trechos de SQL.
 */
class RegraNegocioError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'RegraNegocioError';
  }
}

/** Recurso inexistente; vira HTTP 404. */
class NaoEncontradoError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'NaoEncontradoError';
  }
}

module.exports = { RegraNegocioError, NaoEncontradoError };
