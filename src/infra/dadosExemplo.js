'use strict';

const { Escolinha } = require('../domain/Escolinha');
const { Necessidade, TipoNecessidade } = require('../domain/Necessidade');

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
 * Dados fictícios para demonstração. Nenhum nome ou endereço corresponde a pessoas reais.
 * `jaArrecadado` simula doações anteriores, só para as barras de progresso não começarem zeradas.
 */
const EXEMPLOS = [
  {
    escolinha: { nome: 'Escolinha Bola Pra Frente', cidade: 'São Paulo', uf: 'SP' },
    criancas: [
      {
        nomeCivil: 'Kauã Henrique Lima', idade: 10, apelido: 'Kauã', bairro: 'Jardim Ângela',
        necessidades: [
          { tipo: TipoNecessidade.MATERIAL_ESPORTIVO, descricao: 'Chuteira de futsal nº 34', valorEstimado: 180, jaArrecadado: 72 },
          { tipo: TipoNecessidade.TRANSPORTE, descricao: 'Bilhete de ônibus para os treinos (1 mês)', valorEstimado: 110 },
        ],
      },
      {
        nomeCivil: 'Lívia Santos Rocha', idade: 12, apelido: 'Lívia', bairro: 'Capão Redondo',
        necessidades: [
          { tipo: TipoNecessidade.MATERIAL_ESPORTIVO, descricao: 'Caneleira e meião', valorEstimado: 65, jaArrecadado: 40 },
        ],
      },
    ],
  },
  {
    escolinha: { nome: 'Projeto Craque do Amanhã', cidade: 'Rio de Janeiro', uf: 'RJ' },
    criancas: [
      {
        nomeCivil: 'Pedro Augusto Ferreira', idade: 9, apelido: 'Pedrinho', bairro: 'Penha',
        necessidades: [
          { tipo: TipoNecessidade.MATERIAL_ESPORTIVO, descricao: 'Uniforme completo de jogo', valorEstimado: 95, jaArrecadado: 20 },
          { tipo: TipoNecessidade.FINANCEIRA, descricao: 'Inscrição na Copa das Comunidades', valorEstimado: 50 },
        ],
      },
    ],
  },
  {
    escolinha: { nome: 'Associação Gol de Placa', cidade: 'Recife', uf: 'PE' },
    criancas: [
      {
        nomeCivil: 'Júlia Beatriz Nascimento', idade: 11, apelido: 'Juju', bairro: 'Ibura',
        necessidades: [
          { tipo: TipoNecessidade.FINANCEIRA, descricao: 'Taxa da federação para jogar o estadual sub-12', valorEstimado: 60, jaArrecadado: 45 },
        ],
      },
      {
        nomeCivil: 'Davi Lucas Barbosa', idade: 8, apelido: 'Davi', bairro: 'Várzea',
        necessidades: [
          { tipo: TipoNecessidade.MATERIAL_ESPORTIVO, descricao: 'Bola de futsal oficial', valorEstimado: 120 },
        ],
      },
    ],
  },
  {
    escolinha: { nome: 'Escolinha Pé de Moleque', cidade: 'Belo Horizonte', uf: 'MG' },
    criancas: [
      {
        nomeCivil: 'Gabriela Moreira Costa', idade: 13, apelido: 'Gabi', bairro: 'Barreiro',
        necessidades: [
          { tipo: TipoNecessidade.MATERIAL_ESPORTIVO, descricao: 'Chuteira de campo nº 36', valorEstimado: 210, jaArrecadado: 150 },
          { tipo: TipoNecessidade.TRANSPORTE, descricao: 'Van para o torneio em Contagem', valorEstimado: 80 },
        ],
      },
    ],
  },
];

/** Escolinha que fica pendente, para demonstrar a aprovação (UC-11). */
const ESCOLINHA_PENDENTE = { nome: 'Futebol na Comunidade', cidade: 'Salvador', uf: 'BA' };

/**
 * Preenche os repositórios com os exemplos acima, passando pelas mesmas regras de domínio do
 * cadastro real (escolinha aprovada, criança menor de 18, meta válida). Cada objeto é montado
 * por completo antes de ser salvo, como exige o repositório PostgreSQL.
 *
 * @returns {Promise<{escolinhas: number, criancas: number, necessidades: number}>} quantidades criadas
 */
async function carregarDadosExemplo({ escolinhas, criancas, necessidades }, hoje = new Date()) {
  const total = { escolinhas: 0, criancas: 0, necessidades: 0 };

  for (const exemplo of EXEMPLOS) {
    const escolinha = new Escolinha(exemplo.escolinha);
    escolinha.aprovar();
    await escolinhas.salvar(escolinha);
    total.escolinhas += 1;

    for (const dados of exemplo.criancas) {
      const crianca = escolinha.cadastrarCrianca({
        nomeCivil: dados.nomeCivil,
        dataNascimento: nascimentoComIdade(dados.idade, hoje),
        apelido: dados.apelido,
        endereco: { logradouro: 'Rua Exemplo', numero: '100', bairro: dados.bairro, cidade: escolinha.cidade, uf: escolinha.uf },
      });
      const novas = [];
      for (const { jaArrecadado, ...dadosNecessidade } of dados.necessidades) {
        const necessidade = new Necessidade(dadosNecessidade);
        if (jaArrecadado) {
          necessidade.registrarDoacao(jaArrecadado);
        }
        crianca.adicionarNecessidade(necessidade);
        novas.push(necessidade);
      }
      await criancas.salvar(crianca);
      total.criancas += 1;
      for (const necessidade of novas) {
        await necessidades.salvar(necessidade);
        total.necessidades += 1;
      }
    }
  }

  await escolinhas.salvar(new Escolinha(ESCOLINHA_PENDENTE));
  total.escolinhas += 1;

  return total;
}

module.exports = { carregarDadosExemplo, nascimentoComIdade };
