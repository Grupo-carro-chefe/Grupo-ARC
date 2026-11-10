// APIs públicas externas consumidas pelo front-end:
// - IBGE Localidades: lista de estados e municípios para os filtros da busca.
// - ViaCEP: preenche o endereço da criança a partir do CEP no cadastro.
// As duas são opcionais: se não responderem, os campos continuam funcionando digitados à mão.

const IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

/** Usada quando o IBGE não responde, para o filtro de UF nunca ficar vazio. */
export const UFS_PADRAO = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
  ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
  ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
].map(([sigla, nome]) => ({ sigla, nome }));

async function buscarJson(url, ms = 6000) {
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), ms);
  try {
    const resposta = await fetch(url, { signal: controle.signal });
    if (!resposta.ok) throw new Error(String(resposta.status));
    return await resposta.json();
  } finally {
    clearTimeout(tempo);
  }
}

/** Estados em ordem alfabética: [{ sigla, nome }]. */
export async function estados() {
  try {
    const lista = await buscarJson(`${IBGE}/estados?orderBy=nome`);
    return { lista: lista.map(({ sigla, nome }) => ({ sigla, nome })), fonte: 'ibge' };
  } catch {
    return { lista: UFS_PADRAO, fonte: 'local' };
  }
}

/** Nomes dos municípios de uma UF, ou [] se o IBGE não responder. */
export async function municipios(uf) {
  if (!uf) return [];
  try {
    const lista = await buscarJson(`${IBGE}/estados/${uf}/municipios?orderBy=nome`);
    return lista.map((m) => m.nome);
  } catch {
    return [];
  }
}

/**
 * Endereço de um CEP pelo ViaCEP.
 * @returns {Promise<{status: 'ok', endereco: object} | {status: 'nao-encontrado'} | {status: 'indisponivel'}>}
 */
export async function enderecoPorCep(cep) {
  const numeros = String(cep).replace(/\D/g, '');
  if (numeros.length !== 8) return { status: 'nao-encontrado' };
  try {
    const dados = await buscarJson(`https://viacep.com.br/ws/${numeros}/json/`);
    if (dados.erro) return { status: 'nao-encontrado' };
    return {
      status: 'ok',
      endereco: { logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, uf: dados.uf },
    };
  } catch {
    return { status: 'indisponivel' };
  }
}
