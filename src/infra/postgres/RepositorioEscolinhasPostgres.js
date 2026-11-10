'use strict';

const { idValido, linhaParaEscolinha } = require('./mapeadores');

/** Escolinhas no PostgreSQL. Mesma interface do RepositorioEmMemoria, mas assíncrona. */
class RepositorioEscolinhasPostgres {
  /** @param {{query: Function}} db  Pool ou cliente do `pg` */
  constructor(db) {
    this.db = db;
  }

  async salvar(escolinha) {
    await this.db.query(
      `INSERT INTO escolinhas (id, nome, cidade, uf, status, motivo_rejeicao)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET nome = EXCLUDED.nome, cidade = EXCLUDED.cidade, uf = EXCLUDED.uf,
             status = EXCLUDED.status, motivo_rejeicao = EXCLUDED.motivo_rejeicao`,
      [escolinha.id, escolinha.nome, escolinha.cidade, escolinha.uf, escolinha.status, escolinha.motivoRejeicao],
    );
    return escolinha;
  }

  async buscarPorId(id) {
    if (!idValido(id)) return null;
    const { rows } = await this.db.query('SELECT * FROM escolinhas WHERE id = $1', [id]);
    return rows.length ? linhaParaEscolinha(rows[0]) : null;
  }

  async listar() {
    const { rows } = await this.db.query('SELECT * FROM escolinhas ORDER BY criado_em, id');
    return rows.map(linhaParaEscolinha);
  }
}

module.exports = { RepositorioEscolinhasPostgres };
