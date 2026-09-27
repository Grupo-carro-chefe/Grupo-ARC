'use strict';

const { Necessidade, TipoNecessidade, StatusNecessidade } = require('../src/domain/Necessidade');

/** Cria uma necessidade válida, permitindo sobrescrever campos. */
function novaNecessidade(sobrescrever = {}) {
  return new Necessidade({
    tipo: TipoNecessidade.MATERIAL_ESPORTIVO,
    descricao: 'Chuteira de futsal nº 33',
    valorEstimado: 150,
    ...sobrescrever,
  });
}

describe('Necessidade', () => {
  // ---------------------------------------------------------------------
  // Método de teste 1: criação (constructor)
  // ---------------------------------------------------------------------
  describe('criação', () => {
    test('caso 1: cria necessidade válida com status ABERTA e nada arrecadado', () => {
      const n = novaNecessidade();

      expect(n.id).toEqual(expect.any(String));
      expect(n.tipo).toBe(TipoNecessidade.MATERIAL_ESPORTIVO);
      expect(n.descricao).toBe('Chuteira de futsal nº 33');
      expect(n.valorEstimado).toBe(150);
      expect(n.valorArrecadado).toBe(0);
      expect(n.status).toBe(StatusNecessidade.ABERTA);
    });

    test('caso 2: remove espaços extras da descrição', () => {
      expect(novaNecessidade({ descricao: '  Uniforme de treino  ' }).descricao).toBe('Uniforme de treino');
    });

    test.each([
      ['tipo inexistente', { tipo: 'COMIDA' }, /Tipo de necessidade inválido/],
      ['descrição vazia', { descricao: '   ' }, /Descrição é obrigatória/],
      ['valor zero', { valorEstimado: 0 }, /maior que zero/],
      ['valor negativo', { valorEstimado: -10 }, /maior que zero/],
      ['valor não numérico', { valorEstimado: '150' }, /maior que zero/],
      ['mais de 2 casas decimais', { valorEstimado: 10.555 }, /duas casas decimais/],
    ])('caso inválido: rejeita %s', (_nome, dados, erro) => {
      expect(() => novaNecessidade(dados)).toThrow(erro);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 2: registrarDoacao()
  // ---------------------------------------------------------------------
  describe('registrarDoacao()', () => {
    test('caso 1: soma doações parciais e mantém a necessidade ABERTA', () => {
      const n = novaNecessidade();

      n.registrarDoacao(50);
      n.registrarDoacao(70);

      expect(n.valorArrecadado).toBe(120);
      expect(n.status).toBe(StatusNecessidade.ABERTA);
    });

    test('caso 2: muda para ATENDIDA quando a meta é atingida exatamente', () => {
      const n = novaNecessidade({ valorEstimado: 80 });

      n.registrarDoacao(60);
      n.registrarDoacao(20);

      expect(n.valorArrecadado).toBe(80);
      expect(n.status).toBe(StatusNecessidade.ATENDIDA);
    });

    test('caso 3: soma centavos sem erro de ponto flutuante', () => {
      const n = novaNecessidade({ valorEstimado: 1 });

      n.registrarDoacao(0.1);
      n.registrarDoacao(0.2);

      expect(n.valorArrecadado).toBe(0.3);
    });

    test('caso 4: rejeita doação maior que o restante da meta', () => {
      const n = novaNecessidade();
      n.registrarDoacao(120);

      expect(() => n.registrarDoacao(31)).toThrow(/excede o restante/);
      expect(n.valorArrecadado).toBe(120);
    });

    test.each([0, -20, NaN, Infinity])('caso inválido: rejeita valor %p', (valor) => {
      expect(() => novaNecessidade().registrarDoacao(valor)).toThrow(/maior que zero/);
    });

    test.each([
      ['ATENDIDA', (n) => n.registrarDoacao(150)],
      ['ENCERRADA', (n) => n.encerrar()],
    ])('caso inválido: rejeita doação para necessidade %s', (status, prepararEstado) => {
      const n = novaNecessidade();
      prepararEstado(n);

      expect(() => n.registrarDoacao(10)).toThrow(`status ${status}`);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 3: percentualArrecadado()
  // (mesmos números do wireframe do perfil da criança – Figura 4.3)
  // ---------------------------------------------------------------------
  describe('percentualArrecadado()', () => {
    test.each([
      [150, 0, 0],
      [150, 120, 80], // Chuteira de futsal nº 33
      [80, 60, 75], // Mensalidade da escolinha
      [90, 30, 33], // Uniforme de treino: 33,33% arredonda para baixo
      [80, 80, 100],
    ])('meta R$ %p com R$ %p arrecadados => %p%%', (meta, arrecadado, esperado) => {
      const n = novaNecessidade({ valorEstimado: meta });
      if (arrecadado > 0) n.registrarDoacao(arrecadado);

      expect(n.percentualArrecadado()).toBe(esperado);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 4: valorRestante()
  // ---------------------------------------------------------------------
  describe('valorRestante()', () => {
    test('caso 1: sem doações, o restante é a própria meta', () => {
      expect(novaNecessidade({ valorEstimado: 90 }).valorRestante()).toBe(90);
    });

    test('caso 2: desconta o que já foi arrecadado', () => {
      const n = novaNecessidade({ valorEstimado: 150 });
      n.registrarDoacao(120.5);

      expect(n.valorRestante()).toBe(29.5);
    });

    test('caso 3: é zero quando a necessidade foi atendida', () => {
      const n = novaNecessidade({ valorEstimado: 50 });
      n.registrarDoacao(50);

      expect(n.valorRestante()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 5: editar()
  // ---------------------------------------------------------------------
  describe('editar()', () => {
    test('caso 1: altera descrição e valor estimado de uma necessidade aberta', () => {
      const n = novaNecessidade();

      n.editar({ descricao: 'Chuteira de campo nº 34', valorEstimado: 200 });

      expect(n.descricao).toBe('Chuteira de campo nº 34');
      expect(n.valorEstimado).toBe(200);
      expect(n.status).toBe(StatusNecessidade.ABERTA);
    });

    test('caso 2: reduzir a meta até o valor arrecadado marca como ATENDIDA', () => {
      const n = novaNecessidade();
      n.registrarDoacao(120);

      n.editar({ valorEstimado: 120 });

      expect(n.status).toBe(StatusNecessidade.ATENDIDA);
    });

    test('caso 3: rejeita meta menor que o valor já arrecadado sem alterar nada', () => {
      const n = novaNecessidade();
      n.registrarDoacao(120);

      expect(() => n.editar({ descricao: 'Nova', valorEstimado: 100 })).toThrow(/menor que o valor já arrecadado/);
      expect(n.valorEstimado).toBe(150);
      expect(n.descricao).toBe('Chuteira de futsal nº 33');
    });

    test('caso 4: rejeita descrição vazia', () => {
      expect(() => novaNecessidade().editar({ descricao: '' })).toThrow(/Descrição é obrigatória/);
    });

    test('caso 5: não permite editar necessidade encerrada', () => {
      const n = novaNecessidade();
      n.encerrar();

      expect(() => n.editar({ descricao: 'Outra' })).toThrow(/Só é possível editar necessidades abertas/);
    });
  });

  // ---------------------------------------------------------------------
  // Método de teste 6: encerrar() / estaAberta()
  // ---------------------------------------------------------------------
  describe('encerrar()', () => {
    test('caso 1: encerra uma necessidade aberta', () => {
      const n = novaNecessidade();
      expect(n.estaAberta()).toBe(true);

      n.encerrar();

      expect(n.status).toBe(StatusNecessidade.ENCERRADA);
      expect(n.estaAberta()).toBe(false);
    });

    test('caso 2: não encerra uma necessidade já encerrada', () => {
      const n = novaNecessidade();
      n.encerrar();

      expect(() => n.encerrar()).toThrow(/já está ENCERRADA/);
    });

    test('caso 3: não encerra uma necessidade já atendida', () => {
      const n = novaNecessidade({ valorEstimado: 20 });
      n.registrarDoacao(20);

      expect(() => n.encerrar()).toThrow(/já está ATENDIDA/);
    });
  });
});
