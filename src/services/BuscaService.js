'use strict';

const { TipoNecessidade } = require('../domain/Necessidade');

/** Remove acentos, espaços nas pontas e diferença de caixa ("São Paulo" === "sao paulo"). */
function normalizar(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Busca de crianças com necessidades abertas por cidade, UF e tipo (UC-06, RF05, RF06). */
class BuscaService {
  /** @param {{criancas: {listar(): import('../domain/Crianca').Crianca[]}}} repositorios */
  constructor({ criancas }) {
    this.criancas = criancas;
  }

  /**
   * Filtros vazios são ignorados. Devolve apenas o perfil público de cada criança (RNF01).
   * ponytail: varre a lista inteira em memória; trocar por consulta com índice no PostgreSQL.
   */
  buscar({ cidade, uf, tipo } = {}) {
    if (tipo && !Object.values(TipoNecessidade).includes(tipo)) {
      throw new Error(`Tipo de necessidade inválido: ${tipo}.`);
    }
    return this.criancas
      .listar()
      .filter((c) => !cidade || normalizar(c.cidade) === normalizar(cidade))
      .filter((c) => !uf || c.uf === String(uf).trim().toUpperCase())
      .filter((c) => c.necessidadesAtivas().some((n) => !tipo || n.tipo === tipo))
      .map((c) => c.perfilPublico());
  }
}

module.exports = { BuscaService };
