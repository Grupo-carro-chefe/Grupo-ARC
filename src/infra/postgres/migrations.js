'use strict';

const fs = require('fs');
const path = require('path');
const { reverter } = require('./conexao');

const PASTA_PADRAO = path.join(__dirname, '..', '..', '..', 'db', 'migrations');
// Número fixo da trava que serializa migrations e carga de exemplo entre instâncias.
const TRAVA_MIGRATIONS = 726001;

/**
 * Aplica, em ordem de nome, os arquivos .sql ainda não registrados em `schema_migrations`.
 * Idempotente e seguro com várias instâncias subindo juntas: cada migration roda numa transação
 * com `pg_advisory_xact_lock` (vale também por trás do pooler do Neon, ao contrário da trava de
 * sessão). Um arquivo já aplicado nunca é reexecutado.
 * @returns {Promise<string[]>} nomes das migrations aplicadas nesta chamada
 */
async function rodarMigrations(pool, pasta = PASTA_PADRAO) {
  const arquivos = fs.readdirSync(pasta).filter((nome) => nome.endsWith('.sql')).sort();

  const aplicadas = [];
  for (const nome of arquivos) {
    const sql = fs.readFileSync(path.join(pasta, nome), 'utf8');
    const cliente = await pool.connect();
    let falha;
    try {
      await cliente.query('BEGIN');
      await cliente.query('SELECT pg_advisory_xact_lock($1)', [TRAVA_MIGRATIONS]);
      // Dentro da trava: dois processos criando a tabela de controle ao mesmo tempo colidiriam.
      await cliente.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
           nome text PRIMARY KEY,
           aplicada_em timestamptz NOT NULL DEFAULT now()
         )`,
      );
      const { rowCount } = await cliente.query('SELECT 1 FROM schema_migrations WHERE nome = $1', [nome]);
      if (rowCount === 0) {
        await cliente.query(sql);
        await cliente.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [nome]);
        aplicadas.push(nome);
      }
      await cliente.query('COMMIT');
    } catch (erro) {
      falha = erro;
      await reverter(cliente);
      throw erro;
    } finally {
      cliente.release(falha);
    }
  }
  return aplicadas;
}

module.exports = { rodarMigrations, TRAVA_MIGRATIONS };
