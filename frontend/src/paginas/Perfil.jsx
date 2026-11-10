import { useEffect, useState } from 'react';
import { api } from '../api';
import { TIPOS, reais } from '../formatos';
import { Camisa } from '../componentes/Figurinha';
import { Progresso } from '../componentes/Progresso';
import { Comprovante, FormularioDoacao } from '../componentes/Doacao';

/** Perfil público da criança (UC-07) com a doação (UC-08) e o comprovante (UC-09). */
export function Perfil({ id, escolinhas }) {
  const [crianca, setCrianca] = useState(null);
  const [erro, setErro] = useState('');
  const [doando, setDoando] = useState(null);
  const [concluida, setConcluida] = useState(null);

  async function carregar() {
    try {
      setCrianca(await api.perfil(id));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { carregar(); }, [id]);

  if (erro) {
    return (
      <section className="pagina">
        <p className="erro" role="alert">{erro}</p>
        <a className="botao botao--leve" href="#/">Voltar para a busca</a>
      </section>
    );
  }
  if (!crianca) return <p className="pagina carregando">Carregando perfil…</p>;

  const escolinha = escolinhas.find((e) => e.id === crianca.escolinhaId);

  return (
    <section className="pagina perfil">
      <a className="voltar" href="#/">Voltar para a busca</a>
      <div className="perfil__grade">
        <aside className="figurinha figurinha--perfil">
          <div className="figurinha__moldura">
            <Camisa apelido={crianca.apelido} grande />
            <h1 className="perfil__nome">{crianca.apelido}</h1>
            <p className="figurinha__meta">{crianca.idade} anos, {crianca.cidade}/{crianca.uf}</p>
            {escolinha && <p className="figurinha__escolinha">Treina na {escolinha.nome}</p>}
            <p className="perfil__privacidade">
              Por segurança, o nome completo e o endereço da criança ficam visíveis só para a escolinha.
            </p>
          </div>
        </aside>

        <div className="perfil__pedidos">
          {concluida ? (
            <Comprovante
              comprovante={concluida.comprovante}
              necessidade={concluida.necessidade}
              apelido={crianca.apelido}
              aoFechar={() => setConcluida(null)}
            />
          ) : doando ? (
            <FormularioDoacao
              necessidade={doando}
              apelido={crianca.apelido}
              aoCancelar={() => setDoando(null)}
              aoConcluir={(comprovante) => {
                setConcluida({ comprovante, necessidade: doando });
                setDoando(null);
                carregar();
              }}
            />
          ) : (
            <>
              <h2>O que {crianca.apelido} precisa</h2>
              {crianca.necessidades.length === 0 ? (
                <div className="vazio">
                  <p>Todos os pedidos de {crianca.apelido} já foram completados. Obrigado a quem doou!</p>
                  <a className="botao botao--leve" href="#/">Ver outras crianças</a>
                </div>
              ) : (
                <ul className="pedidos">
                  {crianca.necessidades.map((n) => (
                    <li key={n.id} className="pedido">
                      <div className="pedido__info">
                        <span className="etiqueta">{TIPOS[n.tipo]}</span>
                        <h3>{n.descricao}</h3>
                        <Progresso arrecadado={n.valorArrecadado} meta={n.valorEstimado} percentual={n.percentual} />
                      </div>
                      <button type="button" className="botao botao--principal" onClick={() => setDoando(n)}>
                        Doar para este pedido
                      </button>
                      <p className="pedido__falta">Faltam {reais(n.valorEstimado - n.valorArrecadado)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
