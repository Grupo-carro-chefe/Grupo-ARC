'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { descreverComBanco, criarBancoDeTeste } = require('./bancoDeTeste');

const { rodarMigrations } = require('../src/infra/postgres/migrations');
const { criarRepositoriosPostgres, semearSeVazio, iniciarPostgres } = require('../src/infra/postgres');
const { criarPool } = require('../src/infra/postgres/conexao');
const { escolinhaAprovada, dadosCrianca, novaNecessidade } = require('./helpers');
const { Escolinha } = require('../src/domain/Escolinha');
const { Doacao } = require('../src/domain/Doacao');
const { TipoNecessidade, StatusNecessidade } = require('../src/domain/Necessidade');

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

descreverComBanco('PostgreSQL real: migrations e repositórios', () => {
  let banco;
  let pool;
  let repos;

  beforeAll(async () => {
    banco = await criarBancoDeTeste();
    pool = banco.abrirPool();
    await rodarMigrations(pool);
    repos = criarRepositoriosPostgres(pool);
  });

  afterAll(async () => {
    await banco.encerrar();
  });

  /** Escolinha aprovada + criança com as necessidades dadas, tudo salvo no banco. */
  async function criarCrianca({ cidade = 'São Paulo', uf = 'SP', necessidades = [novaNecessidade()], apelido = 'Mari' } = {}) {
    const escolinha = escolinhaAprovada({ cidade, uf });
    await repos.escolinhas.salvar(escolinha);
    const crianca = escolinha.cadastrarCrianca(dadosCrianca({ apelido, endereco: { logradouro: 'Rua A', numero: '1', cidade, uf } }));
    necessidades.forEach((n) => crianca.adicionarNecessidade(n));
    await repos.criancas.salvar(crianca);
    return { escolinha, crianca };
  }

  describe('migrations', () => {
    test('aplicam o esquema, registram o nome e não repetem na segunda execução', async () => {
      const { rows } = await pool.query('SELECT nome FROM schema_migrations');
      expect(rows.map((r) => r.nome)).toEqual(['001_inicial.sql', '002_status_coerente.sql']);

      expect(await rodarMigrations(pool)).toEqual([]);
    });

    test('várias instâncias subindo juntas aplicam uma única vez', async () => {
      const outro = await criarBancoDeTeste();
      try {
        const poolsNovos = [outro.abrirPool(), outro.abrirPool(), outro.abrirPool(), outro.abrirPool()];

        const aplicadas = await Promise.all(poolsNovos.map((p) => rodarMigrations(p)));

        expect(aplicadas.flat()).toEqual(['001_inicial.sql', '002_status_coerente.sql']);
      } finally {
        await outro.encerrar();
      }
    });

    test('uma migration que falha desfaz tudo e não fica registrada', async () => {
      const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'migr-'));
      fs.writeFileSync(path.join(pasta, '001_ok.sql'), 'CREATE TABLE ok_tabela (id int);');
      fs.writeFileSync(path.join(pasta, '002_ruim.sql'), 'CREATE TABLE ruim_tabela (id int); SELECT coluna_que_nao_existe FROM ruim_tabela;');
      const outro = await criarBancoDeTeste();
      try {
        const p = outro.abrirPool();
        await expect(rodarMigrations(p, pasta)).rejects.toThrow();

        const { rows } = await p.query('SELECT nome FROM schema_migrations');
        expect(rows.map((r) => r.nome)).toEqual(['001_ok.sql']);
        const ruim = await p.query("SELECT to_regclass('ruim_tabela') AS t");
        expect(ruim.rows[0].t).toBeNull();
      } finally {
        await outro.encerrar();
        fs.rmSync(pasta, { recursive: true, force: true });
      }
    });

    test('o banco rejeita arrecadado acima da meta, mesmo que a aplicação erre', async () => {
      const { crianca } = await criarCrianca();
      const { id } = crianca.necessidades[0];

      await expect(pool.query(`UPDATE necessidades SET status = 'ENCERRADA', valor_arrecadado_centavos = 999999 WHERE id = $1`, [id])).rejects.toThrow(/necessidades_nao_excede_meta/);
    });

    test('chaves estrangeiras impedem criança sem escolinha e doação sem necessidade', async () => {
      const crianca = escolinhaAprovada().cadastrarCrianca(dadosCrianca());
      await expect(repos.criancas.salvar(crianca)).rejects.toThrow(/foreign key/);

      const doacao = new Doacao({ necessidadeId: ID_INEXISTENTE, doadorId: 'd', valor: 10, formaPagamento: 'PIX' });
      await expect(repos.doacoes.salvar(doacao)).rejects.toThrow(/foreign key/);
    });
  });

  describe('escolinhas', () => {
    test('salva, lê, atualiza o status e lista', async () => {
      const escolinha = await repos.escolinhas.salvar(new Escolinha({ nome: 'Bola Pra Frente', cidade: 'Recife', uf: 'pe' }));

      const lida = await repos.escolinhas.buscarPorId(escolinha.id);
      expect(lida).toMatchObject({ nome: 'Bola Pra Frente', cidade: 'Recife', uf: 'PE', status: 'PENDENTE', motivoRejeicao: null });
      expect(lida).toBeInstanceOf(Escolinha);

      lida.aprovar();
      await repos.escolinhas.salvar(lida);
      expect((await repos.escolinhas.buscarPorId(escolinha.id)).estaAprovada()).toBe(true);
      expect((await repos.escolinhas.listar()).map((e) => e.id)).toContain(escolinha.id);
    });

    test('guarda o motivo de rejeição', async () => {
      const escolinha = new Escolinha({ nome: 'X', cidade: 'Y', uf: 'SP' });
      escolinha.rejeitar('Documentos incompletos');
      await repos.escolinhas.salvar(escolinha);

      expect((await repos.escolinhas.buscarPorId(escolinha.id)).motivoRejeicao).toBe('Documentos incompletos');
    });

    test('id inexistente ou que não é UUID devolve null (vira 404, não erro do banco)', async () => {
      expect(await repos.escolinhas.buscarPorId(ID_INEXISTENTE)).toBeNull();
      expect(await repos.escolinhas.buscarPorId('abc')).toBeNull();
      expect(await repos.escolinhas.buscarPorId(undefined)).toBeNull();
    });
  });

  describe('crianças e necessidades', () => {
    test('a criança volta completa, com dados restritos e necessidades, sem vazar no JSON', async () => {
      const { crianca, escolinha } = await criarCrianca({ necessidades: [novaNecessidade({ valorEstimado: 99.9 })] });

      const lida = await repos.criancas.buscarPorId(crianca.id);

      expect(lida.escolinhaId).toBe(escolinha.id);
      expect(lida.dadosRestritos()).toEqual(crianca.dadosRestritos());
      expect(lida.idade()).toBe(crianca.idade());
      expect(lida.necessidades).toHaveLength(1);
      expect(lida.necessidades[0].valorEstimado).toBe(99.9);
      expect(lida.perfilPublico()).toEqual(crianca.perfilPublico());
      expect(JSON.stringify(lida)).not.toContain('Maria Aparecida');
    });

    test('endereço sem campos opcionais continua sem eles', async () => {
      const escolinha = escolinhaAprovada();
      await repos.escolinhas.salvar(escolinha);
      const crianca = escolinha.cadastrarCrianca(dadosCrianca({ endereco: { logradouro: 'Rua B', cidade: 'Recife', uf: 'PE' } }));
      await repos.criancas.salvar(crianca);

      expect((await repos.criancas.buscarPorId(crianca.id)).dadosRestritos().endereco).toEqual({ logradouro: 'Rua B', cidade: 'Recife', uf: 'PE' });
    });

    test('salvar de novo atualiza a criança e acrescenta só as necessidades novas', async () => {
      const { crianca } = await criarCrianca();
      crianca.adicionarNecessidade(novaNecessidade({ descricao: 'Segunda' }));

      await repos.criancas.salvar(crianca);

      expect((await repos.criancas.buscarPorId(crianca.id)).necessidades.map((n) => n.descricao).sort()).toEqual(['Chuteira de futsal nº 33', 'Segunda']);
    });

    test('salvar a criança com uma cópia velha não apaga o arrecadado de uma doação que entrou depois', async () => {
      const { crianca } = await criarCrianca();
      const velha = await repos.criancas.buscarPorId(crianca.id);
      const atual = (await repos.necessidades.buscarPorId(crianca.necessidades[0].id));
      await pool.query('UPDATE necessidades SET valor_arrecadado_centavos = 4000 WHERE id = $1', [atual.id]);

      await repos.criancas.salvar(velha);

      expect((await repos.necessidades.buscarPorId(atual.id)).valorArrecadado).toBe(40);
    });

    test('buscarPorNecessidadeId devolve a criança dona (chave estrangeira)', async () => {
      const { crianca } = await criarCrianca();

      expect((await repos.criancas.buscarPorNecessidadeId(crianca.necessidades[0].id)).id).toBe(crianca.id);
      expect(await repos.criancas.buscarPorNecessidadeId(ID_INEXISTENTE)).toBeNull();
      expect(await repos.criancas.buscarPorNecessidadeId('lixo')).toBeNull();
      expect(await repos.criancas.buscarPorId('lixo')).toBeNull();
    });

    test('necessidades.salvar muda só a descrição: nunca sobrescreve arrecadado nem status (L2)', async () => {
      const { crianca } = await criarCrianca({ necessidades: [novaNecessidade({ valorEstimado: 50 })] });
      const velha = await repos.necessidades.buscarPorId(crianca.necessidades[0].id);
      await pool.query(`UPDATE necessidades SET valor_arrecadado_centavos = 5000, status = 'ATENDIDA' WHERE id = $1`, [velha.id]);

      velha.descricao = 'Chuteira nº 35';
      await repos.necessidades.salvar(velha);

      const lida = await repos.necessidades.buscarPorId(velha.id);
      expect(lida.descricao).toBe('Chuteira nº 35');
      expect(lida.valorArrecadado).toBe(50);
      expect(lida.status).toBe(StatusNecessidade.ATENDIDA);
      expect((await repos.necessidades.listar()).map((x) => x.id)).toContain(velha.id);
      expect(await repos.necessidades.buscarPorId('lixo')).toBeNull();
      expect(await repos.necessidades.buscarPorId(ID_INEXISTENTE)).toBeNull();

      await expect(repos.necessidades.salvar(novaNecessidade())).rejects.toThrow('Necessidade não vinculada a uma criança');
    });

    test('encerrar só vale se ainda está ABERTA no banco; uma já atendida não é encerrada por cópia velha', async () => {
      const { crianca } = await criarCrianca({ necessidades: [novaNecessidade({ valorEstimado: 50 }), novaNecessidade({ valorEstimado: 50 })] });
      const [aberta, atendida] = await Promise.all(crianca.necessidades.map((n) => repos.necessidades.buscarPorId(n.id)));
      await pool.query(`UPDATE necessidades SET valor_arrecadado_centavos = 5000, status = 'ATENDIDA' WHERE id = $1`, [atendida.id]);

      aberta.encerrar();
      atendida.encerrar();
      await repos.necessidades.salvar(aberta);
      await repos.necessidades.salvar(atendida);

      expect((await repos.necessidades.buscarPorId(aberta.id)).status).toBe(StatusNecessidade.ENCERRADA);
      expect((await repos.necessidades.buscarPorId(atendida.id)).status).toBe(StatusNecessidade.ATENDIDA);
    });

    test('o banco recusa status incoerente com o arrecadado (L3)', async () => {
      const { crianca } = await criarCrianca({ necessidades: [novaNecessidade({ valorEstimado: 50 })] });
      const id = crianca.necessidades[0].id;

      await expect(pool.query(`UPDATE necessidades SET status = 'ATENDIDA' WHERE id = $1`, [id])).rejects.toThrow(/necessidades_atendida_completa/);
      await expect(pool.query('UPDATE necessidades SET valor_arrecadado_centavos = 5000 WHERE id = $1', [id])).rejects.toThrow(/necessidades_aberta_incompleta/);
      // ENCERRADA aceita qualquer valor arrecadado, e a atendida completa é válida.
      await pool.query(`UPDATE necessidades SET status = 'ENCERRADA', valor_arrecadado_centavos = 1000 WHERE id = $1`, [id]);
      await pool.query(`UPDATE necessidades SET status = 'ATENDIDA', valor_arrecadado_centavos = 5000 WHERE id = $1`, [id]);
    });
  });

  describe('listar com filtros (busca)', () => {
    let rec;
    let sp;
    let ambasEmSp;

    beforeAll(async () => {
      // Cidades com nomes próprios deste bloco, para não depender dos outros testes.
      rec = (await criarCrianca({ cidade: 'São José do Egito', uf: 'PE', necessidades: [novaNecessidade({ tipo: TipoNecessidade.FINANCEIRA })], apelido: 'A' })).crianca;
      sp = (await criarCrianca({ cidade: 'São José do Egito', uf: 'SP', necessidades: [novaNecessidade({ tipo: TipoNecessidade.TRANSPORTE })], apelido: 'B' })).crianca;
      ambasEmSp = (await criarCrianca({ cidade: 'Bauru', uf: 'SP', necessidades: [novaNecessidade({ tipo: TipoNecessidade.TRANSPORTE })], apelido: 'C' })).crianca;
    });

    const ids = (lista) => lista.map((c) => c.id).sort();

    test('cidade sem acento nem caixa, com índice em uf + cidade', async () => {
      expect(ids(await repos.criancas.listar({ cidade: ' SAO JOSE DO EGITO ' }))).toEqual(ids([rec, sp]));
      expect(ids(await repos.criancas.listar({ cidade: 'sao jose do egito', uf: 'pe' }))).toEqual([rec.id]);
    });

    test('tipo exige necessidade ABERTA daquele tipo', async () => {
      expect(ids(await repos.criancas.listar({ uf: 'SP', cidade: 'Bauru', tipo: 'TRANSPORTE' }))).toEqual([ambasEmSp.id]);
      expect(await repos.criancas.listar({ uf: 'SP', cidade: 'Bauru', tipo: 'FINANCEIRA' })).toEqual([]);

      const n = await repos.necessidades.buscarPorId(ambasEmSp.necessidades[0].id);
      n.encerrar();
      await repos.necessidades.salvar(n);
      expect(await repos.criancas.listar({ cidade: 'Bauru', tipo: 'TRANSPORTE' })).toEqual([]);
      expect(await repos.criancas.listar({ cidade: 'Bauru', comNecessidadeAberta: true })).toEqual([]);
      expect(ids(await repos.criancas.listar({ cidade: 'Bauru' }))).toEqual([ambasEmSp.id]);
    });

    test('filtra por escolinha, e id que não é UUID não acha nada', async () => {
      expect(ids(await repos.criancas.listar({ escolinhaId: rec.escolinhaId }))).toEqual([rec.id]);
      expect(await repos.criancas.listar({ escolinhaId: 'lixo' })).toEqual([]);
    });

    test('sem filtros lista todas; sem resultado devolve lista vazia', async () => {
      expect((await repos.criancas.listar()).length).toBeGreaterThanOrEqual(3);
      expect(await repos.criancas.listar({ cidade: 'Cidade Que Nao Existe' })).toEqual([]);
    });
  });

  describe('doações', () => {
    test('salva e lê a doação com valor, data e anonimato idênticos', async () => {
      const { crianca } = await criarCrianca();
      const doacao = new Doacao({ necessidadeId: crianca.necessidades[0].id, doadorId: 'doador-1', valor: 12.34, formaPagamento: 'PIX', anonima: true, transacaoId: 'SIM-1' });

      await repos.doacoes.salvar(doacao);

      const lida = await repos.doacoes.buscarPorId(doacao.id);
      expect(lida).toEqual(doacao);
      expect((await repos.doacoes.listar()).map((d) => d.id)).toContain(doacao.id);
      expect(await repos.doacoes.buscarPorId('lixo')).toBeNull();
      expect(await repos.doacoes.buscarPorId(ID_INEXISTENTE)).toBeNull();
    });

    test('doação é imutável: salvar o mesmo id duas vezes é erro', async () => {
      const { crianca } = await criarCrianca();
      const doacao = new Doacao({ necessidadeId: crianca.necessidades[0].id, doadorId: 'd', valor: 5, formaPagamento: 'PIX' });
      await repos.doacoes.salvar(doacao);

      await expect(repos.doacoes.salvar(doacao)).rejects.toThrow(/duplicate key/);
    });
  });
});

