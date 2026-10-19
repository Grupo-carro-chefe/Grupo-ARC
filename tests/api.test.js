'use strict';

const request = require('supertest');
const { criarApp } = require('../src/api/app');
const { GatewayPagamentoSimulado } = require('../src/infra/GatewayPagamentoSimulado');
const { NotificadorEmMemoria } = require('../src/infra/NotificadorEmMemoria');
const { dadosCrianca } = require('./helpers');

const ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000';

/** Sobe o fluxo até a criança com uma necessidade de R$ 150 e devolve os ids. */
async function prepararNecessidade(app) {
  const escolinha = (await request(app).post('/escolinhas').send({ nome: 'Bola Pra Frente', cidade: 'São Paulo', uf: 'SP' })).body;
  await request(app).post(`/escolinhas/${escolinha.id}/aprovar`);
  const crianca = (await request(app).post(`/escolinhas/${escolinha.id}/criancas`).send(dadosCrianca())).body;
  const comNecessidade = (await request(app)
    .post(`/criancas/${crianca.id}/necessidades`)
    .send({ tipo: 'MATERIAL_ESPORTIVO', descricao: 'Chuteira de futsal nº 33', valorEstimado: 150 })).body;
  return { escolinha, crianca, necessidade: comNecessidade.necessidades[0] };
}

function semDadosSensiveis(res) {
  const texto = JSON.stringify(res.body);
  expect(texto).not.toContain('Maria Aparecida');
  expect(texto).not.toContain('Rua das Acácias');
  expect(texto).not.toContain('04930-000');
}

