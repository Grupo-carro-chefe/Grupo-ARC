'use strict';

const request = require('supertest');
const { descreverComBanco, criarBancoDeTeste } = require('./bancoDeTeste');
const { criarApp } = require('../src/api/app');
const { rodarMigrations } = require('../src/infra/postgres/migrations');
const { criarRepositoriosPostgres } = require('../src/infra/postgres');
const { BloqueioPostgres } = require('../src/infra/postgres/BloqueioPostgres');
const { DoacaoService, PagamentoRecusadoError } = require('../src/services/DoacaoService');
const { GatewayPagamentoSimulado } = require('../src/infra/GatewayPagamentoSimulado');
const { NotificadorEmMemoria } = require('../src/infra/NotificadorEmMemoria');
const { dadosCrianca } = require('./helpers');

/** Uma "instância" do app: pool próprio, repositórios, trava e gateway com contadores. */
function instancia(banco, { aprovar = true } = {}) {
  const pool = banco.abrirPool();
  const gatewaySimulado = new GatewayPagamentoSimulado({ aprovar });
  const gateway = {
    processar: jest.fn((p) => gatewaySimulado.processar(p)),
    estornar: jest.fn((t) => gatewaySimulado.estornar(t)),
  };
  const notificador = new NotificadorEmMemoria();
  const repositorios = criarRepositoriosPostgres(pool);
  const bloqueio = new BloqueioPostgres(pool);
  const app = criarApp({ gateway, notificador, repositorios, bloqueio });
  return { pool, gateway, notificador, repositorios, bloqueio, app };
}

async function prepararNecessidade(app, valorEstimado = 100) {
  const escolinha = (await request(app).post('/escolinhas').send({ nome: 'Bola Pra Frente', cidade: 'São Paulo', uf: 'SP' })).body;
  await request(app).post(`/escolinhas/${escolinha.id}/aprovar`);
  const crianca = (await request(app).post(`/escolinhas/${escolinha.id}/criancas`).send(dadosCrianca())).body;
  const comNecessidade = (await request(app)
    .post(`/criancas/${crianca.id}/necessidades`)
    .send({ tipo: 'MATERIAL_ESPORTIVO', descricao: 'Chuteira', valorEstimado })).body;
  return { escolinha, crianca, necessidade: comNecessidade.necessidades[0] };
}

const doar = (app, necessidadeId, valor, extra = {}) =>
  request(app).post(`/necessidades/${necessidadeId}/doacoes`).send({ doadorId: 'doador-1', valor, formaPagamento: 'PIX', ...extra });

