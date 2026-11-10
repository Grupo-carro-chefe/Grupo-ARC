'use strict';

const request = require('supertest');
const { criarApp } = require('../src/api/app');
const { RegraNegocioError, NaoEncontradoError } = require('../src/domain/erros');
const { Necessidade } = require('../src/domain/Necessidade');
const { Doacao } = require('../src/domain/Doacao');
const { Escolinha } = require('../src/domain/Escolinha');
const { Crianca } = require('../src/domain/Crianca');
const { BuscaService } = require('../src/services/BuscaService');
const { DoacaoService } = require('../src/services/DoacaoService');
const { RepositorioEmMemoria } = require('../src/infra/RepositorioEmMemoria');
const { GatewayPagamentoSimulado } = require('../src/infra/GatewayPagamentoSimulado');
const { NotificadorEmMemoria } = require('../src/infra/NotificadorEmMemoria');
const { novaNecessidade, novaCrianca } = require('./helpers');

describe('RegraNegocioError', () => {
  test('é um Error com nome próprio e mantém a mensagem', () => {
    const erro = new RegraNegocioError('regra quebrada');

    expect(erro).toBeInstanceOf(Error);
    expect(erro.name).toBe('RegraNegocioError');
    expect(erro.message).toBe('regra quebrada');
  });

  test('as regras do domínio lançam RegraNegocioError', () => {
    const casos = [
      () => new Necessidade({ tipo: 'XYZ', descricao: 'a', valorEstimado: 10 }),
      () => novaNecessidade().registrarDoacao(9999),
      () => new Doacao({ necessidadeId: 'n', doadorId: 'd', valor: -1, formaPagamento: 'PIX' }),
      () => new Escolinha({ nome: '', cidade: 'x', uf: 'SP' }),
      () => new Escolinha({ nome: 'a', cidade: 'x', uf: 'SP' }).cadastrarCrianca({}),
      () => novaCrianca().adicionarNecessidade({}),
    ];
    for (const caso of casos) {
      expect(caso).toThrow(RegraNegocioError);
    }
    expect(Crianca).toBeDefined();
  });

  test('as regras dos serviços lançam RegraNegocioError', async () => {
    const busca = new BuscaService({ criancas: new RepositorioEmMemoria() });
    await expect(busca.buscar({ tipo: 'XYZ' })).rejects.toThrow(RegraNegocioError);

    const doacoes = new RepositorioEmMemoria();
    const servico = new DoacaoService({ gateway: new GatewayPagamentoSimulado(), notificador: new NotificadorEmMemoria(), doacoes });
    const necessidade = novaNecessidade({ valorEstimado: 50 });
    await expect(
      servico.realizar({ necessidade, escolinhaId: 'e', doadorId: 'd', valor: 80, formaPagamento: 'PIX' }),
    ).rejects.toThrow(RegraNegocioError);
  });

  test('NaoEncontradoError vem do mesmo módulo de erros', () => {
    expect(new NaoEncontradoError('x')).toBeInstanceOf(Error);
  });
});

describe('tratador de erros da API: falhas de infraestrutura não vazam', () => {
  const falhas = [
    new Error('Connection terminated unexpectedly'),
    new Error('timeout exceeded when trying to connect'),
    Object.assign(new Error('getaddrinfo ENOTFOUND ep-segredo-123.neon.tech'), { code: 'ENOTFOUND' }),
    Object.assign(new Error('password authentication failed for user "dono"'), { code: '28P01' }),
  ];

  test.each(falhas.map((f) => [f.message, f]))('%s vira 500 genérico', async (mensagem, falha) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const escolinhas = { listar: () => { throw falha; }, salvar: () => {}, buscarPorId: () => null };
    const app = criarApp({ repositorios: { escolinhas } });

    const res = await request(app).get('/escolinhas');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ erro: 'Erro interno.' });
    expect(JSON.stringify(res.body)).not.toContain(mensagem);
    // O log registra a classe e o código, nunca a mensagem bruta (pode ter host e usuário).
    expect(JSON.stringify(log.mock.calls)).not.toContain(mensagem);
    expect(JSON.stringify(log.mock.calls)).toContain(falha.code ?? 'Error');
    log.mockRestore();
  });

  test('regra de negócio continua 400 com a mensagem e erro programático (TypeError) vira 500 com o erro no log', async () => {
    const app = criarApp();
    const regra = await request(app).post('/escolinhas').send({ nome: '', cidade: 'x', uf: 'SP' });
    expect(regra.status).toBe(400);
    expect(regra.body).toEqual({ erro: 'Nome é obrigatório.' });

    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const escolinhas = { listar: () => { throw new TypeError('x é indefinido'); } };
    const res = await request(criarApp({ repositorios: { escolinhas } })).get('/escolinhas');
    expect(res.status).toBe(500);
    expect(log).toHaveBeenCalledWith(expect.any(TypeError));
    log.mockRestore();
  });
});
