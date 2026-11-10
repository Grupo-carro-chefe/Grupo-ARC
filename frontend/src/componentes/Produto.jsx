import { useLayoutEffect, useRef } from 'react';
import { reais } from '../formatos';
import {
  gsap, ScrollTrigger, reduzido, telaGrande, escrever, contarBloco, zerarBloco, restaurarBloco,
} from '../movimento';

/** Soma o que já entrou e a meta de todos os pedidos abertos da criança. */
function totais(crianca) {
  return crianca.necessidades.reduce(
    (t, n) => ({ arrecadado: t.arrecadado + n.valorArrecadado, meta: t.meta + n.valorEstimado }),
    { arrecadado: 0, meta: 0 },
  );
}

function BarraNav() {
  return <div className="janela__nav">DoaGol</div>;
}

/** Perfil da criança dentro da janela do app (dados da API, nada fixo). */
function TelaPerfil({ crianca, escolinha, comTotal = false }) {
  const pedido = crianca.necessidades[0];
  const soma = totais(crianca);
  return (
    <div className="janela__perfil">
      <h3 className="janela__nome">{crianca.apelido}, {crianca.idade} anos</h3>
      <p className="janela__meta">{crianca.cidade}/{crianca.uf}{escolinha ? `, ${escolinha.nome}` : ''}</p>
      {comTotal && (
        <p className="janela__total">
          <strong data-total-rs data-valor={soma.arrecadado}>{reais(soma.arrecadado)}</strong>
          <small>arrecadados de {reais(soma.meta)}</small>
        </p>
      )}
      {pedido && (
        <div className="janela__pedido" data-rs={pedido.valorArrecadado} data-pct={pedido.percentual}>
          <p className="janela__pedido-titulo">{pedido.descricao}</p>
          <div className="trilha"><i data-conta-barra style={{ width: `${Math.min(pedido.percentual, 100)}%` }} /></div>
          <p className="nums">
            <span><b data-conta-rs>{reais(pedido.valorArrecadado)}</b> de {reais(pedido.valorEstimado)}</span>
            <span className="nums__pct" data-conta-pct>{`${pedido.percentual}%`}</span>
          </p>
        </div>
      )}
      <span className="janela__botao">Doar agora</span>
    </div>
  );
}

/** D: janela do app inclinada que endireita com o scroll, com total contando e dois balões. */
export function TelaProduto({ crianca, escolinha }) {
  const raiz = useRef(null);

  useLayoutEffect(() => {
    if (reduzido()) return undefined;
    const q = (s) => raiz.current.querySelector(s);
    const bloco = q('.janela__pedido');
    const total = q('[data-total-rs]');
    const ctx = gsap.context(() => {
      const grande = window.matchMedia(telaGrande).matches;
      if (bloco) zerarBloco(bloco);
      escrever(total, reais(0));
      if (grande) {
        gsap.fromTo(
          '.janela--inclinada',
          { rotationX: 22, rotationY: -14, rotationZ: 3, scale: 0.88, transformPerspective: 1200 },
          {
            rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, ease: 'none',
            scrollTrigger: { trigger: raiz.current, start: 'top 85%', end: 'center 55%', scrub: 1 },
          },
        );
        gsap.set('.balao', { opacity: 0, y: 14 });
        gsap.set('.produto__seta', { strokeDashoffset: 1 });
      }
      ScrollTrigger.create({
        trigger: raiz.current, start: 'top 55%', once: true,
        onEnter: () => {
          if (bloco) contarBloco(bloco, { duracao: 1.6 });
          const alvo = Number(total?.dataset.valor || 0);
          const estado = { k: 0 };
          gsap.to(estado, {
            k: 1, duration: 1.6, ease: 'power3.out',
            onUpdate: () => escrever(total, reais(alvo * estado.k)),
          });
          if (grande) {
            gsap.to('.balao', { opacity: 1, y: 0, duration: 0.8, stagger: 0.3, delay: 0.5, ease: 'power3.out' });
            gsap.to('.produto__seta', { strokeDashoffset: 0, duration: 1, stagger: 0.3, delay: 0.7, ease: 'power2.inOut' });
          }
        },
      });
    }, raiz);
    return () => {
      ctx.revert();
      if (bloco) restaurarBloco(bloco);
      escrever(total, reais(Number(total?.dataset.valor || 0)));
    };
  }, [crianca]);

  return (
    <section className="produto" ref={raiz} aria-labelledby="produto-titulo">
      <h2 id="produto-titulo" className="produto__titulo">O app por dentro</h2>
      <p className="produto__sub">O perfil de uma criança com o que já entrou e o que ainda falta.</p>
      <div className="produto__cena">
        <div className="balao balao--esq">
          <b>IBGE + ViaCEP</b>
          Estado, cidade e endereço vêm das APIs públicas.
        </div>
        <div className="balao balao--dir">
          <b>Comprovante na hora</b>
          Código da doação e forma de pagamento, sem criar conta.
        </div>
        <svg className="produto__setas" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="produto__seta" pathLength="1" d="M150 195 C 150 150, 180 130, 238 128" />
          <path className="produto__seta" pathLength="1" d="M800 335 C 770 345, 760 335, 742 318" />
        </svg>
        <div className="janela janela--inclinada" aria-hidden="true">
          <BarraNav />
          <TelaPerfil crianca={crianca} escolinha={escolinha} comTotal />
        </div>
      </div>
    </section>
  );
}

