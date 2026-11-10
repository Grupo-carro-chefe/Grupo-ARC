import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api';
import { TIPOS, reais } from '../formatos';
import { Progresso } from '../componentes/Progresso';
import { QUASE_LA } from '../componentes/Figurinha';
import { BarraPedido } from '../componentes/BarraPedido';
import { gsap, reduzido, contarBloco, zerarBloco, restaurarBloco } from '../movimento';
import { FundoCampo } from '../componentes/FundoCampo';
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

  const raiz = useRef(null);
  const animadoDe = useRef(null);
  const mostraLista = !!crianca && !doando && !concluida;

  // Abertura (cerca de 1,5 s, uma vez por criança): card, título, pedidos em cascata, botões por último.
  useLayoutEffect(() => {
    if (!mostraLista || reduzido() || animadoDe.current === crianca.id) return undefined;
    const el = raiz.current;
    const q = (seletor) => gsap.utils.toArray(seletor, el);
    const pedidos = q('.pedido');
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => { animadoDe.current = crianca.id; } });
      tl.from('.perfil__cartao', { x: -32, opacity: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity' }, 0);
      if (q('.perfil__palavra').length) {
        tl.from('.perfil__palavra', { y: 22, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 0.15);
      }
      pedidos.forEach((li, i) => {
        const t = 0.35 + i * 0.1;
        const selo = li.querySelector('.cartao__selo');
        const barra = li.querySelector('[data-conta-barra]');
        zerarBloco(li);
        if (barra) barra.style.transition = 'none';
        if (selo) gsap.set(selo, { scale: 0 });
        tl.from(li, { y: 24, opacity: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity' }, t);
        tl.add(contarBloco(li, {
          duracao: 0.8,
          aoTerminar: () => {
            if (barra) barra.style.transition = '';
            barra?.classList.add('brilha');
            if (selo) gsap.to(selo, { scale: 1, duration: 0.4, ease: 'back.out(1.6)', clearProps: 'transform' });
          },
        }), t + 0.1);
      });
      const ultimos = q('.pedido > .botao, .pedido__falta');
      if (ultimos.length) {
        tl.from(ultimos, { opacity: 0, scale: 0.96, duration: 0.4, ease: 'power2.out', stagger: 0.05, clearProps: 'transform,opacity' }, Math.max(1.0, 0.75 + pedidos.length * 0.1));
      }
    }, el);
    return () => {
      ctx.revert();
      pedidos.forEach((li) => {
        restaurarBloco(li);
        const barra = li.querySelector('[data-conta-barra]');
        if (barra) { barra.style.transition = ''; barra.classList.remove('brilha'); }
      });
    };
  }, [mostraLista, crianca?.id]);

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
    <section className="pagina perfil" ref={raiz}>
      <FundoCampo penalti />
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
              <h2>
                <span className="so-leitor">O que {crianca.apelido} precisa</span>
                <span aria-hidden="true">
                  {`O que ${crianca.apelido} precisa`.split(' ').map((palavra, i) => (
                    <span key={i}><span className="perfil__palavra">{palavra}</span>{' '}</span>
                  ))}
                </span>
              </h2>
              {crianca.necessidades.length === 0 ? (
                <div className="vazio">
                  <p>Todos os pedidos de {crianca.apelido} já foram completados. Obrigado a quem doou!</p>
                  <a className="botao botao--leve" href="#/">Ver outras crianças</a>
                </div>
              ) : (
                <ul className="pedidos">
                  {crianca.necessidades.map((n) => (
                    <li key={n.id} className="pedido" data-rs={n.valorArrecadado} data-pct={n.percentual}>
                      <div className="pedido__info">
                        <span className="etiqueta">{TIPOS[n.tipo]}</span>
                        <h3>{n.descricao}{n.percentual >= QUASE_LA && <span className="cartao__selo">Quase lá</span>}</h3>
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
