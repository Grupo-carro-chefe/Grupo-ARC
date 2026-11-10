'use strict';

const { idValido, linhaParaNecessidade } = require('./mapeadores');
const { emCentavos } = require('../../domain/validacoes');

/**
 * Necessidades no PostgreSQL. A necessidade nasce junto da criança (`RepositorioCriancasPostgres.salvar`,
 * que guarda a chave estrangeira); aqui `salvar` só atualiza uma que já existe.
 * Para doar, não use buscarPorId + salvar: a doação passa por `BloqueioPostgres`, que trava a linha.
 */
class RepositorioNecessidadesPostgres {
  constructor(db) {
    this.db = db;
  }

  async salvar(necessidade) {
    const { rowCount } = await this.db.query(
      `UPDATE necessidades
          SET descricao = $2, valor_estimado_centavos = $3, valor_arrecadado_centavos = $4, status = $5
        WHERE id = $1`,
      [
        necessidade.id,
        necessidade.descricao,
        emCentavos(necessidade.valorEstimado),
        emCentavos(necessidade.valorArrecadado),
        necessidade.status,
      ],
    );
    if (rowCount === 0) {
      throw new Error('Necessidade não vinculada a uma criança: salve a criança antes.');
    }
    return necessidade;
  }

  async buscarPorId(id) {
    if (!idValido(id)) return null;
    const { rows } = await this.db.query('SELECT * FROM necessidades WHERE id = $1', [id]);
    return rows.length ? linhaParaNecessidade(rows[0]) : null;
  }

  async listar() {
    const { rows } = await this.db.query('SELECT * FROM necessidades ORDER BY criado_em, id');
    return rows.map(linhaParaNecessidade);
  }
}

module.exports = { RepositorioNecessidadesPostgres };
