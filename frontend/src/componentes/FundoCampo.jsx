import { useLayoutEffect, useRef } from 'react';
import { gsap, reduzido } from '../movimento';

/**
 * Fundo decorativo: campo visto de cima (grama com faixas, ruído estático e linhas brancas) sob um véu claro.
 * As linhas são riscadas como giz uma vez por montagem (cerca de 1,2 s); com reduzido() já ficam desenhadas.
 * `penalti` põe a marca do pênalti atrás do card da criança (em telas pequenas as áreas somem pelo CSS).
 */
export function FundoCampo({ penalti = false }) {
  const raiz = useRef(null);

  useLayoutEffect(() => {
    if (reduzido() || !raiz.current) return undefined;
    const ctx = gsap.context(() => {
      const riscar = (seletor, duracao, inicio, tl) => {
        const alvos = gsap.utils.toArray(seletor);
        if (alvos.length) tl.fromTo(alvos, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: duracao, ease: 'power2.inOut' }, inicio);
      };
      gsap.set('.fundo-campo__linha', { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set('.fundo-campo__ponto', { opacity: 0, transformOrigin: '50% 50%', scale: 0 });
      const tl = gsap.timeline();
      riscar('.fundo-campo__g1', 0.55, 0, tl);
      riscar('.fundo-campo__g2', 0.55, 0.4, tl);
      tl.to('.fundo-campo__ponto', { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.inOut', stagger: 0.08, clearProps: 'all' }, 0.9);
    }, raiz);
    return () => ctx.revert();
  }, []);

  return (
    <div className="fundo-campo" aria-hidden="true" ref={raiz}>
      <svg viewBox="60 100 1200 600" preserveAspectRatio="xMinYMin slice" focusable="false">
        <g className="fundo-campo__linhas">
          <rect className="fundo-campo__linha fundo-campo__g1" pathLength="1" x="90" y="40" width="1090" height="520" />
          <line className="fundo-campo__linha fundo-campo__g1" pathLength="1" x1="880" y1="40" x2="880" y2="560" />
          <circle className="fundo-campo__linha fundo-campo__g2 fundo-campo__meio" pathLength="1" cx="880" cy="300" r="85" />
          <circle className="fundo-campo__ponto fundo-campo__meio" cx="880" cy="300" r="5" />
          <g className="fundo-campo__areas">
            <rect className="fundo-campo__linha fundo-campo__g2" pathLength="1" x="90" y="130" width="240" height="340" />
            <rect className="fundo-campo__linha fundo-campo__g2" pathLength="1" x="90" y="215" width="85" height="170" />
            <path className="fundo-campo__linha fundo-campo__g2" pathLength="1" d="M330 230 A 85 85 0 0 1 330 370" />
            <circle className={`fundo-campo__ponto${penalti ? '' : ' fundo-campo__ponto--oculto'}`} cx="255" cy="300" r="5" />
          </g>
        </g>
      </svg>
    </div>
  );
}
