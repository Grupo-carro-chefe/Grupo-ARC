'use strict';

const { Escolinha } = require('../domain/Escolinha');
const { Necessidade, TipoNecessidade } = require('../domain/Necessidade');
const { Doacao, FormaPagamento } = require('../domain/Doacao');

const { MATERIAL_ESPORTIVO: M, FINANCEIRA: F, TRANSPORTE: T } = TipoNecessidade;

/**
 * Data 'AAAA-MM-DD' de alguém que fez `anos` anos há cerca de dois meses. Calculada a partir de
 * hoje para que as idades dos exemplos continuem válidas (menores de 18) com o passar do tempo.
 */
function nascimentoComIdade(anos, hoje = new Date()) {
  const data = new Date(Date.UTC(hoje.getUTCFullYear() - anos, hoje.getUTCMonth(), 1));
  data.setUTCMonth(data.getUTCMonth() - 2);
  return data.toISOString().slice(0, 10);
}

/**
 * Dados fictícios para demonstração: nomes de escolinhas, de crianças, bairros e doadores são
 * inventados e não correspondem a pessoas ou entidades reais. As cidades são reais.
 * São 12 escolinhas (10 aprovadas, 1 pendente e 1 rejeitada), 24 crianças e 42 necessidades.
 */
const ESCOLINHAS = [
  // As quatro primeiras e as seis primeiras crianças são as originais do MVP (prints e tour).
  { chave: 'sp', nome: 'Escolinha Bola Pra Frente', cidade: 'São Paulo', uf: 'SP' },
  { chave: 'rj', nome: 'Projeto Craque do Amanhã', cidade: 'Rio de Janeiro', uf: 'RJ' },
  { chave: 'rec', nome: 'Associação Gol de Placa', cidade: 'Recife', uf: 'PE' },
  { chave: 'bh', nome: 'Escolinha Pé de Moleque', cidade: 'Belo Horizonte', uf: 'MG' },
  { chave: 'camp', nome: 'Projeto Chuteira Cidadã', cidade: 'Campinas', uf: 'SP' },
  { chave: 'ube', nome: 'Projeto Futuro em Campo', cidade: 'Uberlândia', uf: 'MG' },
  { chave: 'for', nome: 'Escolinha Craques do Mucuripe', cidade: 'Fortaleza', uf: 'CE' },
  { chave: 'man', nome: 'Projeto Varzeanos do Norte', cidade: 'Manaus', uf: 'AM' },
  { chave: 'poa', nome: 'Escolinha Gurizada em Campo', cidade: 'Porto Alegre', uf: 'RS' },
  { chave: 'goi', nome: 'Escolinha Bola no Cerrado', cidade: 'Goiânia', uf: 'GO' },
];

/** Fica pendente, para demonstrar a aprovação (UC-11). */
const ESCOLINHA_PENDENTE = { nome: 'Futebol na Comunidade', cidade: 'Salvador', uf: 'BA' };

/** Rejeitada, para demonstrar o motivo da rejeição. */
const ESCOLINHA_REJEITADA = {
  nome: 'Escolinha Maré de Gols',
  cidade: 'Niterói',
  uf: 'RJ',
  motivo: 'Documentação do responsável legal incompleta: reenviar o termo de responsabilidade assinado.',
};

/**
 * Crianças: [escolinha, nome civil, apelido, idade, bairro, necessidades], com cada necessidade
 * como [tipo, descrição, meta em R$, arrecadado em R$]. O arrecadado não é gravado direto: vira
 * doações fictícias registradas pelo mesmo fluxo da doação real (ver `dividirEmDoacoes`).
 */