const ETAPAS = [
  { titulo: 'Encontre uma criança', texto: 'Filtre por estado, cidade e tipo de pedido. Estados e cidades vêm do IBGE.' },
  { titulo: 'Veja quanto falta', texto: 'Cada pedido mostra o valor, o que já entrou e a porcentagem.' },
  { titulo: 'Doe e receba o comprovante', texto: 'Pix, cartão ou boleto. Você pode doar sem mostrar seu nome.' },
];

/** E: palco preso. O texto fica à esquerda e a janela à direita troca busca, perfil e comprovante. */
export function Tour({ criancas, escolinhas }) {
  const raiz = useRef(null);
  const principal = criancas[0];
  const escolinha = escolinhas.find((e) => e.id === principal.escolinhaId);
  const pedido = principal.necessidades[0];

  useLayoutEffect(() => {
    if (reduzido()) return undefined;
    const el = raiz.current;
    const todos = (s) => [...el.querySelectorAll(s)];
    const bloco = el.querySelector('.janela__pedido');
    const mm = gsap.matchMedia();
    mm.add(telaGrande, () => {
      el.classList.add('tour--presa');
      const etapas = todos('.etapa');
      const telas = todos('.tela');
      let ativo = -1;
      let contou = false;
      if (bloco) zerarBloco(bloco);
      const ir = (n) => {
        [etapas, telas].forEach((lista) => lista.forEach((item, i) => {
          item.classList.toggle('ativo', i === n);
          item.classList.toggle('saiu', i < n);
        }));
        if (n === 1 && !contou && bloco) { contou = true; contarBloco(bloco, { duracao: 1.4, atraso: 0.35 }); }
      };
      ir(0);
      ativo = 0;
      gsap.fromTo(
        el.querySelector('.tour__progresso i'),
        { scaleX: 0 },
        {
          scaleX: 1, ease: 'none',
          scrollTrigger: {
            trigger: el, start: 'top top', end: 'bottom bottom', scrub: 1,
            onUpdate: (self) => {
              const n = Math.min(2, Math.floor(self.progress * 3));
              if (n !== ativo) { ativo = n; ir(n); }
            },
          },
        },
      );
      return () => {
        el.classList.remove('tour--presa');
        etapas.concat(telas).forEach((item) => item.classList.remove('ativo', 'saiu'));
        if (bloco) restaurarBloco(bloco);
      };
    });
    return () => mm.revert();
  }, [criancas]);

  return (
    <section className="tour" ref={raiz} aria-labelledby="tour-titulo">
      <div className="tour__palco">
        <div className="tour__texto">
          <h2 id="tour-titulo" className="tour__rotulo">Como doar</h2>
          <div className="tour__etapas">
            {ETAPAS.map((p, i) => (
              <div className="etapa" key={p.titulo}>
                <span className="etapa__n">Passo {i + 1}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            ))}
          </div>
          <div className="tour__progresso" aria-hidden="true"><i /></div>
        </div>
        <div className="janela janela--tour" aria-hidden="true">
          <BarraNav />
          <div className="tela">
            <div className="janela__filtros"><i /><i /><i /><b /></div>
            {criancas.slice(0, 3).map((c) => (
              <div className="janela__linha" key={c.id}><b>{c.apelido}</b>, {c.idade} anos, {c.cidade}/{c.uf}</div>
            ))}
          </div>
          <div className="tela"><TelaPerfil crianca={principal} escolinha={escolinha} /></div>
          <div className="tela">
            <div className="janela__comprovante">
              <div className="janela__ok">✓</div>
              <b>Doação confirmada</b>
              <code>DOA-········</code>
              <p>Para {principal.apelido}{pedido ? `: ${pedido.descricao}` : ''}</p>
              <p className="janela__nota">O código aparece aqui na hora.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
