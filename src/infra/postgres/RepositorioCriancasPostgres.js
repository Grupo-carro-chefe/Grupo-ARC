'use strict';

const { idValido, linhaParaCrianca, linhaParaNecessidade } = require('./mapeadores');
const { comTransacao } = require('./conexao');
const { emCentavos, normalizar } = require('../../domain/validacoes');

/** Criança com as suas necessidades (o agregado do domínio) no PostgreSQL. */
class RepositorioCriancasPostgres {
  constructor(db) {
    this.db = db;
  }

  /**
   * Grava a criança e INSERE as necessidades novas. Necessidades que já existem não são
   * atualizadas aqui: o objeto em memória pode estar velho (uma doação pode ter mudado o
   * arrecadado depois de a criança ser lida) e gravá-lo apagaria essa doação do total.
   */
  async salvar(crianca) {
    const { nomeCivil, dataNascimento, endereco } = crianca.dadosRestritos();
    await comTransacao(this.db, async (db) => {
      await db.query(
        `INSERT INTO criancas (id, escolinha_id, apelido, nome_civil, data_nascimento, logradouro, numero, bairro, cep,
                               cidade, uf, cidade_normalizada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
           SET apelido = EXCLUDED.apelido, nome_civil = EXCLUDED.nome_civil, data_nascimento = EXCLUDED.data_nascimento,
               logradouro = EXCLUDED.logradouro, numero = EXCLUDED.numero, bairro = EXCLUDED.bairro, cep = EXCLUDED.cep,
               cidade = EXCLUDED.cidade, uf = EXCLUDED.uf, cidade_normalizada = EXCLUDED.cidade_normalizada`,
        [
          crianca.id, crianca.escolinhaId, crianca.apelido, nomeCivil, dataNascimento, endereco.logradouro,
          endereco.numero ?? null, endereco.bairro ?? null, endereco.cep ?? null, endereco.cidade, endereco.uf,
          normalizar(endereco.cidade),
        ],
      );
      for (const n of crianca.necessidades) {
        await db.query(
          `INSERT INTO necessidades (id, crianca_id, tipo, descricao, valor_estimado_centavos, valor_arrecadado_centavos, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [n.id, crianca.id, n.tipo, n.descricao, emCentavos(n.valorEstimado), emCentavos(n.valorArrecadado), n.status],
        );
      }
    });
    return crianca;
  }

  async buscarPorId(id) {
    if (!idValido(id)) return null;
    const criancas = await this._consultar('WHERE c.id = $1', [id]);
    return criancas[0] ?? null;
  }

  /** A criança dona de uma necessidade (chave estrangeira), ou null. */
  async buscarPorNecessidadeId(necessidadeId) {
    if (!idValido(necessidadeId)) return null;
    const criancas = await this._consultar('WHERE c.id = (SELECT crianca_id FROM necessidades WHERE id = $1)', [necessidadeId]);
    return criancas[0] ?? null;
  }

  /**
   * Lista as crianças, filtrando no banco (índices em uf + cidade e em tipo das abertas).
   * @param {object} [filtros]
   * @param {string} [filtros.cidade]  comparada sem acento nem caixa
   * @param {string} [filtros.uf]
   * @param {string} [filtros.tipo]    só crianças com necessidade ABERTA desse tipo
   * @param {boolean} [filtros.comNecessidadeAberta]
   * @param {string} [filtros.escolinhaId]
   */
  async listar({ cidade, uf, tipo, comNecessidadeAberta, escolinhaId } = {}) {
    const condicoes = [];
    const valores = [];
    const param = (valor) => `$${valores.push(valor)}`;
    if (cidade) condicoes.push(`c.cidade_normalizada = ${param(normalizar(cidade))}`);
    if (uf) condicoes.push(`c.uf = ${param(String(uf).trim().toUpperCase())}`);
    if (escolinhaId) {
      if (!idValido(escolinhaId)) return [];
      condicoes.push(`c.escolinha_id = ${param(escolinhaId)}`);
    }
    if (tipo || comNecessidadeAberta) {
      const filtroTipo = tipo ? ` AND n.tipo = ${param(tipo)}` : '';
      condicoes.push(`EXISTS (SELECT 1 FROM necessidades n WHERE n.crianca_id = c.id AND n.status = 'ABERTA'${filtroTipo})`);
    }
    return this._consultar(condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '', valores);
  }

  async _consultar(where, valores) {
    const { rows } = await this.db.query(`SELECT c.*, to_char(c.data_nascimento, 'YYYY-MM-DD') AS data_nascimento_texto FROM criancas c ${where} ORDER BY c.criado_em, c.id`, valores);
    if (rows.length === 0) return [];
    const { rows: linhasNec } = await this.db.query(
      'SELECT * FROM necessidades WHERE crianca_id = ANY($1::uuid[]) ORDER BY criado_em, id',
      [rows.map((r) => r.id)],
    );
    const porCrianca = new Map();
    for (const l of linhasNec) {
      if (!porCrianca.has(l.crianca_id)) porCrianca.set(l.crianca_id, []);
      porCrianca.get(l.crianca_id).push(linhaParaNecessidade(l));
    }
    return rows.map((r) => linhaParaCrianca(r, porCrianca.get(r.id) ?? []));
  }
}

module.exports = { RepositorioCriancasPostgres };
