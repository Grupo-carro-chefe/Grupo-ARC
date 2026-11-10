'use strict';

const { idValido, linhaParaDoacao, doacaoParaLinha } = require('./mapeadores');

/** Doações no PostgreSQL. São imutáveis (RNF05): só existe inserção, nunca atualização. */
class RepositorioDoacoesPostgres {
  constructor(db) {
    this.db = db;
  }

  async salvar(doacao) {
    await this.db.query(
      `INSERT INTO doacoes (id, necessidade_id, doador_id, valor_centavos, forma_pagamento, anonima, transacao_id, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      doacaoParaLinha(doacao),
    );
    return doacao;
  }

  async buscarPorId(id) {
    if (!idValido(id)) return null;
    const { rows } = await this.db.query('SELECT * FROM doacoes WHERE id = $1', [id]);
    return rows.length ? linhaParaDoacao(rows[0]) : null;
  }

  async listar() {
    const { rows } = await this.db.query('SELECT * FROM doacoes ORDER BY data, id');
    return rows.map(linhaParaDoacao);
  }
}

module.exports = { RepositorioDoacoesPostgres };
