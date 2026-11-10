'use strict';

const express = require('express');
const { Escolinha } = require('../domain/Escolinha');
const { Necessidade } = require('../domain/Necessidade');
const { BuscaService } = require('../services/BuscaService');
const { DoacaoService, PagamentoRecusadoError } = require('../services/DoacaoService');
const { RepositorioEmMemoria } = require('../infra/RepositorioEmMemoria');
const { GatewayPagamentoSimulado } = require('../infra/GatewayPagamentoSimulado');
const { NotificadorEmMemoria } = require('../infra/NotificadorEmMemoria');
const { carregarDadosExemplo } = require('../infra/dadosExemplo');

/** Recurso inexistente; vira HTTP 404. */
class NaoEncontradoError extends Error {}

function buscarOuFalhar(repositorio, id, mensagem) {
  const item = repositorio.buscarPorId(id);
  if (!item) {
    throw new NaoEncontradoError(mensagem);
  }
  return item;
}

/**
 * Cria a API REST do DoaGol (RNF06: camadas api -> services -> domain -> infra).
 * Gateway e notificador podem ser trocados, o que permite testar recusa de pagamento e falhas.
 *
 * Ainda não há autenticação (UC-01): o doadorId vem no corpo da requisição e qualquer um
 * pode chamar as rotas. Aprovar escolinha (UC-11) é uma rota aberta por enquanto, e deverá
 * ficar restrita ao administrador quando o UC-01 for implementado.
 *
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.dadosExemplo]  carrega escolinhas, crianças e necessidades fictícias
 * @param {string|null} [opcoes.pastaPublica]  pasta do front-end (build do React) servida em '/'
 */
function criarApp({
  gateway = new GatewayPagamentoSimulado(),
  notificador = new NotificadorEmMemoria(),
  dadosExemplo = false,
  pastaPublica = null,
} = {}) {
  const escolinhas = new RepositorioEmMemoria();
  const criancas = new RepositorioEmMemoria();
  const necessidades = new RepositorioEmMemoria();
  const doacoes = new RepositorioEmMemoria();
  const busca = new BuscaService({ criancas });
  const doacaoService = new DoacaoService({ gateway, notificador, doacoes });

  if (dadosExemplo) {
    carregarDadosExemplo({ escolinhas, criancas, necessidades });
  }

  const app = express();

  // CORS: permite que o front-end hospedado em outro endereço (ex.: GitHub Pages) chame a API.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  app.use(express.json());

  app.get('/saude', (req, res) => {
    res.json({ status: 'ok' });
  });

  // UC-02: cadastro da escolinha, que nasce PENDENTE.
  app.post('/escolinhas', (req, res) => {
    const { nome, cidade, uf } = req.body ?? {};
    const escolinha = escolinhas.salvar(new Escolinha({ nome, cidade, uf }));
    res.status(201).json(escolinha);
  });

  // Lista de escolinhas, usada pelo front-end no perfil da criança e no painel da escolinha.
  app.get('/escolinhas', (req, res) => {
    res.json(escolinhas.listar());
  });

  // UC-10 (parcial): crianças de uma escolinha, só com o perfil público.
  app.get('/escolinhas/:id/criancas', (req, res) => {
    const escolinha = buscarOuFalhar(escolinhas, req.params.id, 'Escolinha não encontrada.');
    res.json(criancas.listar().filter((c) => c.escolinhaId === escolinha.id).map((c) => c.perfilPublico()));
  });

  // UC-11: aprovação do cadastro (rota aberta até existir o papel de administrador).
  app.post('/escolinhas/:id/aprovar', (req, res) => {
    const escolinha = buscarOuFalhar(escolinhas, req.params.id, 'Escolinha não encontrada.');
    escolinha.aprovar();
    res.json(escolinha);
  });

  // UC-03: cadastro de criança. A resposta usa toJSON (perfil público), nunca os dados restritos.
  app.post('/escolinhas/:id/criancas', (req, res) => {
    const escolinha = buscarOuFalhar(escolinhas, req.params.id, 'Escolinha não encontrada.');
    const { nomeCivil, dataNascimento, endereco, apelido } = req.body ?? {};
    const crianca = criancas.salvar(escolinha.cadastrarCrianca({ nomeCivil, dataNascimento, endereco, apelido }));
    res.status(201).json(crianca);
  });

  // UC-04: cadastro de necessidade da criança.
  app.post('/criancas/:id/necessidades', (req, res) => {
    const crianca = buscarOuFalhar(criancas, req.params.id, 'Criança não encontrada.');
    const { tipo, descricao, valorEstimado } = req.body ?? {};
    const necessidade = new Necessidade({ tipo, descricao, valorEstimado });
    crianca.adicionarNecessidade(necessidade);
    necessidades.salvar(necessidade);
    res.status(201).json(crianca);
  });

  // UC-06: busca por cidade, UF e tipo de necessidade.
  app.get('/criancas', (req, res) => {
    const { cidade, uf, tipo } = req.query;
    const resultados = busca.buscar({ cidade, uf, tipo });
    const corpo = { total: resultados.length, resultados };
    if (resultados.length === 0) {
      corpo.mensagem = 'Nenhuma criança encontrada. Tente remover algum filtro.';
    }
    res.json(corpo);
  });

  // UC-07: perfil público da criança.
  app.get('/criancas/:id', (req, res) => {
    const crianca = buscarOuFalhar(criancas, req.params.id, 'Criança não encontrada.');
    res.json(crianca.perfilPublico());
  });

  // UC-08 e UC-09: doação e comprovante.
  app.post('/necessidades/:id/doacoes', async (req, res) => {
    const necessidade = buscarOuFalhar(necessidades, req.params.id, 'Necessidade não encontrada.');
    // ponytail: varre as crianças para achar a dona; trocar por chave estrangeira no PostgreSQL.
    const dona = criancas.listar().find((c) => c.necessidades.includes(necessidade));
    const { doadorId, valor, formaPagamento, anonima } = req.body ?? {};
    const comprovante = await doacaoService.realizar({
      necessidade,
      escolinhaId: dona.escolinhaId,
      doadorId,
      valor,
      formaPagamento,
      anonima,
    });
    res.status(201).json(comprovante);
  });

  // Front-end React já compilado (pasta public/), servido pela própria API no deploy.
  if (pastaPublica) {
    app.use(express.static(pastaPublica));
  }

  app.use((err, req, res, next) => {
    if (err instanceof NaoEncontradoError) {
      return res.status(404).json({ erro: err.message });
    }
    if (err instanceof PagamentoRecusadoError) {
      return res.status(402).json({ erro: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'JSON inválido.' });
    }
    // Outros erros de requisição do Express (corpo grande demais, charset inválido...) já trazem
    // o status 4xx; sem isto, viravam 500 e eram registrados como falha interna.
    const status = err.status ?? err.statusCode;
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      return res.status(status).json({ erro: status === 413 ? 'Corpo da requisição grande demais.' : 'Requisição inválida.' });
    }
    // Regras de negócio do domínio lançam Error simples; TypeError e afins são falhas internas.
    if (err.constructor === Error) {
      return res.status(400).json({ erro: err.message });
    }
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno.' });
  });

  return app;
}

module.exports = { criarApp, NaoEncontradoError };
