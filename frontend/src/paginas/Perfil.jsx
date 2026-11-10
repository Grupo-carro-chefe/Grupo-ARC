import { useEffect, useState } from 'react';
import { api } from '../api';
import { TIPOS, reais } from '../formatos';
import { Progresso } from '../componentes/Progresso';
import { BarraPedido } from '../componentes/BarraPedido';
import { Comprovante, FormularioDoacao } from '../componentes/Doacao';

/** Perfil público da criança (UC-07) com a doação (UC-08) e o comprovante (UC-09). */
export function Perfil({ id, escolinhas }) {
  const [crianca, setCrianca] = useState(null);
  const [erro, setErro] = useState('');
  const [doando, setDoando] = useState(null);
  const [concluida, setConcluida] = useState(null);
  const [previa, setPrevia] = useState(0);

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
  const selecionada = concluida ? concluida.necessidade : doando;

  return (
    <section className="pagina perfil">
      <a className="voltar" href="#/">Voltar para a busca</a>
      <div className="perfil__grade">
        <aside className="perfil__cartao">
          <h1 className="perfil__nome">{crianca.apelido}, {crianca.idade} anos</h1>
          <p className="perfil__meta">{crianca.cidade}/{crianca.uf}</p>
          {escolinha && <p className="perfil__escolinha">{escolinha.nome}</p>}
          {selecionada && (
            <div className="perfil__selecionado">
              <p className="perfil__item">
                <span className="etiqueta">{TIPOS[selecionada.tipo]}</span>
                {selecionada.descricao}
              </p>
              <BarraPedido
                arrecadado={selecionada.valorArrecadado}
                meta={selecionada.valorEstimado}
                previa={concluida ? 0 : previa}
              />
            </div>
          )}
          <p className="perfil__privacidade">
            Por segurança, o nome completo e o endereço da criança ficam visíveis só para a escolinha.
          </p>
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
              aoMudarValor={setPrevia}
              aoCancelar={() => { setDoando(null); setPrevia(0); }}
              aoConcluir={(comprovante) => {
                const arrecadado = Math.round((doando.valorArrecadado + comprovante.valor) * 100) / 100;
                setConcluida({ comprovante, necessidade: { ...doando, valorArrecadado: arrecadado } });
                setDoando(null);
                setPrevia(0);
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
