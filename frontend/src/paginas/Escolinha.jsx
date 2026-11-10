import { useEffect, useState } from 'react';
import { api } from '../api';
import { enderecoPorCep, UFS_PADRAO } from '../externo';
import { TIPOS, lerValor, reais } from '../formatos';

const CHAVE = 'doagol:escolinha';
function lembrar(id) {
  try { id ? localStorage.setItem(CHAVE, id) : localStorage.removeItem(CHAVE); } catch { /* armazenamento indisponível */ }
}
function lembrada() {
  try { return localStorage.getItem(CHAVE) || ''; } catch { return ''; }
}

function useFormulario(inicial) {
  const [dados, setDados] = useState(inicial);
  const campo = (nome) => ({ value: dados[nome], onChange: (e) => setDados((d) => ({ ...d, [nome]: e.target.value })) });
  return [dados, setDados, campo];
}

function Aviso({ mensagem }) {
  if (!mensagem) return null;
  return <p className={mensagem.tipo === 'erro' ? 'erro' : 'sucesso'} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>;
}

function SeletorUf(props) {
  return (
    <select {...props}>
      <option value="">UF</option>
      {UFS_PADRAO.map((u) => <option key={u.sigla} value={u.sigla}>{u.sigla}</option>)}
    </select>
  );
}

