import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { reduzido } from '../movimento';

/** Tira acento e caixa para comparar textos ("sao" acha "São Paulo"). */
export const normalizar = (texto) =>
  String(texto).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Seletor próprio do DoaGol (botão + listbox, WAI-ARIA).
 * opcoes: [{ valor, rotulo, rotuloCurto?, sigla?, detalhe?, selo?: { texto, tipo }, busca? }]
 * Com `busca`, o painel ganha um campo que filtra por rótulo, sigla e `busca`.
 * Com `variante="etiqueta"`, cada opção usa a etiqueta dos cards.
 * O painel vai para o <body> para não ser cortado pelo hero nem pela folha.
 */
export function Seletor({
  value, onChange, opcoes, busca = false, placeholderBusca = 'Buscar…', textoVazio = 'Nada encontrado',
  variante = 'padrao', required = false, larguraMinima = 0, nome,
}) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [ativo, setAtivo] = useState(0);
  const [pos, setPos] = useState(null);
  const gatilho = useRef(null);
  const painel = useRef(null);
  const campoBusca = useRef(null);
  const lista = useRef(null);
  const digitado = useRef({ texto: '', tempo: null });

  const atual = opcoes.find((o) => o.valor === value);
  const visiveis = useMemo(() => {
    const q = normalizar(consulta);
    if (!q) return opcoes;
    return opcoes.filter((o) => normalizar(`${o.rotulo} ${o.sigla || ''} ${o.detalhe || ''} ${o.busca || ''}`).includes(q));
  }, [opcoes, consulta]);

  function abrir() {
    const i = opcoes.findIndex((o) => o.valor === value);
    setConsulta('');
    setAtivo(Math.max(0, i));
    setAberto(true);
  }

  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  }

  function escolher(opcao) {
    if (opcao && opcao.valor !== value) onChange(opcao.valor);
    fechar();
  }

  function posicionar() {
    const el = gatilho.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margem = 8;
    const largura = Math.min(Math.max(r.width, larguraMinima), window.innerWidth - margem * 2);
    const left = Math.min(Math.max(r.left, margem), window.innerWidth - margem - largura);
    const abaixo = window.innerHeight - r.bottom - margem - 6;
    const acima = r.top - margem - 6;
    const subir = abaixo < 220 && acima > abaixo;
    const altura = Math.max(140, Math.min(subir ? acima : abaixo, 340));
    setPos(subir
      ? { left, width: largura, bottom: window.innerHeight - r.top + 6, maxHeight: altura }
      : { left, width: largura, top: r.bottom + 6, maxHeight: altura });
  }

  useLayoutEffect(() => {
    if (!aberto) { setPos(null); return undefined; }
    posicionar();
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    return () => {
      window.removeEventListener('resize', posicionar);
      window.removeEventListener('scroll', posicionar, true);
    };
  }, [aberto]);

  // Foco dentro do painel assim que ele existe (campo de busca ou a própria lista).
  useEffect(() => {
    if (aberto && pos) (busca ? campoBusca.current : lista.current)?.focus({ preventScroll: true });
  }, [aberto, pos === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clique fora fecha.
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (painel.current?.contains(e.target) || gatilho.current?.contains(e.target)) return;
      setAberto(false);
    };
    document.addEventListener('pointerdown', fora, true);
    return () => document.removeEventListener('pointerdown', fora, true);
  }, [aberto]);

  // Mantém a opção ativa à vista.
  useEffect(() => {
    if (!aberto) return;
    document.getElementById(`${id}-op-${ativo}`)?.scrollIntoView({ block: 'nearest' });
  }, [ativo, aberto, pos === null, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(digitado.current.tempo), []);

  const mover = (i) => setAtivo(Math.min(Math.max(i, 0), Math.max(visiveis.length - 1, 0)));

  function pularPorLetra(letra) {
    const d = digitado.current;
    clearTimeout(d.tempo);
    d.texto += normalizar(letra);
    d.tempo = setTimeout(() => { d.texto = ''; }, 600);
    const repetida = d.texto.length > 1 && [...d.texto].every((c) => c === d.texto[0]);
    const prefixo = repetida ? d.texto[0] : d.texto;
    const inicio = d.texto.length === 1 || repetida ? ativo + 1 : ativo;
    for (let k = 0; k < visiveis.length; k += 1) {
      const i = (inicio + k) % visiveis.length;
      if (normalizar(visiveis[i].rotulo).startsWith(prefixo)) { setAtivo(i); return; }
    }
  }

  function teclaNoPainel(e) {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); mover(ativo + 1); break;
      case 'ArrowUp': e.preventDefault(); mover(ativo - 1); break;
      case 'Home':
        if (!busca || !consulta) { e.preventDefault(); mover(0); }
        break;
      case 'End':
        if (!busca || !consulta) { e.preventDefault(); mover(visiveis.length - 1); }
        break;
      case 'Enter': e.preventDefault(); escolher(visiveis[ativo]); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); fechar(); break;
      case 'Tab': fechar(); break;
      default:
        if (!busca && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.key === ' ' && !digitado.current.texto) { e.preventDefault(); escolher(visiveis[ativo]); break; }
          e.preventDefault();
          pularPorLetra(e.key);
        }
    }
  }

  function teclaNoGatilho(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); abrir(); }
  }

  const idLista = `${id}-lista`;
  const idAtivo = visiveis[ativo] ? `${id}-op-${ativo}` : undefined;
  const quieto = reduzido();

  const conteudoOpcao = (o) => {
    if (variante === 'etiqueta') return o.valor === '' ? <span>{o.rotulo}</span> : <span className="etiqueta">{o.rotulo}</span>;
    return (
      <>
        {o.sigla && <b className="seletor__sigla">{o.sigla}</b>}
        <span className="seletor__nome">
          {o.rotulo}
          {o.detalhe && <small className="seletor__detalhe">{o.detalhe}</small>}
        </span>
        {o.selo && <span className={`seletor__selo seletor__selo--${o.selo.tipo}`}>{o.selo.texto}</span>}
      </>
    );
  };

  return (
    <div className="seletor">
      <button
        type="button"
        ref={gatilho}
        className={`seletor__gatilho${aberto ? ' seletor__gatilho--aberto' : ''}${value === '' ? ' seletor__gatilho--vazio' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? idLista : undefined}
        onClick={() => (aberto ? fechar(false) : abrir())}
        onKeyDown={teclaNoGatilho}
      >
        <span className="seletor__valor">{atual ? (atual.rotuloCurto || atual.rotulo) : ''}</span>
        <svg className="seletor__seta" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {nome !== undefined && <input type="hidden" name={nome} value={value} />}
      {required && (
        <input
          className="seletor__exigido"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          onInvalid={() => gatilho.current?.focus()}
        />
      )}
      {aberto && createPortal(
        <div
          ref={painel}
          className={`seletor__painel${quieto ? ' seletor__painel--quieto' : ''}${pos ? '' : ' seletor__painel--medindo'}`}
          style={pos || undefined}
          onKeyDown={teclaNoPainel}
        >
          {busca && (
            <div className="seletor__busca">
              <input
                ref={campoBusca}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={idLista}
                aria-activedescendant={idAtivo}
                aria-autocomplete="list"
                aria-label={placeholderBusca}
                placeholder={placeholderBusca}
                autoComplete="off"
                spellCheck="false"
                value={consulta}
                onChange={(e) => { setConsulta(e.target.value); setAtivo(0); }}
              />
            </div>
          )}
          <div
            id={idLista}
            ref={lista}
            className="seletor__lista"
            role="listbox"
            tabIndex={busca ? -1 : 0}
            aria-activedescendant={busca ? undefined : idAtivo}
            data-lenis-prevent
          >
            {visiveis.map((o, i) => (
              <div
                key={o.valor === '' ? '__todos' : o.valor}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={o.valor === value}
                className={`seletor__opcao${i === ativo ? ' seletor__opcao--ativa' : ''}${o.valor === value ? ' seletor__opcao--marcada' : ''}`}
                onMouseMove={() => { if (i !== ativo) setAtivo(i); }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
              >
                {conteudoOpcao(o)}
                {o.valor === value && <svg className="seletor__ok" viewBox="0 0 14 11" aria-hidden="true"><path d="M1.5 5.8l3.6 3.6L12.5 1.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            ))}
            {visiveis.length === 0 && <div className="seletor__vazio" role="status">{textoVazio}</div>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
