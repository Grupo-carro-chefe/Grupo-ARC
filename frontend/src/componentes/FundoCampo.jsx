import { useLayoutEffect, useRef } from 'react';
import { gsap, reduzido } from '../movimento';

/**
 * Fundo decorativo: campo inteiro visto de cima (105 x 68 em escala), centralizado, com grama em faixas,
 * ruído estático e um véu claro. As linhas são riscadas a partir do centro, espelhadas, uma vez por montagem
 * (cerca de 1,4 s); sem JS ou com reduzido() já ficam todas desenhadas.
 */
export function FundoCampo() {
  const raiz = useRef(null);

  useLayoutEffect(() => {
    if (reduzido() || !raiz.current) return undefined;
    const ctx = gsap.context(() => {
      const riscar = (seletor, duracao, inicio, tl) => {
        tl.fromTo(seletor, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: duracao, ease: 'power2.inOut' }, inicio);
      };
      gsap.set('.fundo-campo__linha', { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set('.fundo-campo__ponto', { opacity: 0, transformOrigin: '50% 50%', transformBox: 'fill-box', scale: 0.4 });
      const tl = gsap.timeline();
      riscar('.fundo-campo__meio', 0.45, 0, tl);
      riscar('.fundo-campo__circulo', 0.55, 0.25, tl);
      riscar('.fundo-campo__contorno', 0.7, 0.35, tl);
      riscar('.fundo-campo__area', 0.5, 0.75, tl);
      riscar('.fundo-campo__arco', 0.35, 1.05, tl);
      tl.to('.fundo-campo__ponto', { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.inOut', clearProps: 'all' }, 1.15);
    }, raiz);
    return () => ctx.revert();
  }, []);

  const l = (classe, d) => <path className={`fundo-campo__linha ${classe}`} pathLength="1" d={d} />;
  return (
    <div className="fundo-campo" aria-hidden="true" ref={raiz}>
      <svg viewBox="-10 -10 1070 700" preserveAspectRatio="xMidYMid meet" focusable="false">
        {l('fundo-campo__meio', 'M525 340 V0')}
        {l('fundo-campo__meio', 'M525 340 V680')}
        {l('fundo-campo__circulo', 'M525 248.5 A91.5 91.5 0 1 1 524.9 248.5')}
        {l('fundo-campo__contorno', 'M525 0 H0 V680 H525')}
        {l('fundo-campo__contorno', 'M525 0 H1050 V680 H525')}
        {l('fundo-campo__area', 'M0 138.5 H165 V541.5 H0 M0 248.5 H55 V431.5 H0')}
        {l('fundo-campo__area', 'M1050 138.5 H885 V541.5 H1050 M1050 248.5 H995 V431.5 H1050')}
        {l('fundo-campo__arco', 'M165 267 A91.5 91.5 0 0 1 165 413')}
        {l('fundo-campo__arco', 'M885 267 A91.5 91.5 0 0 0 885 413')}
        <circle className="fundo-campo__ponto" cx="525" cy="340" r="5" />
        <circle className="fundo-campo__ponto" cx="110" cy="340" r="5" />
        <circle className="fundo-campo__ponto" cx="940" cy="340" r="5" />
      </svg>
    </div>
  );
}