descreverComBanco('PostgreSQL real: API e doação transacional', () => {
  let banco;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await rodarMigrations(banco.abrirPool());
  });

  afterEach(async () => {
    await banco.encerrar();
  });

  async function estado(pool, necessidadeId) {
    const n = await pool.query('SELECT valor_arrecadado_centavos::int AS arrecadado, status FROM necessidades WHERE id = $1', [necessidadeId]);
    const d = await pool.query('SELECT count(*)::int AS qtd, COALESCE(sum(valor_centavos), 0)::int AS soma FROM doacoes WHERE necessidade_id = $1', [necessidadeId]);
    return { arrecadado: n.rows[0].arrecadado, status: n.rows[0].status, qtd: d.rows[0].qtd, soma: d.rows[0].soma };
  }

  describe('fluxo completo pela API', () => {
    test('cadastro, busca, doação e comprovante; tudo continua lá numa nova instância (reinício)', async () => {
      const a = instancia(banco);
      const { crianca, necessidade } = await prepararNecessidade(a.app, 150);

      const busca = await request(a.app).get('/criancas').query({ cidade: 'sao paulo', uf: 'sp', tipo: 'MATERIAL_ESPORTIVO' });
      expect(busca.body.total).toBe(1);
      expect(JSON.stringify(busca.body)).not.toContain('Maria Aparecida');

      const doacao = await doar(a.app, necessidade.id, 60);
      expect(doacao.status).toBe(201);
      expect(doacao.body).toMatchObject({ valor: 60, necessidadeId: necessidade.id, anonima: false });
      expect(a.notificador.enviadas).toHaveLength(1);

      // "Reinício": outra instância (outro pool, outros objetos) sobre o mesmo banco.
      const b = instancia(banco);
      const perfil = await request(b.app).get(`/criancas/${crianca.id}`);
      expect(perfil.status).toBe(200);
      expect(perfil.body.necessidades[0]).toMatchObject({ valorArrecadado: 60, percentual: 40 });
      expect((await request(b.app).get('/escolinhas')).body).toHaveLength(1);
      expect((await request(b.app).get(`/escolinhas/${crianca.escolinhaId}/criancas`)).body).toHaveLength(1);
      expect(await estado(b.pool, necessidade.id)).toEqual({ arrecadado: 6000, status: 'ABERTA', qtd: 1, soma: 6000 });
    });

    test('mantém as regras e mensagens: 404 para id inválido, 400 acima da meta, 400 se não aberta, 402 recusado', async () => {
      const a = instancia(banco);
      const { crianca, necessidade } = await prepararNecessidade(a.app, 100);

      expect((await request(a.app).get('/criancas/nao-e-uuid')).status).toBe(404);
      expect((await request(a.app).get(`/criancas/${necessidade.id}`)).body).toEqual({ erro: 'Criança não encontrada.' });
      expect((await doar(a.app, 'lixo', 10)).body).toEqual({ erro: 'Necessidade não encontrada.' });

      const acima = await doar(a.app, necessidade.id, 100.5);
      expect(acima.status).toBe(400);
      expect(acima.body).toEqual({ erro: 'Valor da doação excede o restante da meta (R$ 100.00).' });

      await doar(a.app, necessidade.id, 100);
      const depois = await doar(a.app, necessidade.id, 1);
      expect(depois.body).toEqual({ erro: 'Não é possível doar para uma necessidade com status ATENDIDA.' });
      expect((await request(a.app).get('/criancas')).body.total).toBe(0);
      expect((await request(a.app).get(`/criancas/${crianca.id}`)).body.necessidades).toEqual([]);

      const recusa = instancia(banco, { aprovar: false });
      const outra = await prepararNecessidade(recusa.app, 100);
      const recusada = await doar(recusa.app, outra.necessidade.id, 10);
      expect(recusada.status).toBe(402);
      expect(await estado(recusa.pool, outra.necessidade.id)).toEqual({ arrecadado: 0, status: 'ABERTA', qtd: 0, soma: 0 });
      expect(recusa.gateway.estornar).not.toHaveBeenCalled();
    });

    test('aprovar escolinha persiste', async () => {
      const a = instancia(banco);
      const { body: escolinha } = await request(a.app).post('/escolinhas').send({ nome: 'Nova', cidade: 'Natal', uf: 'RN' });
      await request(a.app).post(`/escolinhas/${escolinha.id}/aprovar`);

      const b = instancia(banco);
      expect((await b.repositorios.escolinhas.buscarPorId(escolinha.id)).estaAprovada()).toBe(true);
    });
  });

  describe('transação da doação', () => {
    test('se falhar depois do registro, nada é gravado (rollback) e a cobrança é estornada', async () => {
      const a = instancia(banco);
      const { necessidade } = await prepararNecessidade(a.app, 100);
      // Simula uma queda no COMMIT: o trabalho todo roda e depois a transação falha.
      const bloqueioQueQuebra = {
        executar: (n, trabalho) =>
          a.bloqueio.executar(n, async (atual, tx) => {
            await trabalho(atual, tx);
            throw new Error('queda antes do commit');
          }),
      };
      const service = new DoacaoService({ gateway: a.gateway, notificador: a.notificador, doacoes: a.repositorios.doacoes, bloqueio: bloqueioQueQuebra });

      await expect(service.realizar({ necessidade, escolinhaId: 'e', doadorId: 'd', valor: 30, formaPagamento: 'PIX' })).rejects.toThrow('queda antes do commit');

      expect(await estado(a.pool, necessidade.id)).toEqual({ arrecadado: 0, status: 'ABERTA', qtd: 0, soma: 0 });
      expect(a.gateway.processar).toHaveBeenCalledTimes(1);
      expect(a.gateway.estornar).toHaveBeenCalledTimes(1);
      expect(a.notificador.enviadas).toHaveLength(0);
    });

    test('a doação e o arrecadado ficam na mesma transação: falha ao gravar a doação desfaz o arrecadado', async () => {
      const a = instancia(banco);
      const { necessidade } = await prepararNecessidade(a.app, 100);
      // Doação com necessidadeId errado violaria a FK no INSERT, depois de o UPDATE já ter rodado.
      const bloqueio = new BloqueioPostgres(a.pool);

      await expect(
        bloqueio.executar(necessidade, async (atual, tx) => {
          const { Doacao } = require('../src/domain/Doacao');
          await tx.registrar(new Doacao({ necessidadeId: '11111111-1111-4111-8111-111111111111', doadorId: 'd', valor: 40, formaPagamento: 'PIX' }));
        }),
      ).rejects.toThrow(/foreign key/);

      expect(await estado(a.pool, necessidade.id)).toEqual({ arrecadado: 0, status: 'ABERTA', qtd: 0, soma: 0 });
    });

    test('necessidade inexistente no banco dá erro claro', async () => {
      const a = instancia(banco);

      await expect(a.bloqueio.executar({ id: '22222222-2222-4222-8222-222222222222' }, async () => {})).rejects.toThrow('Necessidade não encontrada.');
      await expect(a.bloqueio.executar({ id: 'lixo' }, async () => {})).rejects.toThrow();
    });

    test('o PagamentoRecusadoError continua sendo o erro devolvido quando o gateway recusa', async () => {
      const a = instancia(banco, { aprovar: false });
      const { necessidade } = await prepararNecessidade(a.app, 100);
      const service = new DoacaoService({ gateway: a.gateway, notificador: a.notificador, doacoes: a.repositorios.doacoes, bloqueio: a.bloqueio });

      await expect(service.realizar({ necessidade, escolinhaId: 'e', doadorId: 'd', valor: 30, formaPagamento: 'PIX' })).rejects.toBeInstanceOf(PagamentoRecusadoError);
    });
  });

  describe('concorrência (SELECT ... FOR UPDATE)', () => {
    test('20 doações de R$ 10 numa meta de R$ 100: exatamente 10 passam, arrecadado = 100, só os aceitos são cobrados', async () => {
      const a = instancia(banco);
      const { necessidade } = await prepararNecessidade(a.app, 100);

      const respostas = await Promise.all(Array.from({ length: 20 }, () => doar(a.app, necessidade.id, 10)));

      expect(respostas.filter((r) => r.status === 201)).toHaveLength(10);
      expect(respostas.filter((r) => r.status === 400)).toHaveLength(10);
      expect(await estado(a.pool, necessidade.id)).toEqual({ arrecadado: 10000, status: 'ATENDIDA', qtd: 10, soma: 10000 });
      expect(a.gateway.processar).toHaveBeenCalledTimes(10);
      expect(a.gateway.estornar).not.toHaveBeenCalled();
    });

    test('valores quebrados: nunca passa da meta e o total confere com a soma dos comprovantes', async () => {
      const a = instancia(banco);
      const { necessidade } = await prepararNecessidade(a.app, 50);

      // 15 x 7,00 = 105 numa meta de 50: cabem 7 (49,00); a oitava (7,00) excede o restante (1,00).
      const respostas = await Promise.all(Array.from({ length: 15 }, () => doar(a.app, necessidade.id, 7)));

      const aceitas = respostas.filter((r) => r.status === 201);
      expect(aceitas).toHaveLength(7);
      expect(await estado(a.pool, necessidade.id)).toEqual({ arrecadado: 4900, status: 'ABERTA', qtd: 7, soma: 4900 });
      expect(aceitas.reduce((t, r) => t + r.body.valor, 0)).toBe(49);
      expect(a.gateway.processar).toHaveBeenCalledTimes(7);
    });

    test('duas instâncias (dois pools, como dois processos) disputando a mesma necessidade', async () => {
      const a = instancia(banco);
      const b = instancia(banco);
      const { necessidade } = await prepararNecessidade(a.app, 100);

      const respostas = await Promise.all(
        Array.from({ length: 24 }, (_, i) => doar(i % 2 === 0 ? a.app : b.app, necessidade.id, 10)),
      );

      expect(respostas.filter((r) => r.status === 201)).toHaveLength(10);
      expect(await estado(a.pool, necessidade.id)).toEqual({ arrecadado: 10000, status: 'ATENDIDA', qtd: 10, soma: 10000 });
      expect(a.gateway.processar.mock.calls.length + b.gateway.processar.mock.calls.length).toBe(10);
    });

    test('necessidades diferentes não esperam uma pela outra e cada total fica certo', async () => {
      const a = instancia(banco);
      const n1 = (await prepararNecessidade(a.app, 100)).necessidade;
      const n2 = (await prepararNecessidade(a.app, 40)).necessidade;

      await Promise.all([
        ...Array.from({ length: 6 }, () => doar(a.app, n1.id, 10)),
        ...Array.from({ length: 6 }, () => doar(a.app, n2.id, 10)),
      ]);

      expect(await estado(a.pool, n1.id)).toMatchObject({ arrecadado: 6000, qtd: 6, status: 'ABERTA' });
      expect(await estado(a.pool, n2.id)).toMatchObject({ arrecadado: 4000, qtd: 4, status: 'ATENDIDA' });
    });
  });
});
