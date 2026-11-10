'use strict';

/**
 * Repositório genérico em memória, indexado pelo `id` de cada item. Usado quando não há
 * `DATABASE_URL`: os dados somem ao reiniciar.
 * Os métodos são síncronos, o que é compatível com `await`: quem usa o repositório (rotas e
 * serviços) sempre faz `await`, para trocar por um repositório PostgreSQL (assíncrono) sem mexer neles.
 */
class RepositorioEmMemoria {
  constructor() {
    this._itens = new Map();
  }

  salvar(item) {
    this._itens.set(item.id, item);
    return item;
  }

  buscarPorId(id) {
    return this._itens.get(id) ?? null;
  }

  /** Os filtros opcionais (usados pelo repositório PostgreSQL) são ignorados: quem chama filtra de novo. */
  listar() {
    return [...this._itens.values()];
  }
}

/** Crianças em memória; acrescenta a busca pela necessidade, que no PostgreSQL é uma chave estrangeira. */
class RepositorioCriancasEmMemoria extends RepositorioEmMemoria {
  buscarPorNecessidadeId(necessidadeId) {
    return this.listar().find((crianca) => crianca.necessidades.some((n) => n.id === necessidadeId)) ?? null;
  }
}

module.exports = { RepositorioEmMemoria, RepositorioCriancasEmMemoria };