descreverComBanco('PostgreSQL real: carga dos dados de exemplo', () => {
  let banco;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await rodarMigrations(banco.abrirPool());
  });

  afterEach(async () => {
    await banco.encerrar();
  });

  test('semeia o banco vazio uma vez e não duplica na segunda', async () => {
    const pool = banco.abrirPool();

    expect(await semearSeVazio(pool)).toBe(true);
    expect(await semearSeVazio(pool)).toBe(false);

    const repos = criarRepositoriosPostgres(pool);
    expect(await repos.escolinhas.listar()).toHaveLength(12);
    expect(await repos.criancas.listar()).toHaveLength(24);
    expect(await repos.necessidades.listar()).toHaveLength(42);
    expect((await repos.doacoes.listar()).length).toBeGreaterThan(60);
    expect((await repos.criancas.listar())[0].apelido).toBe('Kauã');

    // A soma das doações grava exatamente o arrecadado de cada necessidade (L8).
    const { rows } = await pool.query(
      `SELECT count(*)::int AS divergentes FROM necessidades n
        WHERE n.valor_arrecadado_centavos <> COALESCE((SELECT sum(valor_centavos) FROM doacoes d WHERE d.necessidade_id = n.id), 0)`,
    );
    expect(rows[0].divergentes).toBe(0);
  });

  test('duas instâncias subindo juntas semeiam uma vez só', async () => {
    const resultados = await Promise.all([semearSeVazio(banco.abrirPool()), semearSeVazio(banco.abrirPool()), semearSeVazio(banco.abrirPool())]);

    expect(resultados.filter(Boolean)).toHaveLength(1);
    const { rows } = await banco.abrirPool().query('SELECT count(*)::int AS n FROM escolinhas');
    expect(rows[0].n).toBe(12);
  });

  test('banco que já tem dados não recebe os exemplos', async () => {
    const pool = banco.abrirPool();
    await criarRepositoriosPostgres(pool).escolinhas.salvar(new Escolinha({ nome: 'Real', cidade: 'Natal', uf: 'RN' }));

    expect(await semearSeVazio(pool)).toBe(false);
    expect(await criarRepositoriosPostgres(pool).escolinhas.listar()).toHaveLength(1);
  });

  test('se a carga falhar no meio, nada fica gravado e a próxima tentativa semeia', async () => {
    const pool = banco.abrirPool();
    const falha = async ({ escolinhas }) => {
      await escolinhas.salvar(new Escolinha({ nome: 'Metade', cidade: 'Natal', uf: 'RN' }));
      throw new Error('queda no meio da carga');
    };

    await expect(semearSeVazio(pool, falha)).rejects.toThrow('queda no meio');
    expect(await criarRepositoriosPostgres(pool).escolinhas.listar()).toHaveLength(0);
    expect(await semearSeVazio(pool)).toBe(true);
  });
});

