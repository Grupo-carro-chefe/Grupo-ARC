import { TIPOS, reais } from '../formatos';
import { useRef } from 'react';
import { gsap, reduzido } from '../movimento';

/** Inicial do apelido em estilo de número de camisa. */
export function Camisa({ apelido, grande = false }) {
  return (
    <div className={`camisa${grande ? ' camisa--grande' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="camisa__forma">
        <path d="M30 8 L42 8 Q50 18 58 8 L70 8 L94 24 L84 42 L74 36 L74 94 L26 94 L26 36 L16 42 L6 24 Z" />
      </svg>
      <span className="camisa__letra">{apelido.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/** Passa de 70%: o pedido ganha o selo "Quase lá". */
const QUASE_LA = 70;

/**
 * Cartão de uma criança na busca (UC-06). O cartão inteiro é um link para o perfil.
 * Com mouse ele inclina de leve na direção do cursor e o botão "Doar" sobe por baixo;
 * em toque e teclado o botão fica sempre visível.
 */
export function Figurinha({ crianca, escolinha }) {
  const miolo = useRef(null);
  const faltando = crianca.necessidades.reduce((soma, n) => soma + (n.valorEstimado - n.valorArrecadado), 0);
  const extras = crianca.necessidades.length - 2;

  const inclinar = (e) => {
    if (e.pointerType !== 'mouse' || reduzido()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(miolo.current, {
      rotationY: x * 16, rotationX: -y * 16, y: -4, transformPerspective: 900,
      duration: 0.4, ease: 'power3.out', overwrite: 'auto',
    });
  };
  const soltar = () => gsap.to(miolo.current, { rotationY: 0, rotationX: 0, y: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });

  return (
    <a className="cartao" href={`#/crianca/${crianca.id}`} onPointerMove={inclinar} onPointerLeave={soltar}>
      <div className="cartao__miolo" ref={miolo}>
        <h3 className="cartao__nome">{crianca.apelido}, {crianca.idade} anos</h3>
        <p className="cartao__meta">{crianca.cidade}/{crianca.uf}</p>
        {escolinha && <p className="cartao__escolinha">{escolinha.nome}</p>}
        <ul className="cartao__lista">
          {crianca.necessidades.slice(0, 2).map((n) => (
            <li key={n.id} className="cartao__pedido" data-rs={n.valorArrecadado} data-pct={n.percentual}>
              <p className="cartao__item">
                <span className="etiqueta">{TIPOS[n.tipo]}</span>
                {n.descricao}
                {n.percentual >= QUASE_LA && <span className="cartao__selo">Quase lá</span>}
              </p>
              <div
                className="trilha"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={n.percentual}
                aria-label={`${n.percentual}% arrecadado`}
              >
                <i data-conta-barra style={{ width: `${Math.min(n.percentual, 100)}%` }} />
              </div>
              <p className="nums">
                <span><b data-conta-rs>{reais(n.valorArrecadado)}</b> de {reais(n.valorEstimado)}</span>
                <span className="nums__pct" data-conta-pct>{`${n.percentual}%`}</span>
              </p>
            </li>
          ))}
        </ul>
        {extras > 0 && <p className="cartao__mais">e mais {extras} {extras === 1 ? 'pedido' : 'pedidos'}</p>}
        <span className="cartao__doar">Doar · faltam {reais(faltando)}</span>
      </div>
    </a>
  );
}
