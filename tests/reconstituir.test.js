'use strict';

const { Escolinha, StatusEscolinha } = require('../src/domain/Escolinha');
const { Crianca } = require('../src/domain/Crianca');
const { Necessidade, StatusNecessidade, TipoNecessidade } = require('../src/domain/Necessidade');

// Reconstituir é o caminho de volta do banco: devolve o objeto no estado salvo, sem repetir
// as validações de criação (uma criança cadastrada com 17 anos pode ter 18 quando for lida).
describe('reconstituir objetos do domínio a partir do que foi salvo', () => {
  test('Escolinha volta com o status e o motivo de rejeição salvos', () => {
    const escolinha = Escolinha.reconstituir({
      id: 'e1', nome: 'Bola', cidade: 'Recife', uf: 'PE', status: StatusEscolinha.REJEITADA, motivoRejeicao: 'Sem CNPJ',
    });

    expect(escolinha).toBeInstanceOf(Escolinha);
    expect(escolinha).toMatchObject({ id: 'e1', nome: 'Bola', cidade: 'Recife', uf: 'PE', status: 'REJEITADA', motivoRejeicao: 'Sem CNPJ' });
    expect(() => escolinha.aprovar()).toThrow('Só é possível aprovar escolinhas pendentes');
  });

  test('Escolinha sem motivo guarda null', () => {
    const escolinha = Escolinha.reconstituir({ id: 'e1', nome: 'Bola', cidade: 'Recife', uf: 'PE', status: 'APROVADA' });

    expect(escolinha.motivoRejeicao).toBeNull();
    expect(escolinha.estaAprovada()).toBe(true);
  });

  test('Necessidade volta com meta, arrecadado e status, e segue aceitando doações', () => {
    const n = Necessidade.reconstituir({
      id: 'n1', tipo: TipoNecessidade.FINANCEIRA, descricao: 'Mensalidade', estimadoCentavos: 10000, arrecadadoCentavos: 2500, status: StatusNecessidade.ABERTA,
    });

    expect(n).toBeInstanceOf(Necessidade);
    expect(n.valorEstimado).toBe(100);
    expect(n.valorArrecadado).toBe(25);
    expect(n.valorRestante()).toBe(75);
    n.registrarDoacao(75);
    expect(n.status).toBe(StatusNecessidade.ATENDIDA);
  });

  test('Crianca volta mesmo com mais de 17 anos hoje, sem expor dados restritos no JSON', () => {
    const c = Crianca.reconstituir({
      id: 'c1', escolinhaId: 'e1', apelido: 'Mari', nomeCivil: 'Maria Silva', dataNascimento: '2000-01-31',
      endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cep: '50000-000', cidade: 'Recife', uf: 'PE' },
      necessidades: [],
    });

    expect(c).toBeInstanceOf(Crianca);
    expect(c.cidade).toBe('Recife');
    expect(c.uf).toBe('PE');
    expect(c.dadosRestritos()).toEqual({
      nomeCivil: 'Maria Silva',
      dataNascimento: '2000-01-31',
      endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cep: '50000-000', cidade: 'Recife', uf: 'PE' },
    });
    expect(JSON.stringify(c)).not.toContain('Maria Silva');
  });

  test('Crianca reconstituída traz as necessidades e as ativas aparecem no perfil', () => {
    const n = Necessidade.reconstituir({ id: 'n1', tipo: 'TRANSPORTE', descricao: 'Ônibus', estimadoCentavos: 5000, arrecadadoCentavos: 0, status: 'ABERTA' });
    const c = Crianca.reconstituir({
      id: 'c1', escolinhaId: 'e1', apelido: 'Mari', nomeCivil: 'Maria Silva', dataNascimento: '2016-01-31',
      endereco: { logradouro: 'Rua A', cidade: 'Recife', uf: 'PE' }, necessidades: [n],
    });

    expect(c.necessidades).toEqual([n]);
    expect(c.perfilPublico().necessidades).toHaveLength(1);
  });
});
