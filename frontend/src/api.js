// Cliente da API do DoaGol. Por padrão chama o mesmo endereço que serve a página;
// public/config.js pode apontar para outra URL (ex.: front no GitHub Pages, API no Render).
const BASE = (window.DOAGOL_API_URL || '').replace(/\/$/, '');

async function chamar(caminho, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(BASE + caminho, {
      ...opcoes,
      headers: opcoes.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.');
  }
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(corpo.erro || `O servidor respondeu com erro ${resposta.status}.`);
  }
  return corpo;
}

const enviar = (caminho, dados) => chamar(caminho, { method: 'POST', body: JSON.stringify(dados ?? {}) });

export const api = {
  buscarCriancas: ({ cidade, uf, tipo }) => {
    const filtros = new URLSearchParams();
    if (cidade) filtros.set('cidade', cidade);
    if (uf) filtros.set('uf', uf);
    if (tipo) filtros.set('tipo', tipo);
    const consulta = filtros.toString();
    return chamar(`/criancas${consulta ? `?${consulta}` : ''}`);
  },
  perfil: (id) => chamar(`/criancas/${id}`),
  escolinhas: () => chamar('/escolinhas'),
  criancasDaEscolinha: (id) => chamar(`/escolinhas/${id}/criancas`),
  cadastrarEscolinha: (dados) => enviar('/escolinhas', dados),
  aprovarEscolinha: (id) => enviar(`/escolinhas/${id}/aprovar`),
  cadastrarCrianca: (escolinhaId, dados) => enviar(`/escolinhas/${escolinhaId}/criancas`, dados),
  cadastrarNecessidade: (criancaId, dados) => enviar(`/criancas/${criancaId}/necessidades`, dados),
  doar: (necessidadeId, dados) => enviar(`/necessidades/${necessidadeId}/doacoes`, dados),
};
