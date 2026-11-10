'use strict';

const { idValido, linhaParaNecessidade } = require('./mapeadores');

/**
 * Necessidades no PostgreSQL. A necessidade nasce junto da criança (`RepositorioCriancasPostgres.salvar`,
 * que guarda a chave estrangeira); aqui `salvar` só atualiza uma que já existe (descrição e encerramento, nunca o dinheiro).
 * Para doar, não use buscarPorId + salvar: a doação passa por `BloqueioPostgres`, que trava a linha.
 */
class RepositorioNecessidadesPostgres {
  constructor(db) {
    this.db = db;
  }

  /**
   * Atualiza só o que é editável (a descrição) e a passagem para ENCERRADA, que só vale se a
   * necessidade ainda está ABERTA no banco. Nunca grava `valor_arrecadado_centavos` nem volta o
   * status: uma cópia velha em memória apagaria doações. O único caminho que mexe em dinheiro e
   * em ATENDIDA é o `BloqueioPostgres`.
   */
  async salvar(necessidade) {
    const { rowCount } = await this.db.query(
      `UPDATE necessidades
          SET descricao = $2,
              status = CASE WHEN $3 = 'ENCERRADA' AND status = 'ABERTA' THEN 'ENCERRADA' ELSE status END
        WHERE id = $1`,
      [necessidade.id, necessidade.descricao, necessidade.status],
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
