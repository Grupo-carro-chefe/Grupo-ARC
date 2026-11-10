'use strict';

const { randomUUID } = require('crypto');
const { Pool } = require('pg');
const { opcoesDoPool } = require('../src/infra/postgres/conexao');

// O Neon fica a algumas centenas de ms de distância: cada teste faz muitas idas e vindas.
jest.setTimeout(120000);

/** Os testes que precisam de PostgreSQL real só rodam com DATABASE_URL_TESTE definida. */
const temBanco = Boolean(process.env.DATABASE_URL_TESTE);
const descreverComBanco = temBanco ? describe : describe.skip;

/**
 * Cria um schema próprio e descartável, para que arquivos de teste rodando em paralelo (e o
 * próprio banco) nunca se misturem. Cada pool aberto aqui usa esse schema.
 */
async function criarBancoDeTeste() {
  const url = process.env.DATABASE_URL_TESTE;
  const schema = `t_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const admin = new Pool(opcoesDoPool(url, { max: 1 }));
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pools = [];

  function abrirPool(extras) {
    // `options` fixa o schema já na abertura da conexão (exige conexão direta, não a do pooler).
    const pool = new Pool(opcoesDoPool(url, { options: `-c search_path=${schema}`, ...extras }));
    pools.push(pool);
    return pool;
  }

  async function encerrar() {
    await Promise.all(pools.map((p) => p.end()));
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }

  return { schema, abrirPool, encerrar };
}

module.exports = { temBanco, descreverComBanco, criarBancoDeTeste };
