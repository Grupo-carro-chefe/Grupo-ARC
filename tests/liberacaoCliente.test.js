'use strict';

const { BloqueioPostgres } = require('../src/infra/postgres/BloqueioPostgres');
const { comTransacao } = require('../src/infra/postgres/conexao');
const { rodarMigrations } = require('../src/infra/postgres/migrations');
const { NaoEncontradoError } = require('../src/domain/erros');

function clienteFalso(consulta) {
  return { query: jest.fn(consulta ?? (async () => ({ rows: [] }))), release: jest.fn() };
}

describe('conexão do pool em caso de erro (L4)', () => {
  test('BloqueioPostgres destrói o cliente (release(erro)) quando o trabalho falha, e devolve normal no sucesso', async () => {
    const falha = new Error('queda');
    const cliente = clienteFalso(async (sql) => {
      if (sql.startsWith('SELECT')) throw falha;
      return {};
    });
    const bloqueio = new BloqueioPostgres({ connect: async () => cliente });

    await expect(bloqueio.executar({ id: 'x' }, async () => {})).rejects.toBe(falha);
    expect(cliente.release).toHaveBeenCalledWith(falha);
  });

  test('necessidade inexistente: NaoEncontradoError e cliente destruído', async () => {
    const cliente = clienteFalso();
    const bloqueio = new BloqueioPostgres({ connect: async () => cliente });

    await expect(bloqueio.executar({ id: 'x' }, async () => {})).rejects.toBeInstanceOf(NaoEncontradoError);
    expect(cliente.release).toHaveBeenCalledWith(expect.any(NaoEncontradoError));
  });

  test('comTransacao destrói o cliente no erro e o devolve normalmente no sucesso', async () => {
    const cliente = clienteFalso(async () => ({}));
    const pool = { connect: async () => cliente };
    const falha = new Error('falhou');

    await comTransacao(pool, async () => {});
    expect(cliente.release.mock.calls.at(-1)[0]).toBeUndefined();

    await expect(comTransacao(pool, async () => { throw falha; })).rejects.toBe(falha);
    expect(cliente.release).toHaveBeenLastCalledWith(falha);
  });

  test('rodarMigrations destrói o cliente quando uma migration falha', async () => {
    const falha = new Error('sql ruim');
    const cliente = clienteFalso(async (sql) => {
      if (typeof sql === 'string' && sql.includes('SELECT 1 FROM schema_migrations')) throw falha;
      return { rowCount: 0 };
    });

    await expect(rodarMigrations({ connect: async () => cliente })).rejects.toBe(falha);
    expect(cliente.release).toHaveBeenCalledWith(falha);
  });
});
