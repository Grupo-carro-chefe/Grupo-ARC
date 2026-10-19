'use strict';

const { Escolinha, StatusEscolinha } = require('../src/domain/Escolinha');
const { Crianca } = require('../src/domain/Crianca');
const { dadosCrianca } = require('./helpers');

function novaEscolinha(sobrescrever = {}) {
  return new Escolinha({ nome: 'Escolinha Bola Pra Frente', cidade: 'São Paulo', uf: 'SP', ...sobrescrever });
}

describe('Escolinha', () => {
  // ---------------------------------------------------------------------
  // Método de teste 1: criação (UC-02)
  // ---------------------------------------------------------------------
  describe('criação', () => {
    test('caso 1: nasce PENDENTE, sem motivo de rejeição', () => {
      const e = novaEscolinha();

      expect(e.id).toEqual(expect.any(String));
      expect(e.nome).toBe('Escolinha Bola Pra Frente');
      expect(e.status).toBe(StatusEscolinha.PENDENTE);
      expect(e.motivoRejeicao).toBeNull();
      expect(e.estaAprovada()).toBe(false);
    });

    test('caso 2: remove espaços extras e normaliza a UF', () => {
      const e = novaEscolinha({ nome: '  Craques  ', cidade: ' Recife ', uf: 'pe' });

      expect([e.nome, e.cidade, e.uf]).toEqual(['Craques', 'Recife', 'PE']);
    });

    test.each([
      ['nome vazio', { nome: ' ' }, /Nome é obrigatório/],
      ['cidade ausente', { cidade: undefined }, /Cidade é obrigatório/],
      ['UF inválida', { uf: 'SS' }, /UF inválida: SS/],
    ])('caso inválido: rejeita %s', (_nome, dados, erro) => {
      expect(() => novaEscolinha(dados)).toThrow(erro);
    });

    test('caso inválido: chamada sem argumentos não quebra com TypeError', () => {
      expect(() => new Escolinha()).toThrow(/Nome é obrigatório/);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 2: aprovar() e rejeitar() (UC-11)
  // ---------------------------------------------------------------------
  describe('aprovar() e rejeitar()', () => {
    test('caso 1: aprovar() muda para APROVADA', () => {
      const e = novaEscolinha();
      e.aprovar();

      expect(e.status).toBe(StatusEscolinha.APROVADA);
      expect(e.estaAprovada()).toBe(true);
    });

    test('caso 2: rejeitar() muda para REJEITADA e guarda o motivo', () => {
      const e = novaEscolinha();
      e.rejeitar('  CNPJ não confere  ');

      expect(e.status).toBe(StatusEscolinha.REJEITADA);
      expect(e.motivoRejeicao).toBe('CNPJ não confere');
    });

    test.each([['ausente', undefined], ['vazio', '   ']])('caso 3: rejeitar() exige motivo (%s) e mantém PENDENTE', (_nome, motivo) => {
      const e = novaEscolinha();

      expect(() => e.rejeitar(motivo)).toThrow(/Motivo da rejeição é obrigatório/);
      expect(e.status).toBe(StatusEscolinha.PENDENTE);
    });

    test('caso 4: não aprova duas vezes', () => {
      const e = novaEscolinha();
      e.aprovar();

      expect(() => e.aprovar()).toThrow('Só é possível aprovar escolinhas pendentes (status atual: APROVADA).');
    });

    test('caso 5: não aprova escolinha rejeitada', () => {
      const e = novaEscolinha();
      e.rejeitar('Documentação incompleta');

      expect(() => e.aprovar()).toThrow('Só é possível aprovar escolinhas pendentes (status atual: REJEITADA).');
    });

    test('caso 6: não rejeita escolinha aprovada', () => {
      const e = novaEscolinha();
      e.aprovar();

      expect(() => e.rejeitar('motivo')).toThrow('Só é possível rejeitar escolinhas pendentes (status atual: APROVADA).');
      expect(e.motivoRejeicao).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 3: cadastrarCrianca() (UC-03)
  // ---------------------------------------------------------------------
  describe('cadastrarCrianca()', () => {
    test('caso 1: escolinha aprovada cadastra criança vinculada a ela', () => {
      const e = novaEscolinha();
      e.aprovar();
      const c = e.cadastrarCrianca(dadosCrianca());

      expect(c).toBeInstanceOf(Crianca);
      expect(c.escolinhaId).toBe(e.id);
    });

    test('caso 2: ignora escolinhaId vindo nos dados', () => {
      const e = novaEscolinha();
      e.aprovar();

      expect(e.cadastrarCrianca(dadosCrianca({ escolinhaId: 'outra' })).escolinhaId).toBe(e.id);
    });

    test.each([
      ['pendente', () => novaEscolinha()],
      ['rejeitada', () => { const e = novaEscolinha(); e.rejeitar('Fraude'); return e; }],
    ])('caso 3: escolinha %s não cadastra crianças', (_nome, criar) => {
      expect(() => criar().cadastrarCrianca(dadosCrianca()))
        .toThrow('A escolinha precisa ter o cadastro aprovado para cadastrar crianças.');
    });

    test('caso 4: repassa os erros de validação da criança (A1)', () => {
      const e = novaEscolinha();
      e.aprovar();

      expect(() => e.cadastrarCrianca(dadosCrianca({ apelido: '' }))).toThrow(/Apelido é obrigatório/);
      expect(() => e.cadastrarCrianca()).toThrow(/Nome civil é obrigatório/);
    });
  });
});