descreverComBanco('PostgreSQL real: inicialização', () => {
  let banco;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
  });

  afterEach(async () => {
    await banco.encerrar();
  });

  test('iniciarPostgres aplica as migrations, semeia só na primeira vez e entrega repositórios e trava', async () => {
    const opcoesPool = { options: `-c search_path=${banco.schema}` };

    const primeira = await iniciarPostgres(process.env.DATABASE_URL_TESTE, { semear: true, opcoesPool });
    const segunda = await iniciarPostgres(process.env.DATABASE_URL_TESTE, { semear: true, opcoesPool });
    try {
      expect(primeira.semeou).toBe(true);
      expect(segunda.semeou).toBe(false);
      expect(await segunda.repositorios.escolinhas.listar()).toHaveLength(12);
      expect(typeof segunda.bloqueio.executar).toBe('function');
    } finally {
      await primeira.pool.end();
      await segunda.pool.end();
    }
  });

  test('sem semear, o banco fica vazio', async () => {
    const opcoesPool = { options: `-c search_path=${banco.schema}` };

    const iniciado = await iniciarPostgres(process.env.DATABASE_URL_TESTE, { opcoesPool });
    try {
      expect(iniciado.semeou).toBe(false);
      expect(await iniciado.repositorios.escolinhas.listar()).toHaveLength(0);
    } finally {
      await iniciado.pool.end();
    }
  });

  test('se não conseguir conectar, falha e não deixa o pool aberto', async () => {
    await expect(iniciarPostgres('postgresql://u:p@127.0.0.1:1/db', { opcoesPool: { connectionTimeoutMillis: 2000 } })).rejects.toThrow();
  });

  test('criarPool conecta e uma conexão ociosa que cai vai para o log sem derrubar o processo', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const pool = criarPool(process.env.DATABASE_URL_TESTE);
    try {
      expect((await pool.query('SELECT 1 AS um')).rows[0].um).toBe(1);

      pool.emit('error', Object.assign(new Error('terminating connection'), { code: '57P01' }));

      expect(log).toHaveBeenCalledWith('Conexão ociosa com o banco falhou:', '57P01');
    } finally {
      log.mockRestore();
      await pool.end();
    }
  });
});