/** Painel da escolinha: cadastro (UC-02), aprovação (UC-11), crianças (UC-03) e pedidos (UC-04). */
export function Escolinha({ escolinhas, recarregarEscolinhas }) {
  const [selecionada, setSelecionada] = useState(lembrada);
  const [criancas, setCriancas] = useState([]);
  const [avisos, setAvisos] = useState({});
  const avisar = (passo, tipo, texto) => setAvisos((a) => ({ ...a, [passo]: { tipo, texto } }));

  const escolinha = escolinhas.find((e) => e.id === selecionada);
  const aprovada = escolinha?.status === 'APROVADA';

  async function carregarCriancas() {
    if (!escolinha) return setCriancas([]);
    try { setCriancas(await api.criancasDaEscolinha(escolinha.id)); } catch { setCriancas([]); }
  }
  useEffect(() => { carregarCriancas(); }, [escolinha?.id]);

  // Passo 1: cadastro da escolinha
  const [novaEscolinha, setNovaEscolinha, campoEscolinha] = useFormulario({ nome: '', cidade: '', uf: '' });
  const [formAberto, setFormAberto] = useState(escolinhas.length === 0);
  async function cadastrarEscolinha(e) {
    e.preventDefault();
    try {
      const criada = await api.cadastrarEscolinha(novaEscolinha);
      await recarregarEscolinhas();
      escolher(criada.id);
      setNovaEscolinha({ nome: '', cidade: '', uf: '' });
      setFormAberto(false);
      avisar(1, 'ok', `${criada.nome} cadastrada. Agora o cadastro precisa ser aprovado.`);
    } catch (erro) {
      avisar(1, 'erro', erro.message);
    }
  }
  function escolher(id) {
    setSelecionada(id);
    lembrar(id);
    setAvisos({});
  }

  // Passo 2: aprovação
  async function aprovar() {
    try {
      await api.aprovarEscolinha(escolinha.id);
      await recarregarEscolinhas();
      avisar(2, 'ok', 'Cadastro aprovado. A escolinha já pode cadastrar crianças.');
    } catch (erro) {
      avisar(2, 'erro', erro.message);
    }
  }

  // Passo 3: criança
  const vazioCrianca = { nomeCivil: '', dataNascimento: '', apelido: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' };
  const [crianca, setCrianca, campoCrianca] = useFormulario(vazioCrianca);
  const [cepStatus, setCepStatus] = useState('');
  async function buscarCep() {
    if (crianca.cep.replace(/\D/g, '').length !== 8) return;
    setCepStatus('Buscando endereço no ViaCEP…');
    const resposta = await enderecoPorCep(crianca.cep);
    if (resposta.status === 'ok') {
      setCrianca((c) => ({ ...c, ...resposta.endereco }));
      setCepStatus('Endereço preenchido pelo ViaCEP. Confira e informe o número.');
    } else if (resposta.status === 'nao-encontrado') {
      setCepStatus('CEP não encontrado. Confira os números ou preencha o endereço à mão.');
    } else {
      setCepStatus('Não foi possível consultar o ViaCEP agora. Preencha o endereço à mão.');
    }
  }
  async function cadastrarCrianca(e) {
    e.preventDefault();
    const { nomeCivil, dataNascimento, apelido, cep, logradouro, numero, bairro, cidade, uf } = crianca;
    try {
      const criada = await api.cadastrarCrianca(escolinha.id, {
        nomeCivil, dataNascimento, apelido, endereco: { logradouro, numero, bairro, cidade, uf, cep },
      });
      setCrianca(vazioCrianca);
      setCepStatus('');
      await carregarCriancas();
      setPedido((p) => ({ ...p, criancaId: criada.id }));
      avisar(3, 'ok', `${criada.apelido} cadastrada. Agora cadastre o que ela precisa.`);
    } catch (erro) {
      avisar(3, 'erro', erro.message);
    }
  }

  // Passo 4: necessidade
  const [pedido, setPedido, campoPedido] = useFormulario({ criancaId: '', tipo: 'MATERIAL_ESPORTIVO', descricao: '', valorEstimado: '' });
  async function cadastrarPedido(e) {
    e.preventDefault();
    const valor = lerValor(pedido.valorEstimado);
    try {
      if (!pedido.criancaId) throw new Error('Escolha a criança.');
      await api.cadastrarNecessidade(pedido.criancaId, { tipo: pedido.tipo, descricao: pedido.descricao, valorEstimado: valor });
      setPedido((p) => ({ ...p, descricao: '', valorEstimado: '' }));
      await carregarCriancas();
      avisar(4, 'ok', 'Pedido publicado. Ele já aparece na busca para os doadores.');
    } catch (erro) {
      avisar(4, 'erro', erro.message);
    }
  }

  return (
    <section className="pagina painel">
      <h1>Área da escolinha</h1>
      <p className="painel__intro">
        Cadastre sua escolinha, as crianças atendidas e o que cada uma precisa para continuar treinando.
      </p>

      <div className="painel__grade">
        <ol className="passos">
          <li className="passo">
            <h2>Escolinha</h2>
            {escolinhas.length > 0 && (
              <label className="campo">
                <span className="campo__rotulo">Já tem cadastro? Escolha a escolinha</span>
                <select value={selecionada} onChange={(e) => escolher(e.target.value)}>
                  <option value="">Selecione</option>
                  {escolinhas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome} ({e.cidade}/{e.uf}){e.status === 'PENDENTE' ? ', aguardando aprovação' : ''}</option>
                  ))}
                </select>
              </label>
            )}
            <details className="novo" open={formAberto || escolinhas.length === 0} onToggle={(e) => setFormAberto(e.currentTarget.open)}>
              <summary>Cadastrar nova escolinha</summary>
              <form className="formulario" onSubmit={cadastrarEscolinha}>
                <label className="campo"><span className="campo__rotulo">Nome</span><input {...campoEscolinha('nome')} required /></label>
                <div className="linha">
                  <label className="campo campo--largo"><span className="campo__rotulo">Cidade</span><input {...campoEscolinha('cidade')} required /></label>
                  <label className="campo"><span className="campo__rotulo">UF</span><SeletorUf {...campoEscolinha('uf')} required /></label>
                </div>
                <button className="botao botao--principal" type="submit">Cadastrar escolinha</button>
              </form>
            </details>
            <Aviso mensagem={avisos[1]} />
          </li>

          <li className={`passo${escolinha ? '' : ' passo--bloqueado'}`}>
            <h2>Aprovação do cadastro</h2>
            {!escolinha && <p className="nota">Escolha ou cadastre uma escolinha primeiro.</p>}
            {escolinha && aprovada && <p className="selo selo--ok">{escolinha.nome} está aprovada.</p>}
            {escolinha && escolinha.status === 'PENDENTE' && (
              <>
                <p className="selo selo--pendente">Aguardando a análise do administrador do DoaGol.</p>
                <button type="button" className="botao botao--leve" onClick={aprovar}>Aprovar cadastro (administrador)</button>
                <p className="nota">Nesta versão ainda não há login, então a aprovação fica disponível aqui para demonstração.</p>
              </>
            )}
            {escolinha && escolinha.status === 'REJEITADA' && <p className="erro">Cadastro rejeitado: {escolinha.motivoRejeicao}</p>}
            <Aviso mensagem={avisos[2]} />
          </li>

          <li className={`passo${aprovada ? '' : ' passo--bloqueado'}`}>
            <h2>Cadastrar criança</h2>
            {!aprovada && <p className="nota">Disponível depois que o cadastro da escolinha for aprovado.</p>}
            {aprovada && (
              <form className="formulario" onSubmit={cadastrarCrianca}>
                <label className="campo"><span className="campo__rotulo">Nome completo</span><input {...campoCrianca('nomeCivil')} required /></label>
                <div className="linha">
                  <label className="campo campo--largo"><span className="campo__rotulo">Apelido exibido aos doadores</span><input {...campoCrianca('apelido')} required /></label>
                  <label className="campo"><span className="campo__rotulo">Nascimento</span><input type="date" {...campoCrianca('dataNascimento')} required /></label>
                </div>
                <div className="linha">
                  <label className="campo"><span className="campo__rotulo">CEP</span><input {...campoCrianca('cep')} onBlur={buscarCep} inputMode="numeric" placeholder="00000-000" /></label>
                  <label className="campo campo--largo"><span className="campo__rotulo">Rua</span><input {...campoCrianca('logradouro')} required /></label>
                  <label className="campo campo--curto"><span className="campo__rotulo">Número</span><input {...campoCrianca('numero')} /></label>
                </div>
                {cepStatus && <p className="nota">{cepStatus}</p>}
                <div className="linha">
                  <label className="campo"><span className="campo__rotulo">Bairro</span><input {...campoCrianca('bairro')} /></label>
                  <label className="campo campo--largo"><span className="campo__rotulo">Cidade</span><input {...campoCrianca('cidade')} required /></label>
                  <label className="campo campo--curto"><span className="campo__rotulo">UF</span><SeletorUf {...campoCrianca('uf')} required /></label>
                </div>
                <p className="nota">Nome completo, nascimento e endereço não aparecem para os doadores.</p>
                <button className="botao botao--principal" type="submit">Cadastrar criança</button>
              </form>
            )}
            <Aviso mensagem={avisos[3]} />
          </li>

          <li className={`passo${aprovada && criancas.length ? '' : ' passo--bloqueado'}`}>
            <h2>Cadastrar pedido</h2>
            {!(aprovada && criancas.length) && <p className="nota">Disponível depois de cadastrar pelo menos uma criança.</p>}
            {aprovada && criancas.length > 0 && (
              <form className="formulario" onSubmit={cadastrarPedido}>
                <div className="linha">
                  <label className="campo campo--largo">
                    <span className="campo__rotulo">Criança</span>
                    <select {...campoPedido('criancaId')} required>
                      <option value="">Selecione</option>
                      {criancas.map((c) => <option key={c.id} value={c.id}>{c.apelido}, {c.idade} anos</option>)}
                    </select>
                  </label>
                  <label className="campo">
                    <span className="campo__rotulo">Tipo</span>
                    <select {...campoPedido('tipo')}>
                      {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                </div>
                <div className="linha">
                  <label className="campo campo--largo"><span className="campo__rotulo">O que ela precisa</span><input {...campoPedido('descricao')} placeholder="Ex.: Chuteira de futsal nº 33" required /></label>
                  <label className="campo"><span className="campo__rotulo">Valor estimado (R$)</span><input {...campoPedido('valorEstimado')} inputMode="decimal" placeholder="150,00" required /></label>
                </div>
                <button className="botao botao--principal" type="submit">Publicar pedido</button>
              </form>
            )}
            <Aviso mensagem={avisos[4]} />
          </li>
        </ol>

        <aside className="elenco">
          <h2>{escolinha ? `Crianças da ${escolinha.nome}` : 'Crianças da escolinha'}</h2>
          {!escolinha && <p className="nota">Escolha uma escolinha para ver as crianças cadastradas.</p>}
          {escolinha && criancas.length === 0 && <p className="nota">Nenhuma criança cadastrada ainda.</p>}
          <ul>
            {criancas.map((c) => {
              const falta = c.necessidades.reduce((s, n) => s + n.valorEstimado - n.valorArrecadado, 0);
              return (
                <li key={c.id}>
                  <a href={`#/crianca/${c.id}`}>{c.apelido}</a>
                  <span>{c.necessidades.length === 0 ? 'sem pedidos abertos' : `${c.necessidades.length} ${c.necessidades.length === 1 ? 'pedido' : 'pedidos'}, faltam ${reais(falta)}`}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </section>
  );
}
