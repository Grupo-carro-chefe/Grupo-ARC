'use strict';

const { randomUUID } = require('crypto');
const { Necessidade } = require('./Necessidade');
const { textoObrigatorio, ufValida } = require('./validacoes');

const IDADE_MAXIMA = 17;

/** Converte 'AAAA-MM-DD' ou Date para uma data à meia-noite UTC, rejeitando datas inexistentes. */
function dataEmUtc(valor) {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new Error('Data de nascimento inválida.');
    }
    return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
  }
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error('Data de nascimento deve estar no formato AAAA-MM-DD.');
  }
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new Error(`Data de nascimento inexistente: ${valor}.`);
  }
  return data;
}

/** Idade em anos completos na data `hoje`, comparando dia e mês em UTC. */
function anosCompletos(nascimento, hoje) {
  const mesDia = (d) => d.getUTCMonth() * 100 + d.getUTCDate();
  const anos = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  return mesDia(hoje) < mesDia(nascimento) ? anos - 1 : anos;
}

function validarEndereco(endereco) {
  if (endereco === null || typeof endereco !== 'object') {
    throw new Error('Endereço é obrigatório.');
  }
  const validado = {
    logradouro: textoObrigatorio(endereco.logradouro, 'Logradouro'),
    cidade: textoObrigatorio(endereco.cidade, 'Cidade'),
    uf: ufValida(endereco.uf),
  };
  for (const campo of ['numero', 'bairro', 'cep']) {
    if (endereco[campo] !== undefined && endereco[campo] !== null) {
      validado[campo] = String(endereco[campo]).trim();
    }
  }
  return Object.freeze(validado);
}

/**
 * Criança atendida por uma escolinha (UC-03, RF03). Nome civil, data de nascimento e endereço
 * são dados sensíveis (RF06, RNF01): ficam em propriedades com prefixo `_` e nunca saem em
 * `perfilPublico()` nem em `JSON.stringify`, que mostram só apelido, idade, cidade e UF.
 */
class Crianca {
  /**
   * @param {object} dados
   * @param {string} dados.nomeCivil
   * @param {string|Date} dados.dataNascimento  'AAAA-MM-DD' ou Date, tratada em UTC
   * @param {object} dados.endereco  { logradouro, cidade, uf, numero?, bairro?, cep? }
   * @param {string} dados.apelido   nome exibido publicamente
   * @param {string} dados.escolinhaId
   * @param {string} [dados.id]
   */
  constructor({ nomeCivil, dataNascimento, endereco, apelido, escolinhaId, id = randomUUID() } = {}) {
    this._nomeCivil = textoObrigatorio(nomeCivil, 'Nome civil');
    this._dataNascimento = dataEmUtc(dataNascimento);
    this._endereco = validarEndereco(endereco);

    const idade = anosCompletos(this._dataNascimento, new Date());
    if (idade < 0) {
      throw new Error('Data de nascimento não pode estar no futuro.');
    }
    if (idade > IDADE_MAXIMA) {
      throw new Error('O DoaGol atende apenas menores de 18 anos.');
    }

    this.id = id;
    this.apelido = textoObrigatorio(apelido, 'Apelido');
    this.escolinhaId = textoObrigatorio(escolinhaId, 'Escolinha');
    this._necessidades = [];
  }

  get cidade() {
    return this._endereco.cidade;
  }

  get uf() {
    return this._endereco.uf;
  }

  /** Cópia da lista de necessidades, em qualquer status. */
  get necessidades() {
    return [...this._necessidades];
  }

  /** Idade em anos completos (UTC). */
  idade(hoje = new Date()) {
    return anosCompletos(this._dataNascimento, hoje);
  }

  /** Vincula uma necessidade à criança (RF04). */
  adicionarNecessidade(necessidade) {
    if (!(necessidade instanceof Necessidade)) {
      throw new Error('Necessidade inválida.');
    }
    this._necessidades.push(necessidade);
  }

  /** Necessidades com status ABERTA, as únicas que aparecem na busca e no perfil (RF05). */
  necessidadesAtivas() {
    return this._necessidades.filter((n) => n.estaAberta());
  }

  /** Perfil exibido aos doadores, sem dados sensíveis (RF06, RNF01). */
  perfilPublico() {
    return {
      id: this.id,
      apelido: this.apelido,
      idade: this.idade(),
      escolinhaId: this.escolinhaId,
      cidade: this.cidade,
      uf: this.uf,
      necessidades: this.necessidadesAtivas().map((n) => ({
        id: n.id,
        tipo: n.tipo,
        descricao: n.descricao,
        valorEstimado: n.valorEstimado,
        valorArrecadado: n.valorArrecadado,
        percentual: n.percentualArrecadado(),
      })),
    };
  }

  /** Dados sensíveis, para uso exclusivo da escolinha responsável e da administração (RNF01). */
  dadosRestritos() {
    return {
      nomeCivil: this._nomeCivil,
      dataNascimento: this._dataNascimento.toISOString().slice(0, 10),
      endereco: { ...this._endereco },
    };
  }

  /** Garante que JSON.stringify nunca vaze nome civil, nascimento ou endereço. */
  toJSON() {
    return this.perfilPublico();
  }
}

module.exports = { Crianca };
