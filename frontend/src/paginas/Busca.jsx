import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { estados, municipios, UFS_PADRAO } from '../externo';
import { TIPOS } from '../formatos';
import { Seletor } from '../componentes/Seletor';
import { Figurinha } from '../componentes/Figurinha';
import { Hero } from '../componentes/Hero';
import { TelaProduto, Tour } from '../componentes/Produto';
import {
  gsap, ScrollTrigger, reduzido, rolarPara, recalcular, contarBloco, zerarBloco, restaurarBloco,
} from '../movimento';

/** Busca de crianças com necessidades abertas (UC-06). */
export function Busca({ escolinhas }) {
  const [filtros, setFiltros] = useState({ uf: '', cidade: '', tipo: '' });
  const [ufs, setUfs] = useState({ lista: UFS_PADRAO, fonte: 'local' });
  const [cidades, setCidades] = useState([]);
  const [estado, setEstado] = useState({ carregando: true, erro: '', dados: null });
  const [vitrine, setVitrine] = useState([]);
  const album = useRef(null);

  useEffect(() => { estados().then(setUfs); }, []);
  useEffect(() => { municipios(filtros.uf).then(setCidades); }, [filtros.uf]);

  async function buscar(atuais = filtros) {
    setEstado((e) => ({ ...e, carregando: true, erro: '' }));
    try {
      const dados = await api.buscarCriancas(atuais);
      setEstado({ carregando: false, erro: '', dados });
      return dados;
    } catch (e) {
      setEstado({ carregando: false, erro: e.message, dados: null });
      return null;
    }
  }

  // A primeira busca (sem filtros) também alimenta a tela do produto e o tour.
  useEffect(() => {
    buscar().then((dados) => {
      if (dados) setVitrine(dados.resultados.filter((c) => c.necessidades.length > 0).slice(0, 3));
    });
  }, []);

  // O resultado fica abaixo da tela do produto: depois de filtrar, a página desce até ele.
  const mostrarResultados = () => rolarPara(album.current);

  // Cartões entram em cascata; barra, R$ e % contam com desaceleração; brilho e selo no fim.
  useLayoutEffect(() => {
    recalcular();
    if (reduzido() || !estado.dados || estado.dados.total === 0) return undefined;
    const raiz = album.current;
    const cartoes = gsap.utils.toArray('.cartao', raiz);
    const pedidos = gsap.utils.toArray('.cartao__pedido', raiz);
    const ctx = gsap.context(() => {
      gsap.set(cartoes, { opacity: 0, y: 40, rotationX: -12, transformPerspective: 900 });
      gsap.set('.cartao__selo', { scale: 0 });
      pedidos.forEach(zerarBloco);
      ScrollTrigger.batch(cartoes, {
        start: 'top 92%',
        once: true,
        onEnter: (lote) => {
          gsap.to(lote, { opacity: 1, y: 0, rotationX: 0, duration: 0.9, ease: 'power4.out', stagger: 0.11, clearProps: 'transform,opacity' });
          lote.forEach((cartao, i) => {
            cartao.querySelectorAll('.cartao__pedido').forEach((li) => {
              contarBloco(li, {
                duracao: 1.3,
                atraso: 0.35 + i * 0.11,
                aoTerminar: () => {
                  li.querySelector('.trilha i').classList.add('brilha');
                  const selo = li.querySelector('.cartao__selo');
                  if (selo) gsap.to(selo, { scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
                },
              });
            });
          });
        },
      });
    }, raiz);
    return () => {
      ctx.revert();
      pedidos.forEach(restaurarBloco);
    };
  }, [estado.dados]);

  const mudar = (campo) => (e) => mudarValor(campo, e.target.value);
  const mudarValor = (campo, valor) => {
    const novo = { ...filtros, [campo]: valor };
    if (campo === 'uf') novo.cidade = '';
    setFiltros(novo);
    if (campo !== 'cidade') buscar(novo).then(mostrarResultados);
  };

  function limpar() {
    const vazio = { uf: '', cidade: '', tipo: '' };
    setFiltros(vazio);
    buscar(vazio).then(mostrarResultados);
  }

  const opcoesUf = useMemo(() => [
    { valor: '', rotulo: 'Todos' },
    ...ufs.lista.map((u) => ({ valor: u.sigla, rotulo: u.nome, sigla: u.sigla })),
  ], [ufs.lista]);
  const opcoesTipo = useMemo(() => [
    { valor: '', rotulo: 'Todos' },
    ...Object.entries(TIPOS).map(([k, v]) => ({ valor: k, rotulo: v })),
  ], []);

  const porId = Object.fromEntries(escolinhas.map((e) => [e.id, e]));
  const temFiltro = filtros.uf || filtros.cidade || filtros.tipo;

  return (
    <div className="pagina-busca">
      <Hero>
      <form className="filtros" onSubmit={(e) => { e.preventDefault(); buscar().then(mostrarResultados); }}>
        <label className="campo">
          <span className="campo__rotulo">Estado</span>
          <Seletor
            value={filtros.uf}
            onChange={(v) => mudarValor('uf', v)}
            opcoes={opcoesUf}
            busca
            placeholderBusca="Buscar estado…"
            textoVazio="Nenhum estado encontrado"
          />
        </label>
        <label className="campo">
          <span className="campo__rotulo">Cidade</span>
          <input list="lista-cidades" value={filtros.cidade} onChange={mudar('cidade')} placeholder={filtros.uf ? 'Digite a cidade' : 'Qualquer cidade'} />
          <datalist id="lista-cidades">
            {cidades.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="campo">
          <span className="campo__rotulo">Tipo de pedido</span>
          <Seletor
            value={filtros.tipo}
            onChange={(v) => mudarValor('tipo', v)}
            opcoes={opcoesTipo}
            variante="etiqueta"
          />
        </label>
        <div className="filtros__acoes">
          <button type="submit" className="botao botao--principal">Buscar</button>
          {temFiltro && <button type="button" className="botao botao--leve" onClick={limpar}>Limpar filtros</button>}
        </div>
      </form>
      </Hero>

      <div className="folha">
      {vitrine.length > 0 && <TelaProduto crianca={vitrine[0]} escolinha={porId[vitrine[0].escolinhaId]} />}

      <section className="album" id="resultados" ref={album} aria-live="polite">
        {estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
        {estado.dados && (
          <>
            <h2 className="album__titulo">
              {estado.dados.total === 1 ? '1 criança precisa de ajuda' : `${estado.dados.total} crianças precisam de ajuda`}
            </h2>
            {estado.dados.total === 0 ? (
              <div className="vazio">
                <p>Nenhuma criança com pedidos abertos para esses filtros.</p>
                <button type="button" className="botao botao--leve" onClick={limpar}>Ver todas as crianças</button>
              </div>
            ) : (
              <div className="album__grade">
                {estado.dados.resultados.map((c) => <Figurinha key={c.id} crianca={c} escolinha={porId[c.escolinhaId]} />)}
              </div>
            )}
          </>
        )}
        {estado.carregando && !estado.dados && <p className="carregando">Carregando crianças…</p>}
      </section>

      {vitrine.length > 0 && <Tour criancas={vitrine} escolinhas={escolinhas} />}
      </div>
    </div>
  );
}
