'use strict';

const { carregarDadosExemplo, nascimentoComIdade } = require('../src/infra/dadosExemplo');
const { RepositorioEmMemoria, RepositorioCriancasEmMemoria } = require('../src/infra/RepositorioEmMemoria');
const { StatusEscolinha } = require('../src/domain/Escolinha');
const { StatusNecessidade } = require('../src/domain/Necessidade');

const HOJE = new Date('2026-11-10T12:00:00Z');

function repositorios() {
  return {
    escolinhas: new RepositorioEmMemoria(),
    criancas: new RepositorioCriancasEmMemoria(),
    necessidades: new RepositorioEmMemoria(),
    doacoes: new RepositorioEmMemoria(),
  };
}

async function carregar() {
  const repos = repositorios();
  const total = await carregarDadosExemplo(repos, HOJE);
  return { repos, total };
}

describe('dados de exemplo', () => {
  test('nascimentoComIdade gera uma data com a idade pedida, inclusive sem informar hoje', async () => {
    expect(nascimentoComIdade(10, new Date('2026-11-10T12:00:00Z'))).toBe('2016-09-01');
    expect(nascimentoComIdade(10, new Date('2026-01-15T12:00:00Z'))).toBe('2015-11-01');
    expect(nascimentoComIdade(10)).toMatch(/^\d{4}-\d{2}-01$/);
  });

  test('carrega escolinhas, crianças, necessidades e doações e devolve as quantidades', async () => {
    const { repos, total } = await carregar();

    expect(total).toEqual({ escolinhas: 12, criancas: 24, necessidades: 42, doacoes: repos.doacoes.listar().length });
    expect(total.doacoes).toBeGreaterThan(60);
    expect(repos.escolinhas.listar()).toHaveLength(12);
    expect(repos.criancas.listar()).toHaveLength(24);
    expect(repos.necessidades.listar()).toHaveLength(42);
  });

  test('12 escolinhas: 10 aprovadas, 1 pendente (UC-11) e 1 rejeitada com motivo, em 9 estados das 5 regiões', async () => {
    const { repos } = await carregar();
    const escolinhas = repos.escolinhas.listar();
    const por = (status) => escolinhas.filter((e) => e.status === status);

    expect(por(StatusEscolinha.APROVADA)).toHaveLength(10);
    expect(por(StatusEscolinha.PENDENTE).map((e) => e.nome)).toEqual(['Futebol na Comunidade']);
    expect(por(StatusEscolinha.REJEITADA)).toHaveLength(1);
    expect(por(StatusEscolinha.REJEITADA)[0].motivoRejeicao).toMatch(/documentação/i);

    const ufs = new Set(escolinhas.map((e) => e.uf));
    expect(ufs.size).toBe(9);
    const regioes = { N: ['AM', 'PA'], NE: ['BA', 'PE', 'CE'], CO: ['GO'], SE: ['SP', 'RJ', 'MG'], S: ['RS', 'PR'] };
    for (const lista of Object.values(regioes)) {
      expect(lista.some((uf) => ufs.has(uf))).toBe(true);
    }
  });

  test('todas as crianças são menores de idade (7 a 15 anos) e vinculadas a uma escolinha aprovada', async () => {
    const { repos } = await carregar();

    for (const crianca of repos.criancas.listar()) {
      expect(crianca.idade(HOJE)).toBeGreaterThanOrEqual(7);
      expect(crianca.idade(HOJE)).toBeLessThanOrEqual(15);
      expect((await repos.escolinhas.buscarPorId(crianca.escolinhaId)).estaAprovada()).toBe(true);
    }
  });

  test('as seis crianças originais continuam e a primeira da busca tem pedidos abertos (tour do front)', async () => {
    const { repos } = await carregar();
    const criancas = repos.criancas.listar();

    expect(criancas.slice(0, 6).map((c) => c.apelido)).toEqual(['Kauã', 'Lívia', 'Pedrinho', 'Juju', 'Davi', 'Gabi']);
    for (const crianca of criancas.slice(0, 3)) {
      expect(crianca.necessidadesAtivas().length).toBeGreaterThan(0);
    }
    const chuteira = repos.necessidades.listar().find((n) => n.descricao === 'Chuteira de futsal nº 34');
    expect(chuteira.valorArrecadado).toBe(72);
    expect(chuteira.percentualArrecadado()).toBe(40);
  });

  test('necessidades variadas: metas de R$ 30 a R$ 400, 0% a 95%, ao menos 6 "quase lá" e 2 atendidas', async () => {
    const { repos } = await carregar();
    const lista = repos.necessidades.listar();
    const metas = lista.map((n) => n.valorEstimado);
    const percentuais = lista.map((n) => n.percentualArrecadado());

    expect(Math.min(...metas)).toBe(30);
    expect(Math.max(...metas)).toBe(400);
    expect(lista.filter((n) => n.valorArrecadado === 0).length).toBeGreaterThan(5);
    expect(percentuais.filter((p) => p > 70 && p < 100).length).toBeGreaterThanOrEqual(6);
    expect(lista.filter((n) => n.status === StatusNecessidade.ATENDIDA)).toHaveLength(2);
    expect(lista.filter((n) => n.status === StatusNecessidade.ABERTA)).toHaveLength(40);
    expect(new Set(lista.map((n) => n.tipo)).size).toBe(3);
  });

  test('a soma das doações de cada necessidade é o arrecadado dela, e nenhuma passa da meta (L8)', async () => {
    const { repos } = await carregar();
    const doacoes = repos.doacoes.listar();

    for (const necessidade of repos.necessidades.listar()) {
      const somaCentavos = doacoes
        .filter((d) => d.necessidadeId === necessidade.id)
        .reduce((soma, d) => soma + Math.round(d.valor * 100), 0);
      expect(somaCentavos).toBe(Math.round(necessidade.valorArrecadado * 100));
      expect(necessidade.valorArrecadado).toBeLessThanOrEqual(necessidade.valorEstimado);
    }
    expect(doacoes.every((d) => repos.necessidades.buscarPorId(d.necessidadeId))).toBe(true);
  });

  test('as doações são fictícias, variadas e dos últimos 30 dias', async () => {
    const { repos } = await carregar();
    const doacoes = repos.doacoes.listar();

    expect(doacoes.some((d) => d.anonima)).toBe(true);
    expect(doacoes.some((d) => !d.anonima)).toBe(true);
    expect(new Set(doacoes.map((d) => d.formaPagamento))).toEqual(new Set(['PIX', 'CARTAO_CREDITO', 'BOLETO']));
    expect(doacoes.every((d) => /^doador\d\d@exemplo\.com$/.test(d.doadorId))).toBe(true);
    for (const d of doacoes) {
      const dias = (HOJE - new Date(d.data)) / 86400000;
      expect(dias).toBeGreaterThanOrEqual(0);
      expect(dias).toBeLessThanOrEqual(30);
    }
    expect(new Set(doacoes.map((d) => d.data.slice(0, 10))).size).toBeGreaterThan(10);
  });

  test('é determinística: duas cargas dão os mesmos valores e doações (só os ids mudam)', async () => {
    const resumo = ({ repos }) => ({
      necessidades: repos.necessidades.listar().map((n) => [n.descricao, n.valorEstimado, n.valorArrecadado, n.status]),
      doacoes: repos.doacoes.listar().map((d) => [d.valor, d.doadorId, d.formaPagamento, d.anonima, d.data, d.transacaoId]),
    });

    expect(resumo(await carregar())).toEqual(resumo(await carregar()));
  });

  test('a saída pública não traz nome civil nem endereço das crianças (RNF01)', async () => {
    const { repos } = await carregar();

    const texto = JSON.stringify(repos.criancas.listar());

    expect(texto).not.toContain('Kauã Henrique Lima');
    expect(texto).not.toContain('Yasmin Vitória Cardoso');
    expect(texto).not.toContain('Rua Exemplo');
  });
});
