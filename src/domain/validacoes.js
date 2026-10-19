'use strict';

/** Siglas das 27 unidades federativas, usadas nos endereços e na busca (RF03, RF05). */
const UFS = Object.freeze([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

/** Exige um texto não vazio e devolve o texto sem espaços nas pontas. */
function textoObrigatorio(valor, campo) {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    throw new Error(`${campo} é obrigatório.`);
  }
  return valor.trim();
}

/** Devolve a UF em maiúsculas ou lança erro se não for uma das 27 siglas. */
function ufValida(valor) {
  const uf = typeof valor === 'string' ? valor.trim().toUpperCase() : valor;
  if (!UFS.includes(uf)) {
    throw new Error(`UF inválida: ${valor}.`);
  }
  return uf;
}

/** Converte reais para centavos inteiros, evitando erros de ponto flutuante (0.1 + 0.2). */
function emCentavos(valor) {
  return Math.round(valor * 100);
}

module.exports = { UFS, textoObrigatorio, ufValida, emCentavos };