const CRIANCAS = [
  ['sp', 'Kauã Henrique Lima', 'Kauã', 10, 'Jardim Ângela', [
    [M, 'Chuteira de futsal nº 34', 180, 72],
    [T, 'Bilhete de ônibus para os treinos (1 mês)', 110, 0],
  ]],
  ['sp', 'Lívia Santos Rocha', 'Lívia', 12, 'Capão Redondo', [
    [M, 'Caneleira e meião', 65, 40],
  ]],
  ['rj', 'Pedro Augusto Ferreira', 'Pedrinho', 9, 'Penha', [
    [M, 'Uniforme completo de jogo', 95, 20],
    [F, 'Inscrição na Copa das Comunidades', 50, 0],
  ]],
  ['rec', 'Júlia Beatriz Nascimento', 'Juju', 11, 'Ibura', [
    [F, 'Taxa da federação para jogar o estadual sub-12', 60, 45],
  ]],
  ['rec', 'Davi Lucas Barbosa', 'Davi', 8, 'Várzea', [
    [M, 'Bola de futsal oficial', 120, 0],
  ]],
  ['bh', 'Gabriela Moreira Costa', 'Gabi', 13, 'Barreiro', [
    [M, 'Chuteira de campo nº 36', 210, 150],
    [T, 'Van para o torneio em Contagem', 80, 0],
  ]],
  ['sp', 'Thiago Almeida Souza', 'Thiago', 9, 'Itaquera', [
    [M, 'Luvas de goleiro infantis', 140, 105],
    [F, 'Lanche pós-treino do mês', 60, 12],
  ]],
  ['camp', 'Miguel Ângelo Pereira', 'Miguel', 11, 'Jardim Eulina', [
    [M, 'Chuteira society nº 35', 160, 128],
    [T, 'Passe de ônibus mensal para os treinos', 90, 30],
  ]],
  ['camp', 'Ana Clara Ribeiro', 'Aninha', 13, 'Parque Itália', [
    [M, 'Uniforme completo (camisa, calção e meiões)', 110, 110],
    [F, 'Inscrição no torneio regional', 75, 20],
  ]],
  ['rj', 'Gustavo Henrique Tavares', 'Guga', 14, 'Madureira', [
    [M, 'Chuteira de campo profissional nº 40', 400, 140],
    [T, 'Passagem para o torneio em Niterói', 70, 66],
  ]],
  ['rj', 'Isabela Cristina Duarte', 'Bela', 10, 'Realengo', [
    [M, 'Bola oficial nº 4', 130, 0],
    [F, 'Lanche pós-treino (2 meses)', 100, 45],
  ]],
  ['bh', 'Matheus Gomes Pinheiro', 'Teteu', 12, 'Venda Nova', [
    [M, 'Caneleira e meião', 55, 52],
    [F, 'Inscrição no torneio municipal', 85, 17],
  ]],
  ['bh', 'Rafaela Lopes Andrade', 'Rafa', 9, 'Santa Efigênia', [
    [M, 'Chuteira de futsal nº 32', 150, 0],
    [M, 'Uniforme completo', 95, 80],
  ]],
  ['ube', 'Enzo Gabriel Martins', 'Enzinho', 8, 'Santa Mônica', [
    [M, 'Chuteira nº 31', 120, 60],
    [T, 'Transporte para os jogos (1 mês)', 100, 25],
  ]],
  ['ube', 'Nathália Ferreira Cruz', 'Nath', 15, 'Luizote de Freitas', [
    [M, 'Kit de treino completo', 190, 171],
    [F, 'Taxa de arbitragem do torneio', 45, 45],
  ]],
  ['rec', 'João Pedro Cavalcanti', 'JP', 10, 'Casa Amarela', [
    [M, 'Luvas e kit de goleiro', 160, 40],
    [T, 'Bilhete de ônibus (1 mês)', 95, 76],
  ]],
  ['for', 'Francisco Wesley Lima', 'Chiquinho', 13, 'Mucuripe', [
    [M, 'Chuteira de campo nº 38', 200, 50],
  ]],
  ['for', 'Maria Eduarda Sales', 'Duda', 11, 'Messejana', [
    [M, 'Uniforme completo', 100, 35],
    [F, 'Inscrição no campeonato cearense sub-12', 120, 0],
  ]],
  ['man', 'Ítalo Souza Barroso', 'Ítalo', 12, 'Cidade Nova', [
    [M, 'Chuteira de futsal nº 36', 170, 68],
    [T, 'Transporte até a quadra (1 mês)', 80, 20],
  ]],
  ['man', 'Larissa Pinto Azevedo', 'Lari', 10, 'Compensa', [
    [M, 'Bola de futsal oficial', 120, 114],
    [M, 'Par de meiões', 30, 0],
  ]],
  ['poa', 'Lucas Rafael Becker', 'Luquinha', 14, 'Restinga', [
    [M, 'Chuteira de campo nº 41', 250, 75],
    [F, 'Inscrição no torneio da capital', 90, 72],
  ]],
  ['poa', 'Sofia Machado Prestes', 'Sofi', 9, 'Sarandi', [
    [M, 'Kit de goleiro infantil', 180, 0],
  ]],
  ['goi', 'Arthur Miguel Ramos', 'Tutu', 11, 'Jardim América', [
    [M, 'Chuteira society nº 37', 190, 38],
    [F, 'Lanche pós-treino (1 mês)', 50, 40],
  ]],
  ['goi', 'Yasmin Vitória Cardoso', 'Yas', 12, 'Setor Pedro Ludovico', [
    [M, 'Uniforme completo', 105, 21],
  ]],
];

