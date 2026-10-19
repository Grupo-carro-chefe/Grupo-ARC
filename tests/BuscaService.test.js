'use strict';

const { BuscaService } = require('../src/services/BuscaService');
const { RepositorioEmMemoria } = require('../src/infra/RepositorioEmMemoria');
const { TipoNecessidade } = require('../src/domain/Necessidade');
const { novaCrianca, novaNecessidade } = require('./helpers');

/** Cria uma criança na cidade/UF dada, com necessidades dos tipos informados. */
function criancaEm(cidade, uf, tipos = [TipoNecessidade.MATERIAL_ESPORTIVO], apelido = cidade) {
  const c = novaCrianca({ apelido, endereco: { logradouro: 'Rua Secreta, 1', cidade, uf } });
  tipos.forEach((tipo) => c.adicionarNecessidade(novaNecessidade({ tipo })));
  return c;
}

describe('BuscaService (UC-06)', () => {
  let criancas;
  let busca;
  let sp;
  let campinas;
  let recife;

  beforeEach(() => {
    criancas = new RepositorioEmMemoria();
    busca = new BuscaService({ criancas });
    sp = criancas.salvar(criancaEm('São Paulo', 'SP', [TipoNecessidade.MATERIAL_ESPORTIVO]));
    campinas = criancas.salvar(criancaEm('Campinas', 'SP', [TipoNecessidade.TRANSPORTE, TipoNecessidade.FINANCEIRA]));
    recife = criancas.salvar(criancaEm('Recife', 'PE', [TipoNecessidade.FINANCEIRA]));
  });

  const ids = (resultados) => resultados.map((r) => r.id).sort();

  test('caso 1: sem filtros, traz todas as crianças com necessidade aberta', () => {
    expect(ids(busca.buscar())).toEqual(ids([sp, campinas, recife]));
  });

  test('caso 2: filtra por UF, ignorando caixa e espaços', () => {
    expect(ids(busca.buscar({ uf: ' sp ' }))).toEqual(ids([sp, campinas]));
  });

  test.each(['São Paulo', 'sao paulo', 'SAO PAULO', '  são paulo  ', 'SÃO PAULO'])(
    'caso 3: filtra por cidade sem diferenciar acento nem caixa ("%s")',
    (cidade) => {
      expect(ids(busca.buscar({ cidade }))).toEqual([sp.id]);
    },
  );

  test('caso 4: filtra por tipo de necessidade', () => {
    expect(ids(busca.buscar({ tipo: TipoNecessidade.FINANCEIRA }))).toEqual(ids([campinas, recife]));
  });

  test('caso 5: combina cidade, UF e tipo', () => {
    expect(ids(busca.buscar({ cidade: 'campinas', uf: 'SP', tipo: TipoNecessidade.TRANSPORTE }))).toEqual([campinas.id]);
    expect(busca.buscar({ cidade: 'Campinas', uf: 'PE' })).toEqual([]);
  });

  test('caso 6: filtros vazios são ignorados', () => {
    expect(busca.buscar({ cidade: '', uf: '', tipo: '' })).toHaveLength(3);
  });

  test('caso 7: não traz criança sem necessidades', () => {
    criancas.salvar(criancaEm('São Paulo', 'SP', []));

    expect(ids(busca.buscar({ cidade: 'São Paulo' }))).toEqual([sp.id]);
  });

  test('caso 8: não traz criança cujas necessidades foram encerradas ou atendidas', () => {
    sp.necessidades[0].encerrar();
    campinas.necessidades.forEach((n) => n.registrarDoacao(150));

    expect(ids(busca.buscar())).toEqual([recife.id]);
  });

  test('caso 9: com filtro de tipo, exige necessidade aberta daquele tipo', () => {
    campinas.necessidades.find((n) => n.tipo === TipoNecessidade.FINANCEIRA).encerrar();

    expect(ids(busca.buscar({ tipo: TipoNecessidade.FINANCEIRA }))).toEqual([recife.id]);
    expect(ids(busca.buscar({ tipo: TipoNecessidade.TRANSPORTE }))).toEqual([campinas.id]);
  });

  test('caso 10 (A1): nenhum resultado devolve lista vazia', () => {
    expect(busca.buscar({ cidade: 'Manaus' })).toEqual([]);
    expect(busca.buscar({ uf: 'AM' })).toEqual([]);
  });

  test('caso 11: tipo inválido lança erro', () => {
    expect(() => busca.buscar({ tipo: 'COMIDA' })).toThrow('Tipo de necessidade inválido: COMIDA.');
  });

  test('caso 12: devolve só o perfil público, sem dados sensíveis (RNF01)', () => {
    const [perfil] = busca.buscar({ cidade: 'Recife' });

    expect(perfil).toEqual(recife.perfilPublico());
    expect(JSON.stringify(perfil)).not.toContain('Maria Aparecida');
    expect(JSON.stringify(perfil)).not.toContain('Rua Secreta');
  });

  test('caso 13: repositório vazio devolve lista vazia', () => {
    expect(new BuscaService({ criancas: new RepositorioEmMemoria() }).buscar()).toEqual([]);
  });
});
