'use strict';

const { Pool } = require('pg');

/**
 * Converte a connection string em opções do `pg` sem nunca expor a string (ela tem a senha).
 * Se a URL pede SSL (`sslmode` diferente de `disable`), liga o SSL com verificação do
 * certificado explicitamente: o `pg` trata `sslmode=require` como `verify-full` e avisa a cada
 * conexão, então o parâmetro sai da URL e o comportamento fica declarado aqui.
 */
function opcoesDoPool(connectionString, extras = {}) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    // Sem repassar o erro original: a mensagem poderia carregar a string com a senha.
    throw new Error('DATABASE_URL inválida: esperado o formato postgresql://usuario:senha@host/banco.');
  }
  const sslmode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');
  const usaSsl = sslmode !== null && sslmode !== 'disable';
  return {
    connectionString: url.toString(),
    ssl: usaSsl ? { rejectUnauthorized: true } : false,
    // O Neon pode levar alguns segundos para acordar na primeira conexão.
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
    ...extras,
  };
}

function criarPool(connectionString, extras) {
  const pool = new Pool(opcoesDoPool(connectionString, extras));
  // Sem isto, uma conexão ociosa derrubada pelo servidor (Neon escala a zero) mataria o processo.
  pool.on('error', (erro) => {
    console.error('Conexão ociosa com o banco falhou:', erro.code ?? erro.name);
  });
  return pool;
}

/** Desfaz a transação do cliente; se a conexão já caiu, o erro original é o que importa. */
async function reverter(cliente) {
  try {
    await cliente.query('ROLLBACK');
  } catch {
    // nada a fazer: o servidor descarta a transação junto com a conexão
  }
}

/**
 * Roda `fn` numa transação. Com um Pool abre e fecha a própria conexão; com um cliente já em
 * transação (ex.: a carga de dados de exemplo) reaproveita a transação existente.
 */
async function comTransacao(db, fn) {
  // Um cliente já emprestado do pool (tem `release`) está dentro de uma transação de quem o chamou.
  if (typeof db.release === 'function') {
    return fn(db);
  }
  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await reverter(cliente);
    throw erro;
  } finally {
    cliente.release();
  }
}

module.exports = { opcoesDoPool, criarPool, comTransacao, reverter };