const DOADORES = 18;
const FORMAS = [FormaPagamento.PIX, FormaPagamento.PIX, FormaPagamento.CARTAO_CREDITO, FormaPagamento.BOLETO];
const DIAS_DE_HISTORICO = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Gerador pseudoaleatório com semente (mulberry32): a mesma carga sai igual em toda execução. */
function criarGerador(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Divide `total` (R$ inteiros) em até 5 doações de pelo menos R$ 1 cuja soma é exatamente `total`.
 * Os totais pequenos viram menos doações.
 */
function dividirEmDoacoes(total, sortear) {
  const quantidade = Math.min(total, 1 + Math.floor(sortear() * 5));
  const pesos = Array.from({ length: quantidade }, () => 0.5 + sortear());
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const valores = pesos.map((peso) => Math.max(1, Math.floor((total * peso) / somaPesos)));
  // Ajusta a diferença de arredondamento nas doações maiores, sem deixar nenhuma abaixo de R$ 1.
  let diferenca = total - valores.reduce((a, b) => a + b, 0);
  for (let i = 0; diferenca !== 0; i = (i + 1) % valores.length) {
    const passo = diferenca > 0 ? 1 : -1;
    if (valores[i] + passo >= 1) {
      valores[i] += passo;
      diferenca -= passo;
    }
  }
  return valores;
}

/**
 * Doações fictícias de uma necessidade, registradas pelo próprio domínio (`registrarDoacao`):
 * o arrecadado e o status da necessidade resultam delas, e a soma das doações sempre bate.
 * Várias são anônimas; as datas ficam espalhadas nos últimos 30 dias.
 */
function registrarDoacoesDeExemplo(necessidade, total, sortear, hoje) {
  const doacoes = [];
  for (const valor of dividirEmDoacoes(total, sortear)) {
    necessidade.registrarDoacao(valor);
    const atras = Math.floor(sortear() * DIAS_DE_HISTORICO * DIA_MS);
    doacoes.push(new Doacao({
      necessidadeId: necessidade.id,
      doadorId: `doador${String(1 + Math.floor(sortear() * DOADORES)).padStart(2, '0')}@exemplo.com`,
      valor,
      formaPagamento: FORMAS[Math.floor(sortear() * FORMAS.length)],
      anonima: sortear() < 0.4,
      transacaoId: `SIM-EXEMPLO-${Math.floor(sortear() * 1e9).toString(36).toUpperCase()}`,
      data: new Date(hoje.getTime() - atras),
    }));
  }
  return doacoes;
}

/**
 * Preenche os repositórios com os exemplos acima, passando pelas mesmas regras de domínio do
 * cadastro real (escolinha aprovada, criança menor de 18, meta válida, doação dentro da meta).
 * Cada objeto é montado por completo antes de ser salvo, como exige o repositório PostgreSQL:
 * a criança entra com as necessidades já com o arrecadado das doações, e só depois as doações
 * são gravadas. Determinística: sem `Math.random`.
 *
 * @returns {Promise<{escolinhas: number, criancas: number, necessidades: number, doacoes: number}>}
 */
async function carregarDadosExemplo({ escolinhas, criancas, necessidades, doacoes }, hoje = new Date()) {
  const total = { escolinhas: 0, criancas: 0, necessidades: 0, doacoes: 0 };
  const sortear = criarGerador(20261110);
  const aprovadas = new Map();

  for (const { chave, ...dados } of ESCOLINHAS) {
    const escolinha = new Escolinha(dados);
    escolinha.aprovar();
    await escolinhas.salvar(escolinha);
    aprovadas.set(chave, escolinha);
    total.escolinhas += 1;
  }
  await escolinhas.salvar(new Escolinha(ESCOLINHA_PENDENTE));
  const { motivo, ...dadosRejeitada } = ESCOLINHA_REJEITADA;
  const rejeitada = new Escolinha(dadosRejeitada);
  rejeitada.rejeitar(motivo);
  await escolinhas.salvar(rejeitada);
  total.escolinhas += 2;

  for (const [chave, nomeCivil, apelido, idade, bairro, pedidos] of CRIANCAS) {
    const escolinha = aprovadas.get(chave);
    const crianca = escolinha.cadastrarCrianca({
      nomeCivil,
      dataNascimento: nascimentoComIdade(idade, hoje),
      apelido,
      endereco: { logradouro: 'Rua Exemplo', numero: '100', bairro, cidade: escolinha.cidade, uf: escolinha.uf },
    });
    const doacoesDaCrianca = [];
    const novas = [];
    for (const [tipo, descricao, valorEstimado, arrecadado] of pedidos) {
      const necessidade = new Necessidade({ tipo, descricao, valorEstimado });
      if (arrecadado > 0) {
        doacoesDaCrianca.push(...registrarDoacoesDeExemplo(necessidade, arrecadado, sortear, hoje));
      }
      crianca.adicionarNecessidade(necessidade);
      novas.push(necessidade);
    }
    // A criança (com as necessidades e o arrecadado) entra primeiro: as doações têm chave estrangeira.
    await criancas.salvar(crianca);
    total.criancas += 1;
    for (const necessidade of novas) {
      await necessidades.salvar(necessidade);
      total.necessidades += 1;
    }
    for (const doacao of doacoesDaCrianca) {
      await doacoes.salvar(doacao);
      total.doacoes += 1;
    }
  }

  return total;
}

module.exports = { carregarDadosExemplo, nascimentoComIdade };
