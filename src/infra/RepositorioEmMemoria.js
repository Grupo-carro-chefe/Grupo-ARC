'use strict';

/**
 * Repositório genérico em memória, indexado pelo `id` de cada item.
 * Substituto provisório do PostgreSQL definido na arquitetura: os dados somem ao reiniciar.
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

  listar() {
    return [...this._itens.values()];
  }
}

module.exports = { RepositorioEmMemoria };
