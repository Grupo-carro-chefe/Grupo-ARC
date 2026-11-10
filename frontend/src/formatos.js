export const TIPOS = {
  MATERIAL_ESPORTIVO: 'Material esportivo',
  FINANCEIRA: 'Taxas e inscrições',
  TRANSPORTE: 'Transporte',
};

export const FORMAS_PAGAMENTO = {
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de crédito',
  BOLETO: 'Boleto',
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const reais = (valor) => moeda.format(valor);

export const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

/** Lê "12,50" ou "12.50" como número; devolve NaN se não for valor. */
export function lerValor(texto) {
  const limpo = String(texto).trim().replace(/\./g, (m, i, s) => (s.includes(',') ? '' : m)).replace(',', '.');
  return limpo === '' ? NaN : Number(limpo);
}
