'use strict';

const { Doacao, FormaPagamento } = require('../src/domain/Doacao');

function novaDoacao(sobrescrever = {}) {
  return new Doacao({
    necessidadeId: 'nec-1',
    doadorId: 'doador-1',
    valor: 60,
    formaPagamento: FormaPagamento.PIX,
    ...sobrescrever,
  });
}

describe('Doacao', () => {
  // ---------------------------------------------------------------------
  // Método de teste 1: criação (UC-08, RF07)
  // ---------------------------------------------------------------------
  describe('criação', () => {
    test('caso 1: cria doação válida com valores padrão', () => {
      const d = novaDoacao();

      expect(d.id).toEqual(expect.any(String));
      expect(d.necessidadeId).toBe('nec-1');
      expect(d.doadorId).toBe('doador-1');
      expect(d.valor).toBe(60);
      expect(d.formaPagamento).toBe('PIX');
      expect(d.anonima).toBe(false);
      expect(d.transacaoId).toBeNull();
      expect(Number.isNaN(Date.parse(d.data))).toBe(false);
    });

    test('caso 2: aceita id, data, transação e anonimato informados', () => {
      const d = novaDoacao({ id: 'abc', data: new Date('2026-10-18T15:00:00Z'), transacaoId: 'SIM-1', anonima: true });

      expect([d.id, d.data, d.transacaoId, d.anonima]).toEqual(['abc', '2026-10-18T15:00:00.000Z', 'SIM-1', true]);
    });

    test.each(Object.values(FormaPagamento))('caso 3: aceita a forma de pagamento %s', (forma) => {
      expect(novaDoacao({ formaPagamento: forma }).formaPagamento).toBe(forma);
    });

    test('caso 4: normaliza o valor em centavos (0.1 + 0.2 vira 0.3)', () => {
      expect(novaDoacao({ valor: 0.1 + 0.2 }).valor).toBe(0.3);
    });

    test.each([
      ['valor zero', { valor: 0 }, /maior que zero/],
      ['valor negativo', { valor: -5 }, /maior que zero/],
      ['valor em texto', { valor: '60' }, /maior que zero/],
      ['valor NaN', { valor: NaN }, /maior que zero/],
      ['valor infinito', { valor: Infinity }, /maior que zero/],
      ['mais de 2 casas decimais', { valor: 10.555 }, /duas casas decimais/],
      ['forma de pagamento inexistente', { formaPagamento: 'BITCOIN' }, /Forma de pagamento inválida: BITCOIN/],
      ['forma de pagamento ausente', { formaPagamento: undefined }, /Forma de pagamento inválida/],
      ['anônima em texto', { anonima: 'sim' }, /verdadeiro ou falso/],
      ['necessidade vazia', { necessidadeId: '' }, /Necessidade é obrigatório/],
      ['doador ausente', { doadorId: undefined }, /Doador é obrigatório/],
    ])('caso inválido: rejeita %s', (_nome, dados, erro) => {
      expect(() => novaDoacao(dados)).toThrow(erro);
    });

    test('caso inválido: chamada sem argumentos não quebra com TypeError', () => {
      expect(() => new Doacao()).toThrow(/maior que zero/);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 2: imutabilidade (RNF05)
  // ---------------------------------------------------------------------
  describe('imutabilidade', () => {
    test('caso 1: o objeto é congelado', () => {
      expect(Object.isFrozen(novaDoacao())).toBe(true);
    });

    test.each([
      ['valor', 1],
      ['doadorId', 'outro'],
      ['anonima', true],
      ['data', '2000-01-01T00:00:00.000Z'],
    ])('caso 2: não permite alterar %s', (campo, novoValor) => {
      const d = novaDoacao();
      const original = d[campo];

      expect(() => { d[campo] = novoValor; }).toThrow(TypeError);
      expect(d[campo]).toBe(original);
    });

    test('caso 3: não permite adicionar nem remover campos', () => {
      const d = novaDoacao();

      expect(() => { d.estornada = true; }).toThrow(TypeError);
      expect(() => { delete d.valor; }).toThrow(TypeError);
    });

    test('caso 4: alterar o Date original não altera a doação', () => {
      const data = new Date('2026-10-18T15:00:00Z');
      const d = novaDoacao({ data });
      data.setUTCFullYear(2000);

      expect(d.data).toBe('2026-10-18T15:00:00.000Z');
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 3: identificacaoParaEscolinha() e gerarComprovante() (UC-08 A2, UC-09)
  // ---------------------------------------------------------------------
  describe('identificação e comprovante', () => {
    test('caso 1: doação identificada mostra o doador para a escolinha', () => {
      expect(novaDoacao().identificacaoParaEscolinha()).toBe('doador-1');
    });

    test('caso 2: doação anônima esconde o doador da escolinha (A2)', () => {
      expect(novaDoacao({ anonima: true }).identificacaoParaEscolinha()).toBe('Doador anônimo');
    });

    test('caso 3: comprovante traz todos os dados e código DOA- com 8 caracteres do id', () => {
      const d = novaDoacao({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        transacaoId: 'SIM-xyz',
        data: new Date('2026-10-18T15:00:00Z'),
        formaPagamento: FormaPagamento.CARTAO_CREDITO,
      });

      expect(d.gerarComprovante()).toEqual({
        codigo: 'DOA-A1B2C3D4',
        doacaoId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        necessidadeId: 'nec-1',
        doadorId: 'doador-1',
        valor: 60,
        formaPagamento: 'CARTAO_CREDITO',
        anonima: false,
        transacaoId: 'SIM-xyz',
        data: '2026-10-18T15:00:00.000Z',
      });
    });

    test('caso 4: código do comprovante gerado com id aleatório segue o padrão', () => {
      expect(novaDoacao().gerarComprovante().codigo).toMatch(/^DOA-[0-9A-F]{8}$/);
    });
  });
});
