import { useLayoutEffect, useRef } from 'react';
import { gsap, reduzido, telaGrande } from '../movimento';

const TITULO = 'Uma chuteira pode manter uma criança no time.';

function Bola() {
  return (
    <svg viewBox="0 0 100 100" focusable="false">
      <circle cx="50" cy="50" r="47" fill="#fff" stroke="#17231B" strokeWidth="3" />
      <polygon points="50,30 64,40 59,57 41,57 36,40" fill="#17231B" />
      <path d="M50 30 L50 5 M64 40 L88 32 M59 57 L74 78 M41 57 L26 78 M36 40 L12 32" stroke="#17231B" strokeWidth="3" fill="none" />
      <path d="M38 6 L50 3 L62 6 L50 13 Z M86 24 L95 40 L90 50 L84 36 Z M80 74 L70 92 L60 90 L72 76 Z M28 92 L18 76 L28 74 L40 90 Z M5 52 L6 38 L14 26 L16 38 Z" fill="#17231B" />
    </svg>
  );
}

/**
 * Hero da busca: gramado 3D que a câmera desce, giz que risca o meio de campo, bola que rola até a
 * marca do centro e título palavra por palavra. Os filhos (a caixa de busca) entram por último.
 * O estado final é o do CSS: com movimento reduzido nada é animado.
 */
export function Hero({ children }) {
  const raiz = useRef(null);

  useLayoutEffect(() => {
    if (reduzido()) return undefined;
    const ctx = gsap.context(() => {
      const q = (seletor) => raiz.current.querySelector(seletor);
      const grande = window.matchMedia(telaGrande).matches;

      // Abertura (cerca de 3 s)
      const linha = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
      if (grande) {
        const bola = q('.campo-hero__bola');
        const partida = -(raiz.current.offsetWidth * 0.74 + 60);
        gsap.set(bola, { opacity: 0 });
        linha
          .fromTo(q('.campo-hero__chao'), { rotationX: 62, scale: 1.3 }, { rotationX: 0, scale: 1, duration: 1.4 }, 0)
          .fromTo('.campo-hero__giz', { strokeDashoffset: 1200 }, { strokeDashoffset: 0, duration: 1.3 }, 0.8)
          .fromTo('.campo-hero__giz--circulo', { strokeDashoffset: 1200 }, { strokeDashoffset: 0, duration: 1.3 }, 1.05)
          .set(bola, { opacity: 1 }, 1.9)
          .fromTo(bola, { x: partida, rotation: 0 }, { x: 0, rotation: 720, duration: 1.1, ease: 'power3.out' }, 1.9);
      }
      linha
        .from('.campo-hero__palavra', { y: 30, opacity: 0, duration: 0.9, ease: 'power4.out', stagger: 0.06 }, 0.35)
        .from('.campo-hero__sub', { opacity: 0, y: 12, duration: 0.8, ease: 'power2.out' }, 1.1)
        .from('.campo-hero .filtros', { y: 70, opacity: 0, duration: 1, ease: 'power4.out' }, 1.4);

      // B: o campo fica para trás enquanto a lista sobe por cima
      gsap.to(raiz.current, {
        y: () => raiz.current.offsetHeight * 0.5,
        scale: 0.92,
        borderRadius: 24,
        ease: 'none',
        scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.to('.campo-hero__sombra', {
        opacity: 0.55,
        ease: 'none',
        scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom top', scrub: 1 },
      });
    }, raiz);
    return () => ctx.revert();
  }, []);

  return (
    <section className="campo-hero" ref={raiz}>
      <div className="campo-hero__cena" aria-hidden="true">
        <div className="campo-hero__chao">
          <div className="campo-hero__listras" />
          <svg className="campo-hero__campo" viewBox="0 0 360 360" focusable="false">
            <line className="campo-hero__giz" x1="180" y1="-200" x2="180" y2="560" />
            <circle className="campo-hero__giz campo-hero__giz--circulo" cx="180" cy="180" r="110" />
          </svg>
        </div>
        <div className="campo-hero__bola"><Bola /></div>
      </div>
      <div className="campo-hero__conteudo">
        <h1>
          <span className="so-leitor">{TITULO}</span>
          <span aria-hidden="true">
            {TITULO.split(' ').map((palavra, i) => (
              <span key={i}><span className="campo-hero__palavra">{palavra}</span>{' '}</span>
            ))}
          </span>
        </h1>
        <p className="campo-hero__sub">
          Escolinhas de futebol social cadastram o que falta para cada criança treinar. Você escolhe
          um pedido, doa qualquer valor e acompanha até ele ser completado.
        </p>
      </div>
      {children}
      <div className="campo-hero__sombra" aria-hidden="true" />
    </section>
  );
}
