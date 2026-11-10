'use strict';

const { TipoNecessidade } = require('../domain/Necessidade');
const { normalizar } = require('../domain/validacoes');
const { RegraNegocioError } = require('../domain/erros');

/** Busca de crianças com necessidades abertas por cidade, UF e tipo (UC-06, RF05, RF06). */
class BuscaService {
  /** @param {{criancas: {listar(): import('../domain/Crianca').Crianca[]}}} repositorios */
  constructor({ criancas }) {
    this.criancas = criancas;
  }

  /**
   * Filtros vazios são ignorados. Devolve apenas o perfil público de cada criança (RNF01).
   * Com PostgreSQL o repositório já filtra pelos índices; o filtro abaixo repete a regra e vale
   * também para o repositório em memória, que devolve tudo.
   */
  async buscar({ cidade, uf, tipo } = {}) {
    if (tipo && !Object.values(TipoNecessidade).includes(tipo)) {
      throw new RegraNegocioError(`Tipo de necessidade inválido: ${tipo}.`);
    }
    const candidatas = await this.criancas.listar({ cidade, uf, tipo, comNecessidadeAberta: true });
    return candidatas
      .filter((c) => !cidade || normalizar(c.cidade) === normalizar(cidade))
      .filter((c) => !uf || c.uf === String(uf).trim().toUpperCase())
      .filter((c) => c.necessidadesAtivas().some((n) => !tipo || n.tipo === tipo))
      .map((c) => c.perfilPublico());
  }
}

module.exports = { BuscaService };
