'use strict';

const { Crianca } = require('../src/domain/Crianca');
const { StatusNecessidade } = require('../src/domain/Necessidade');
const { dadosCrianca, novaNecessidade } = require('./helpers');

// Data fixa: os testes de idade não mudam com o passar do tempo nem com o fuso horário.
const HOJE = new Date('2026-10-18T12:00:00Z');

function criar(sobrescrever = {}) {
  return new Crianca({ ...dadosCrianca({ dataNascimento: '2016-05-10' }), escolinhaId: 'esc-1', ...sobrescrever });
}

describe('Crianca', () => {
  beforeEach(() => jest.useFakeTimers({ now: HOJE }));
  afterEach(() => jest.useRealTimers());

  // ---------------------------------------------------------------------
  // Método de teste 1: criação (UC-03, fluxo principal)
  // ---------------------------------------------------------------------
  describe('criação', () => {
    test('caso 1: cria criança válida com perfil público e dados restritos separados', () => {
      const c = criar();

      expect(c.id).toEqual(expect.any(String));
      expect(c.apelido).toBe('Mari');
      expect(c.escolinhaId).toBe('esc-1');
      expect(c.cidade).toBe('São Paulo');
      expect(c.uf).toBe('SP');
      expect(c.necessidades).toEqual([]);
    });

    test('caso 2: guarda os dados sensíveis em propriedades com prefixo _', () => {
      const c = criar();

      expect(c._nomeCivil).toBe('Maria Aparecida da Silva');
      expect(c._dataNascimento.toISOString()).toBe('2016-05-10T00:00:00.000Z');
      expect(c._endereco.logradouro).toBe('Rua das Acácias');
      expect(c).not.toHaveProperty('nomeCivil');
      expect(c).not.toHaveProperty('endereco');
    });

    test('caso 3: remove espaços extras e normaliza a UF para maiúsculas', () => {
      const c = criar({
        nomeCivil: '  Maria  ',
        apelido: ' Mari ',
        endereco: { logradouro: ' Rua A ', cidade: ' Campinas ', uf: ' sp ' },
      });

      expect(c.dadosRestritos().nomeCivil).toBe('Maria');
      expect(c.apelido).toBe('Mari');
      expect(c.cidade).toBe('Campinas');
      expect(c.uf).toBe('SP');
    });

    test('caso 4: aceita data de nascimento como Date, usando o dia em UTC', () => {
      const c = criar({ dataNascimento: new Date('2016-05-10T23:30:00Z') });

      expect(c.dadosRestritos().dataNascimento).toBe('2016-05-10');
    });

    test('caso 5: aceita 29 de fevereiro em ano bissexto', () => {
      expect(criar({ dataNascimento: '2016-02-29' }).dadosRestritos().dataNascimento).toBe('2016-02-29');
    });

    test('caso 6: aceita criança nascida hoje (idade 0)', () => {
      expect(criar({ dataNascimento: '2026-10-18' }).idade()).toBe(0);
    });

    test('caso 7: aceita quem faz 18 anos amanhã (ainda tem 17)', () => {
      expect(criar({ dataNascimento: '2008-10-19' }).idade()).toBe(17);
    });

    test('caso 8: guarda número, bairro e CEP opcionais e ignora os ausentes', () => {
      const completo = criar({ endereco: { logradouro: 'Rua A', cidade: 'Santos', uf: 'SP', numero: 45, bairro: 'Centro', cep: '11010-000' } });
      const minimo = criar({ endereco: { logradouro: 'Rua A', cidade: 'Santos', uf: 'SP', numero: null } });

      expect(completo.dadosRestritos().endereco).toEqual({
        logradouro: 'Rua A', cidade: 'Santos', uf: 'SP', numero: '45', bairro: 'Centro', cep: '11010-000',
      });
      expect(minimo.dadosRestritos().endereco).toEqual({ logradouro: 'Rua A', cidade: 'Santos', uf: 'SP' });
    });

    test('caso 9: guarda o endereço congelado, sem referência ao objeto recebido', () => {
      const endereco = { logradouro: 'Rua A', cidade: 'Santos', uf: 'SP' };
      const c = criar({ endereco });
      endereco.cidade = 'Outra';

      expect(Object.isFrozen(c._endereco)).toBe(true);
      expect(c.cidade).toBe('Santos');
    });

    // UC-03, fluxo alternativo A1: dados inválidos.
    test.each([
      ['nome civil vazio', { nomeCivil: '  ' }, /Nome civil é obrigatório/],
      ['nome civil ausente', { nomeCivil: undefined }, /Nome civil é obrigatório/],
      ['apelido vazio', { apelido: '' }, /Apelido é obrigatório/],
      ['escolinha ausente', { escolinhaId: undefined }, /Escolinha é obrigatório/],
      ['data no formato brasileiro', { dataNascimento: '10/05/2016' }, /formato AAAA-MM-DD/],
      ['data sem zeros à esquerda', { dataNascimento: '2016-5-1' }, /formato AAAA-MM-DD/],
      ['data numérica', { dataNascimento: 20160510 }, /formato AAAA-MM-DD/],
      ['data ausente', { dataNascimento: undefined }, /formato AAAA-MM-DD/],
      ['31 de fevereiro', { dataNascimento: '2020-02-31' }, /inexistente: 2020-02-31/],
      ['29 de fevereiro em ano comum', { dataNascimento: '2021-02-29' }, /inexistente/],
      ['mês 13', { dataNascimento: '2016-13-01' }, /inexistente/],
      ['Date inválido', { dataNascimento: new Date('não é data') }, /Data de nascimento inválida/],
      ['data de amanhã', { dataNascimento: '2026-10-19' }, /não pode estar no futuro/],
      ['data no ano que vem', { dataNascimento: '2027-01-01' }, /não pode estar no futuro/],
      ['18 anos completos hoje', { dataNascimento: '2008-10-18' }, /apenas menores de 18 anos/],
      ['adulto de 30 anos', { dataNascimento: '1996-01-01' }, /apenas menores de 18 anos/],
      ['endereço ausente', { endereco: undefined }, /Endereço é obrigatório/],
      ['endereço nulo', { endereco: null }, /Endereço é obrigatório/],
      ['logradouro vazio', { endereco: { logradouro: '', cidade: 'Santos', uf: 'SP' } }, /Logradouro é obrigatório/],
      ['cidade ausente', { endereco: { logradouro: 'Rua A', uf: 'SP' } }, /Cidade é obrigatório/],
      ['UF inexistente', { endereco: { logradouro: 'Rua A', cidade: 'Santos', uf: 'XX' } }, /UF inválida: XX/],
      ['UF não textual', { endereco: { logradouro: 'Rua A', cidade: 'Santos', uf: 35 } }, /UF inválida: 35/],
    ])('caso inválido (A1): rejeita %s', (_nome, dados, erro) => {
      expect(() => criar(dados)).toThrow(erro);
    });

    test('caso inválido (A1): chamada sem argumentos não quebra com TypeError', () => {
      expect(() => new Crianca()).toThrow(/Nome civil é obrigatório/);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 2: idade()
  // ---------------------------------------------------------------------
  describe('idade()', () => {
    test('caso 1: ainda não fez aniversário no ano', () => {
      expect(criar({ dataNascimento: '2016-12-25' }).idade()).toBe(9);
    });

    test('caso 2: faz aniversário hoje', () => {
      expect(criar({ dataNascimento: '2016-10-18' }).idade()).toBe(10);
    });

    test('caso 3: já fez aniversário no ano', () => {
      expect(criar({ dataNascimento: '2016-01-01' }).idade()).toBe(10);
    });

    test('caso 4: aceita uma data de referência', () => {
      const c = criar({ dataNascimento: '2016-05-10' });

      expect(c.idade(new Date('2026-05-09T12:00:00Z'))).toBe(9);
      expect(c.idade(new Date('2026-05-10T00:00:00Z'))).toBe(10);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 3: necessidades
  // ---------------------------------------------------------------------
  describe('necessidades', () => {
    test('caso 1: adicionarNecessidade() vincula uma Necessidade', () => {
      const c = criar();
      const n = novaNecessidade();
      c.adicionarNecessidade(n);

      expect(c.necessidades).toEqual([n]);
    });

    test.each([
      ['objeto comum', { tipo: 'FINANCEIRA', descricao: 'x', valorEstimado: 10 }],
      ['undefined', undefined],
    ])('caso 2: adicionarNecessidade() rejeita %s', (_nome, valor) => {
      expect(() => criar().adicionarNecessidade(valor)).toThrow(/Necessidade inválida/);
    });

    test('caso 3: a lista devolvida é uma cópia', () => {
      const c = criar();
      c.necessidades.push(novaNecessidade());

      expect(c.necessidades).toHaveLength(0);
    });

    test('caso 4: necessidadesAtivas() traz só as ABERTAS', () => {
      const c = criar();
      const aberta = novaNecessidade();
      const encerrada = novaNecessidade();
      const atendida = novaNecessidade({ valorEstimado: 50 });
      encerrada.encerrar();
      atendida.registrarDoacao(50);
      [aberta, encerrada, atendida].forEach((n) => c.adicionarNecessidade(n));

      expect(atendida.status).toBe(StatusNecessidade.ATENDIDA);
      expect(c.necessidadesAtivas()).toEqual([aberta]);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 4: privacidade (RF06, RNF01)
  // ---------------------------------------------------------------------
  describe('privacidade', () => {
    function criancaComNecessidades() {
      const c = criar();
      const chuteira = novaNecessidade();
      const encerrada = novaNecessidade({ descricao: 'Uniforme antigo' });
      chuteira.registrarDoacao(50);
      encerrada.encerrar();
      c.adicionarNecessidade(chuteira);
      c.adicionarNecessidade(encerrada);
      return { c, chuteira };
    }

    test('caso 1: perfilPublico() traz apelido, idade, cidade, UF e as necessidades ativas', () => {
      const { c, chuteira } = criancaComNecessidades();

      expect(c.perfilPublico()).toEqual({
        id: c.id,
        apelido: 'Mari',
        idade: 10,
        escolinhaId: 'esc-1',
        cidade: 'São Paulo',
        uf: 'SP',
        necessidades: [{
          id: chuteira.id,
          tipo: 'MATERIAL_ESPORTIVO',
          descricao: 'Chuteira de futsal nº 33',
          valorEstimado: 150,
          valorArrecadado: 50,
          percentual: 33,
        }],
      });
    });

    test('caso 2: JSON.stringify não vaza nome civil, nascimento nem endereço', () => {
      const json = JSON.stringify(criancaComNecessidades().c);

      expect(json).not.toContain('Maria Aparecida');
      expect(json).not.toContain('Rua das Acácias');
      expect(json).not.toContain('2016-05-10');
      expect(json).not.toContain('04930-000');
      expect(json).not.toContain('Jardim Ângela');
      expect(Object.keys(JSON.parse(json)).sort()).toEqual(['apelido', 'cidade', 'escolinhaId', 'id', 'idade', 'necessidades', 'uf']);
    });

    test('caso 3: toJSON() devolve exatamente o perfil público', () => {
      const { c } = criancaComNecessidades();

      expect(c.toJSON()).toEqual(c.perfilPublico());
    });

    test('caso 4: dadosRestritos() traz nome civil, nascimento AAAA-MM-DD e endereço', () => {
      expect(criar().dadosRestritos()).toEqual({
        nomeCivil: 'Maria Aparecida da Silva',
        dataNascimento: '2016-05-10',
        endereco: { logradouro: 'Rua das Acácias', numero: '120', bairro: 'Jardim Ângela', cidade: 'São Paulo', uf: 'SP', cep: '04930-000' },
      });
    });

    test('caso 5: alterar a cópia de dadosRestritos() não altera a criança', () => {
      const c = criar();
      c.dadosRestritos().endereco.logradouro = 'Outra rua';

      expect(c.dadosRestritos().endereco.logradouro).toBe('Rua das Acácias');
    });
  });
});
