'use strict';

const { linhaParaNecessidade, doacaoParaLinha } = require('./mapeadores');
const { emCentavos } = require('../../domain/validacoes');
const { reverter } = require('./conexao');
const { NaoEncontradoError } = require('../../domain/erros');

/**
 * Serializa as doações de uma mesma necessidade com uma transação e `SELECT ... FOR UPDATE` na
 * linha dela: quem chega depois espera o COMMIT de quem chegou antes e então lê o arrecadado
 * já atualizado. Funciona entre vários processos, ao contrário da fila em memória.
 * A doação e o novo arrecadado são gravados na mesma transação (tudo ou nada).
 */
class BloqueioPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * @param {{id: string}} necessidade  só o id é usado: o estado vem do banco, já travado
   * @param {(atual: object, tx: {registrar(doacao): Promise<void>}) => Promise<*>} trabalho
   */
  async executar({ id }, trabalho) {
    const cliente = await this.pool.connect();
    let falha;
    try {
      await cliente.query('BEGIN');
      const { rows } = await cliente.query('SELECT * FROM necessidades WHERE id = $1 FOR UPDATE', [id]);
      if (rows.length === 0) {
        throw new NaoEncontradoError('Necessidade não encontrada.');
      }
      const atual = linhaParaNecessidade(rows[0]);
      const resultado = await trabalho(atual, {
        // Aplica a regra do domínio (status, meta) sobre o estado travado e grava as duas linhas.
        registrar: async (doacao) => {
          atual.registrarDoacao(doacao.valor);
          await cliente.query(
            // Soma no banco (e não grava o total lido): se a trava falhasse um dia, o CHECK da meta
            // barraria o excesso em vez de a última gravação apagar doações anteriores.
            `UPDATE necessidades SET valor_arrecadado_centavos = valor_arrecadado_centavos + $2, status = $3 WHERE id = $1`,
            [atual.id, emCentavos(doacao.valor), atual.status],
          );
          await cliente.query(
            `INSERT INTO doacoes (id, necessidade_id, doador_id, valor_centavos, forma_pagamento, anonima, transacao_id, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            doacaoParaLinha(doacao),
          );
        },
      });
      await cliente.query('COMMIT');
      return resultado;
    } catch (erro) {
      falha = erro;
      await reverter(cliente);
      throw erro;
    } finally {
      // Com erro, release(erro) destrói a conexão em vez de devolvê-la ao pool: ela pode estar
      // quebrada ou com transação aberta, e ninguém mais deve recebê-la.
      cliente.release(falha);
    }
  }
}

module.exports = { BloqueioPostgres };
