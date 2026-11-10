import { useEffect, useRef } from 'react';
import { gsap, escrever, reduzido } from '../movimento';
import { reais } from '../formatos';

const arredondar = (n) => Math.round(n * 100) / 100;

/**
 * Barra do pedido selecionado na tela de doação. Mostra quanto já foi arrecadado e quanto falta,
 * com contagem animada, e uma prévia em amarelo-claro da parte que a doação digitada vai preencher.
 * Quando `arrecadado` muda (doação concluída), a barra sobe até o novo valor.
 */
export function BarraPedido({ arrecadado, meta, previa = 0 }) {
  const raiz = useRef(null);
  const exibido = useRef(null);
  const previaRef = useRef(previa);
  const metaRef = useRef(meta);
  previaRef.current = previa;
  metaRef.current = meta;
  if (exibido.current === null) exibido.current = reduzido() ? arrecadado : 0;
  const inicial = useRef(exibido.current).current;

  const pct = (valor) => Math.min(100, (valor / metaRef.current) * 100);

  function pintar(valor) {
    const el = raiz.current;
    if (!el) return;
    escrever(el.querySelector('[data-rs]'), reais(valor));
    escrever(el.querySelector('[data-falta]'), reais(Math.max(0, arredondar(metaRef.current - valor))));
    escrever(el.querySelector('[data-pct]'), `${Math.round(pct(valor))}%`);
    const base = pct(valor);
    el.querySelector('[data-barra]').style.width = `${base}%`;
    const extra = Math.min(100 - base, pct(previaRef.current));
    const faixa = el.querySelector('[data-previa]');
    faixa.style.left = `${base}%`;
    faixa.style.width = `${Math.max(0, extra)}%`;
  }

  useEffect(() => {
    if (reduzido()) {
      exibido.current = arrecadado;
      pintar(arrecadado);
      return undefined;
    }
    const estado = { v: exibido.current };
    const anim = gsap.to(estado, {
      v: arrecadado, duration: 1.2, ease: 'power3.out',
      onUpdate: () => { exibido.current = estado.v; pintar(estado.v); },
      onComplete: () => { exibido.current = arrecadado; pintar(arrecadado); },
    });
    return () => anim.kill();
  }, [arrecadado, meta]);

  useEffect(() => { pintar(exibido.current); }, [previa]);

  const final = Math.round(pct(arrecadado));
  const extra = previa > 0 ? Math.round(pct(arrecadado + previa)) : null;

  return (
    <div className="barra-pedido" ref={raiz}>
      <div className="trilha" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={final} aria-label={`${final}% arrecadado`}>
        <i data-barra style={{ width: `${pct(inicial)}%` }} />
        <s className="trilha__previa" data-previa aria-hidden="true" />
      </div>
      <p className="nums">
        <span><b data-rs>{reais(inicial)}</b> de {reais(meta)}</span>
        <span className="nums__pct" data-pct>{`${Math.round(pct(inicial))}%`}</span>
      </p>
      <p className="barra-pedido__falta">
        Faltam <b data-falta>{reais(Math.max(0, arredondar(meta - inicial)))}</b>
      </p>
      {extra !== null && (
        <p className="barra-pedido__previa" aria-live="polite">Com a sua doação, o pedido chega a {extra}%.</p>
      )}
    </div>
  );
}
