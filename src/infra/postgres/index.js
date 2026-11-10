'use strict';

const { criarPool, comTransacao } = require('./conexao');
const { rodarMigrations } = require('./migrations');
const { RepositorioEscolinhasPostgres } = require('./RepositorioEscolinhasPostgres');
const { RepositorioCriancasPostgres } = require('./RepositorioCriancasPostgres');
const { RepositorioNecessidadesPostgres } = require('./RepositorioNecessidadesPostgres');
const { RepositorioDoacoesPostgres } = require('./RepositorioDoacoesPostgres');
const { BloqueioPostgres } = require('./BloqueioPostgres');
const { carregarDadosExemplo } = require('../dadosExemplo');

// Trava da carga de exemplo (distinta da das migrations): duas instâncias subindo juntas
// não semeiam o banco duas vezes.
const TRAVA_SEMENTE = 726002;

/** Repositórios (sobre um Pool ou um cliente) no formato esperado por `criarApp`. */
function criarRepositoriosPostgres(db) {
  return {
    escolinhas: new RepositorioEscolinhasPostgres(db),
    criancas: new RepositorioCriancasPostgres(db),
    necessidades: new RepositorioNecessidadesPostgres(db),
    doacoes: new RepositorioDoacoesPostgres(db),
  };
}

/**
 * Carrega os dados de exemplo SÓ se o banco ainda não tem nenhuma escolinha, numa transação
 * única (tudo ou nada) e sob trava. Nunca duplica e nunca mexe num banco que já tem dados.
 * @returns {Promise<boolean>} true se semeou
 */
async function semearSeVazio(pool, carregar = carregarDadosExemplo) {
  return comTransacao(pool, async (cliente) => {
    await cliente.query('SELECT pg_advisory_xact_lock($1)', [TRAVA_SEMENTE]);
    const { rows } = await cliente.query('SELECT EXISTS (SELECT 1 FROM escolinhas) AS existe');
    if (rows[0].existe) {
      return false;
    }
    await carregar(criarRepositoriosPostgres(cliente));
    return true;
  });
}

/** Conecta, aplica as migrations e devolve tudo o que `criarApp` precisa, mais o pool para encerrar. */
async function iniciarPostgres(connectionString, { semear = false, opcoesPool } = {}) {
  const pool = criarPool(connectionString, opcoesPool);
  try {
    await rodarMigrations(pool);
    const semeou = semear ? await semearSeVazio(pool) : false;
    return { pool, semeou, repositorios: criarRepositoriosPostgres(pool), bloqueio: new BloqueioPostgres(pool) };
  } catch (erro) {
    await pool.end();
    throw erro;
  }
}

module.exports = { criarRepositoriosPostgres, semearSeVazio, iniciarPostgres, TRAVA_SEMENTE };
