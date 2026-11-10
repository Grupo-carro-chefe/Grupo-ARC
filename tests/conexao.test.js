'use strict';

const { opcoesDoPool, comTransacao } = require('../src/infra/postgres/conexao');

describe('conexão com o PostgreSQL (sem banco)', () => {
  test('sslmode=require vira SSL com verificação de certificado explícita e sai da URL', () => {
    const opcoes = opcoesDoPool('postgresql://u:p%40ss@host-pooler.neon.tech/db?sslmode=require&channel_binding=require');

    expect(opcoes.ssl).toEqual({ rejectUnauthorized: true });
    expect(opcoes.connectionString).not.toContain('sslmode');
    expect(opcoes.connectionString).toContain('p%40ss');
    expect(opcoes.connectionString).toContain('channel_binding=require');
  });

  test('sem sslmode (Postgres local ou do CI) não usa SSL', () => {
    expect(opcoesDoPool('postgresql://u:p@localhost:5432/db').ssl).toBe(false);
    expect(opcoesDoPool('postgresql://u:p@localhost:5432/db?sslmode=disable').ssl).toBe(false);
  });

  test('aceita opções extras e traz timeout de conexão para o Neon acordar', () => {
    const opcoes = opcoesDoPool('postgresql://u:p@localhost/db', { max: 3 });

    expect(opcoes.max).toBe(3);
    expect(opcoes.connectionTimeoutMillis).toBeGreaterThanOrEqual(10000);
  });

  test('URL inválida dá erro sem repetir o texto recebido (pode ter senha)', () => {
    expect(() => opcoesDoPool('isto-nao-e-url-SENHA123')).toThrow('DATABASE_URL inválida');
    try {
      opcoesDoPool('isto-nao-e-url-SENHA123');
    } catch (erro) {
      expect(erro.message).not.toContain('SENHA123');
    }
  });

  test('comTransacao com cliente já emprestado reaproveita a transação, sem BEGIN próprio', async () => {
    const cliente = { release: jest.fn(), query: jest.fn() };

    const resultado = await comTransacao(cliente, async (db) => {
      expect(db).toBe(cliente);
      return 42;
    });

    expect(resultado).toBe(42);
    expect(cliente.query).not.toHaveBeenCalled();
  });

  test('comTransacao com pool faz BEGIN/COMMIT, ou ROLLBACK se falhar, e sempre devolve a conexão', async () => {
    const cliente = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    const pool = { connect: jest.fn().mockResolvedValue(cliente) };

    await comTransacao(pool, async () => {});
    expect(cliente.query.mock.calls.map((c) => c[0])).toEqual(['BEGIN', 'COMMIT']);

    cliente.query.mockClear();
    await expect(comTransacao(pool, async () => { throw new Error('falhou'); })).rejects.toThrow('falhou');
    expect(cliente.query.mock.calls.map((c) => c[0])).toEqual(['BEGIN', 'ROLLBACK']);
    expect(cliente.release).toHaveBeenCalledTimes(2);
  });

  test('um erro no ROLLBACK não esconde o erro original', async () => {
    const cliente = { query: jest.fn((sql) => (sql === 'ROLLBACK' ? Promise.reject(new Error('rollback falhou')) : Promise.resolve({}))), release: jest.fn() };
    const pool = { connect: jest.fn().mockResolvedValue(cliente) };

    await expect(comTransacao(pool, async () => { throw new Error('original'); })).rejects.toThrow('original');
  });
});

describe('repositório de crianças em memória', () => {
  const { RepositorioCriancasEmMemoria } = require('../src/infra/RepositorioEmMemoria');
  const { novaCrianca, novaNecessidade } = require('./helpers');

  test('buscarPorNecessidadeId acha a criança dona da necessidade, ou null', async () => {
    const repo = new RepositorioCriancasEmMemoria();
    const crianca = novaCrianca();
    const necessidade = novaNecessidade();
    crianca.adicionarNecessidade(necessidade);
    repo.salvar(crianca);

    expect(await repo.buscarPorNecessidadeId(necessidade.id)).toBe(crianca);
    expect(await repo.buscarPorNecessidadeId('outra')).toBeNull();
  });
});