describe('API REST', () => {
  let app;
  let notificador;

  beforeEach(() => {
    notificador = new NotificadorEmMemoria();
    app = criarApp({ notificador });
  });

  test('GET /saude responde 200', async () => {
    const res = await request(app).get('/saude');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('criarApp() sem argumentos usa gateway e notificador simulados', async () => {
    const res = await request(criarApp()).get('/saude');

    expect(res.status).toBe(200);
  });

  test.each([
    ['cadastro de criança', ({ escolinha }) => `/escolinhas/${escolinha.id}/criancas`, 'Nome civil é obrigatório.'],
    ['cadastro de necessidade', ({ crianca }) => `/criancas/${crianca.id}/necessidades`, 'Tipo de necessidade inválido: undefined.'],
    ['doação', ({ necessidade }) => `/necessidades/${necessidade.id}/doacoes`, 'Valor da doação deve ser um número maior que zero.'],
  ])('POST sem corpo no %s responde 400, não 500', async (_nome, rota, erro) => {
    const res = await request(app).post(rota(await prepararNecessidade(app)));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro });
  });

  // ---------------------------------------------------------------------
  // UC-02 e UC-11: escolinhas
  // ---------------------------------------------------------------------
  describe('escolinhas (UC-02, UC-11)', () => {
    test('POST /escolinhas cria escolinha PENDENTE (201)', async () => {
      const res = await request(app).post('/escolinhas').send({ nome: 'Bola Pra Frente', cidade: 'Recife', uf: 'pe' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(String), nome: 'Bola Pra Frente', cidade: 'Recife', uf: 'PE', status: 'PENDENTE', motivoRejeicao: null });
    });

    test('POST /escolinhas ignora id e status enviados pelo cliente', async () => {
      const res = await request(app).post('/escolinhas').send({ id: 'meu-id', status: 'APROVADA', nome: 'X', cidade: 'Recife', uf: 'PE' });

      expect(res.body.id).not.toBe('meu-id');
      expect(res.body.status).toBe('PENDENTE');
    });

    test('POST /escolinhas com dados inválidos responde 400', async () => {
      const res = await request(app).post('/escolinhas').send({ nome: 'X', cidade: 'Recife', uf: 'ZZ' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'UF inválida: ZZ.' });
    });

    test('POST /escolinhas sem corpo responde 400, não 500', async () => {
      const res = await request(app).post('/escolinhas');

      expect(res.status).toBe(400);
      expect(res.body.erro).toBe('Nome é obrigatório.');
    });

    test('POST /escolinhas com JSON malformado responde 400', async () => {
      const res = await request(app).post('/escolinhas').set('Content-Type', 'application/json').send('{"nome": ');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'JSON inválido.' });
    });

    test('POST /escolinhas/:id/aprovar aprova (200)', async () => {
      const { id } = (await request(app).post('/escolinhas').send({ nome: 'X', cidade: 'Recife', uf: 'PE' })).body;
      const res = await request(app).post(`/escolinhas/${id}/aprovar`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APROVADA');
    });

    test('POST /escolinhas/:id/aprovar duas vezes responde 400', async () => {
      const { id } = (await request(app).post('/escolinhas').send({ nome: 'X', cidade: 'Recife', uf: 'PE' })).body;
      await request(app).post(`/escolinhas/${id}/aprovar`);
      const res = await request(app).post(`/escolinhas/${id}/aprovar`);

      expect(res.status).toBe(400);
      expect(res.body.erro).toMatch(/status atual: APROVADA/);
    });

    test('POST /escolinhas/:id/aprovar de escolinha inexistente responde 404', async () => {
      const res = await request(app).post(`/escolinhas/${ID_INEXISTENTE}/aprovar`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Escolinha não encontrada.' });
    });
  });

  // ---------------------------------------------------------------------
  // UC-03: cadastrar criança
  // ---------------------------------------------------------------------
  describe('cadastrar criança (UC-03)', () => {
    let escolinhaId;

    beforeEach(async () => {
      escolinhaId = (await request(app).post('/escolinhas').send({ nome: 'X', cidade: 'São Paulo', uf: 'SP' })).body.id;
    });

    test('escolinha pendente não cadastra criança (400)', async () => {
      const res = await request(app).post(`/escolinhas/${escolinhaId}/criancas`).send(dadosCrianca());

      expect(res.status).toBe(400);
      expect(res.body.erro).toBe('A escolinha precisa ter o cadastro aprovado para cadastrar crianças.');
    });

    test('escolinha aprovada cadastra (201) e a resposta é o perfil público, sem dados sensíveis', async () => {
      await request(app).post(`/escolinhas/${escolinhaId}/aprovar`);
      const res = await request(app).post(`/escolinhas/${escolinhaId}/criancas`).send(dadosCrianca());

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String), apelido: 'Mari', idade: expect.any(Number), escolinhaId, cidade: 'São Paulo', uf: 'SP', necessidades: [],
      });
      semDadosSensiveis(res);
    });

    test('ignora escolinhaId e id enviados no corpo', async () => {
      await request(app).post(`/escolinhas/${escolinhaId}/aprovar`);
      const res = await request(app).post(`/escolinhas/${escolinhaId}/criancas`).send(dadosCrianca({ id: 'x', escolinhaId: 'outra' }));

      expect(res.body.id).not.toBe('x');
      expect(res.body.escolinhaId).toBe(escolinhaId);
    });

    test.each([
      ['data inexistente', { dataNascimento: '2020-02-31' }, 'Data de nascimento inexistente: 2020-02-31.'],
      ['maior de idade', { dataNascimento: '1990-01-01' }, 'O DoaGol atende apenas menores de 18 anos.'],
      ['sem endereço', { endereco: undefined }, 'Endereço é obrigatório.'],
    ])('dados inválidos (A1): %s responde 400', async (_nome, dados, erro) => {
      await request(app).post(`/escolinhas/${escolinhaId}/aprovar`);
      const res = await request(app).post(`/escolinhas/${escolinhaId}/criancas`).send(dadosCrianca(dados));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro });
    });

    test('escolinha inexistente responde 404', async () => {
      const res = await request(app).post(`/escolinhas/${ID_INEXISTENTE}/criancas`).send(dadosCrianca());

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Escolinha não encontrada.' });
    });
  });

  // ---------------------------------------------------------------------
  // UC-04 e UC-07: necessidades e perfil
  // ---------------------------------------------------------------------
  describe('necessidades e perfil (UC-04, UC-07)', () => {
    test('POST /criancas/:id/necessidades cadastra (201) e devolve a criança', async () => {
      const { crianca, necessidade } = await prepararNecessidade(app);

      expect(necessidade).toEqual({
        id: expect.any(String), tipo: 'MATERIAL_ESPORTIVO', descricao: 'Chuteira de futsal nº 33', valorEstimado: 150, valorArrecadado: 0, percentual: 0,
      });
      const perfil = await request(app).get(`/criancas/${crianca.id}`);
      expect(perfil.body.necessidades).toEqual([necessidade]);
    });

    test('necessidade inválida responde 400', async () => {
      const { crianca } = await prepararNecessidade(app);
      const res = await request(app).post(`/criancas/${crianca.id}/necessidades`).send({ tipo: 'COMIDA', descricao: 'x', valorEstimado: 10 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'Tipo de necessidade inválido: COMIDA.' });
    });

    test('necessidade para criança inexistente responde 404', async () => {
      const res = await request(app).post(`/criancas/${ID_INEXISTENTE}/necessidades`).send({ tipo: 'FINANCEIRA', descricao: 'x', valorEstimado: 10 });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Criança não encontrada.' });
    });

    test('GET /criancas/:id devolve o perfil público (200) sem dados sensíveis', async () => {
      const { crianca } = await prepararNecessidade(app);
      const res = await request(app).get(`/criancas/${crianca.id}`);

      expect(res.status).toBe(200);
      expect(res.body.apelido).toBe('Mari');
      semDadosSensiveis(res);
    });

    test('GET /criancas/:id inexistente responde 404', async () => {
      const res = await request(app).get(`/criancas/${ID_INEXISTENTE}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Criança não encontrada.' });
    });
  });

  // ---------------------------------------------------------------------
  // UC-06: busca
  // ---------------------------------------------------------------------
  describe('busca (UC-06)', () => {
    test('GET /criancas filtra por cidade, UF e tipo (200) sem dados sensíveis', async () => {
      const { crianca } = await prepararNecessidade(app);
      const res = await request(app).get('/criancas').query({ cidade: 'sao paulo', uf: 'sp', tipo: 'MATERIAL_ESPORTIVO' });

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.resultados[0].id).toBe(crianca.id);
      expect(res.body).not.toHaveProperty('mensagem');
      semDadosSensiveis(res);
    });

    test('nenhum resultado (A1) traz total 0 e mensagem de orientação', async () => {
      await prepararNecessidade(app);
      const res = await request(app).get('/criancas?uf=AM');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 0, resultados: [], mensagem: 'Nenhuma criança encontrada. Tente remover algum filtro.' });
    });

    test('tipo inválido responde 400', async () => {
      const res = await request(app).get('/criancas?tipo=COMIDA');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'Tipo de necessidade inválido: COMIDA.' });
    });
  });

  // ---------------------------------------------------------------------
  // UC-08 e UC-09: doação e comprovante
  // ---------------------------------------------------------------------
  describe('doação (UC-08, UC-09)', () => {
    test('POST /necessidades/:id/doacoes devolve o comprovante (201) e atualiza o progresso', async () => {
      const { crianca, necessidade, escolinha } = await prepararNecessidade(app);
      const res = await request(app).post(`/necessidades/${necessidade.id}/doacoes`).send({ doadorId: 'doador-1', valor: 60, formaPagamento: 'PIX' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ codigo: expect.stringMatching(/^DOA-/), necessidadeId: necessidade.id, valor: 60, formaPagamento: 'PIX', anonima: false });
      expect(notificador.enviadas).toEqual([{ escolinhaId: escolinha.id, necessidadeId: necessidade.id, valor: 60, doador: 'doador-1' }]);
      const perfil = await request(app).get(`/criancas/${crianca.id}`);
      expect(perfil.body.necessidades[0]).toMatchObject({ valorArrecadado: 60, percentual: 40 });
    });

    test('doação anônima (A2) não revela o doador à escolinha', async () => {
      const { necessidade } = await prepararNecessidade(app);
      const res = await request(app).post(`/necessidades/${necessidade.id}/doacoes`).send({ doadorId: 'doador-1', valor: 10, formaPagamento: 'BOLETO', anonima: true });

      expect(res.status).toBe(201);
      expect(res.body.anonima).toBe(true);
      expect(notificador.enviadas[0].doador).toBe('Doador anônimo');
    });

    test('necessidade atendida some da busca', async () => {
      const { necessidade } = await prepararNecessidade(app);
      await request(app).post(`/necessidades/${necessidade.id}/doacoes`).send({ doadorId: 'd', valor: 150, formaPagamento: 'PIX' });

      expect((await request(app).get('/criancas')).body.total).toBe(0);
    });

    test('valor acima do restante responde 400', async () => {
      const { necessidade } = await prepararNecessidade(app);
      const res = await request(app).post(`/necessidades/${necessidade.id}/doacoes`).send({ doadorId: 'd', valor: 200, formaPagamento: 'PIX' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'Valor da doação excede o restante da meta (R$ 150.00).' });
    });

    test('necessidade inexistente responde 404', async () => {
      const res = await request(app).post(`/necessidades/${ID_INEXISTENTE}/doacoes`).send({ doadorId: 'd', valor: 10, formaPagamento: 'PIX' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Necessidade não encontrada.' });
    });

    test('pagamento recusado (A1) responde 402 e nada é registrado', async () => {
      const appRecusa = criarApp({ gateway: new GatewayPagamentoSimulado({ aprovar: false }), notificador });
      const { crianca, necessidade } = await prepararNecessidade(appRecusa);
      const res = await request(appRecusa).post(`/necessidades/${necessidade.id}/doacoes`).send({ doadorId: 'd', valor: 60, formaPagamento: 'CARTAO_CREDITO' });

      expect(res.status).toBe(402);
      expect(res.body).toEqual({ erro: 'Pagamento recusado pelo gateway. Nenhuma doação foi registrada.' });
      expect(notificador.enviadas).toEqual([]);
      const perfil = await request(appRecusa).get(`/criancas/${crianca.id}`);
      expect(perfil.body.necessidades[0].valorArrecadado).toBe(0);
    });

    test('falha inesperada responde 500 sem expor detalhes', async () => {
      const gateway = { processar: () => { throw new TypeError('cannot read properties of undefined'); } };
      const appComDefeito = criarApp({ gateway });
      const log = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { necessidade } = await prepararNecessidade(appComDefeito);
      const res = await request(appComDefeito).post(`/necessidades/${necessidade.id}/doacoes`).send({ doadorId: 'd', valor: 10, formaPagamento: 'PIX' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ erro: 'Erro interno.' });
      expect(log).toHaveBeenCalledWith(expect.any(TypeError));
      log.mockRestore();
    });
  });
});
