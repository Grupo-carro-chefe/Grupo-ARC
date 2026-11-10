'use strict';

const { carregarDadosExemplo, nascimentoComIdade } = require('../src/infra/dadosExemplo');
const { RepositorioEmMemoria } = require('../src/infra/RepositorioEmMemoria');
const { StatusEscolinha } = require('../src/domain/Escolinha');

function repositorios() {
  return { escolinhas: new RepositorioEmMemoria(), criancas: new RepositorioEmMemoria(), necessidades: new RepositorioEmMemoria() };
}

describe('dados de exemplo', () => {
  test('nascimentoComIdade gera uma data com a idade pedida, inclusive sem informar hoje', async () => {
    expect(nascimentoComIdade(10, new Date('2026-11-10T12:00:00Z'))).toBe('2016-09-01');
    expect(nascimentoComIdade(10, new Date('2026-01-15T12:00:00Z'))).toBe('2015-11-01');
    expect(nascimentoComIdade(10)).toMatch(/^\d{4}-\d{2}-01$/);
  });

  test('carrega escolinhas, crianças e necessidades e devolve as quantidades', async () => {
    const repos = repositorios();

    const total = await carregarDadosExemplo(repos);

    expect(total).toEqual({ escolinhas: 5, criancas: 6, necessidades: 9 });
    expect(repos.escolinhas.listar()).toHaveLength(5);
    expect(repos.criancas.listar()).toHaveLength(6);
    expect(repos.necessidades.listar()).toHaveLength(9);
  });

  test('deixa só uma escolinha pendente, para demonstrar a aprovação (UC-11)', async () => {
    const repos = repositorios();
    await carregarDadosExemplo(repos);

    const pendentes = repos.escolinhas.listar().filter((e) => e.status === StatusEscolinha.PENDENTE);

    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].nome).toBe('Futebol na Comunidade');
  });

  test('todas as crianças são menores de idade e vinculadas a uma escolinha aprovada', async () => {
    const repos = repositorios();
    await carregarDadosExemplo(repos, new Date('2026-11-10T12:00:00Z'));

    for (const crianca of await repos.criancas.listar()) {
      expect(crianca.idade()).toBeLessThan(18);
      expect((await repos.escolinhas.buscarPorId(crianca.escolinhaId)).estaAprovada()).toBe(true);
    }
  });

  test('doações anteriores aparecem no progresso, sem atingir a meta', async () => {
    const repos = repositorios();
    await carregarDadosExemplo(repos);

    const chuteira = repos.necessidades.listar().find((n) => n.descricao === 'Chuteira de futsal nº 34');
    const bola = repos.necessidades.listar().find((n) => n.descricao === 'Bola de futsal oficial');

    expect(chuteira.valorArrecadado).toBe(72);
    expect(chuteira.percentualArrecadado()).toBe(40);
    expect(bola.valorArrecadado).toBe(0);
    expect(repos.necessidades.listar().every((n) => n.estaAberta())).toBe(true);
  });

  test('a saída pública não traz nome civil nem endereço das crianças (RNF01)', async () => {
    const repos = repositorios();
    await carregarDadosExemplo(repos);

    const texto = JSON.stringify(repos.criancas.listar());

    expect(texto).not.toContain('Kauã Henrique Lima');
    expect(texto).not.toContain('Rua Exemplo');
  });
});
