import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reais } from './formatos';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

const CHAVE = 'doagol:animacoes';

/** Escolha salva do usuário ('ligadas' | 'desligadas') ou null para seguir o sistema. */
export function lerEscolha() {
  try {
    const v = window.localStorage.getItem(CHAVE);
    return v === 'ligadas' || v === 'desligadas' ? v : null;
  } catch { return null; }
}

/** Grava a escolha; sem armazenamento disponível, a troca só vale até recarregar. */
export function gravarEscolha(valor) {
  try { window.localStorage.setItem(CHAVE, valor); } catch { /* sem localStorage */ }
}

/** Sem escolha salva, vale o sistema (prefers-reduced-motion); com escolha, ela manda. */
export function reduzido() {
  const escolha = lerEscolha();
  if (escolha) return escolha === 'desligadas';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Marca a raiz para o CSS seguir a mesma regra do JS. Chamar antes de renderizar. */
export function aplicarPreferencia() {
  const escolha = lerEscolha();
  const raiz = document.documentElement;
  raiz.classList.toggle('animacoes-ligadas', escolha === 'ligadas');
  raiz.classList.toggle('animacoes-desligadas', escolha === 'desligadas');
}

export const telaGrande = '(min-width: 861px)';

let lenis = null;

/** Liga o único motor de rolagem suave (Lenis) ao ScrollTrigger. Devolve a função que desliga. */
export function iniciarRolagem() {
  if (reduzido()) return () => {};
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const quadro = (tempo) => lenis.raf(tempo * 1000);
  gsap.ticker.add(quadro);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(quadro);
    lenis.destroy();
    lenis = null;
  };
}

/** Volta ao topo sem animação (troca de rota). */
export function voltarAoTopo() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
  ScrollTrigger.refresh();
}

/** Desce até um elemento com rolagem suave. */
export function rolarPara(elemento, deslocamento = -16) {
  if (!elemento) return;
  if (lenis) lenis.scrollTo(elemento, { offset: deslocamento, duration: 1.2 });
  else elemento.scrollIntoView({ block: 'start', behavior: reduzido() ? 'auto' : 'smooth' });
}

/** Recalcula as posições depois que o layout mudou (resultados novos, imagens, fontes). */
export function recalcular() {
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/** Escreve num nó de texto sem trocá-lo (o React continua dono do nó). */
export function escrever(el, texto) {
  if (el?.firstChild) el.firstChild.nodeValue = texto;
}

/** Conta de 0 até o valor com desaceleração, atualizando R$, % e barra de um bloco com data-*. */
export function contarBloco(bloco, { duracao = 1.4, atraso = 0, aoTerminar } = {}) {
  const alvo = Number(bloco.dataset.rs);
  const pct = Number(bloco.dataset.pct);
  const valor = bloco.querySelector('[data-conta-rs]');
  const percentual = bloco.querySelector('[data-conta-pct]');
  const barra = bloco.querySelector('[data-conta-barra]');
  const estado = { k: 0 };
  return gsap.to(estado, {
    k: 1, duration: duracao, delay: atraso, ease: 'power3.out',
    onUpdate: () => {
      escrever(valor, reais(alvo * estado.k));
      escrever(percentual, `${Math.round(pct * estado.k)}%`);
      if (barra) barra.style.width = `${Math.min(pct, 100) * estado.k}%`;
    },
    onComplete: aoTerminar,
  });
}

/** Zera o bloco (usado antes de animar). */
export function zerarBloco(bloco) {
  escrever(bloco.querySelector('[data-conta-rs]'), reais(0));
  escrever(bloco.querySelector('[data-conta-pct]'), '0%');
  const barra = bloco.querySelector('[data-conta-barra]');
  if (barra) barra.style.width = '0%';
}

/** Devolve o bloco ao valor real (limpeza). */
export function restaurarBloco(bloco) {
  escrever(bloco.querySelector('[data-conta-rs]'), reais(Number(bloco.dataset.rs)));
  escrever(bloco.querySelector('[data-conta-pct]'), `${Number(bloco.dataset.pct)}%`);
  const barra = bloco.querySelector('[data-conta-barra]');
  if (barra) barra.style.width = `${Math.min(Number(bloco.dataset.pct), 100)}%`;
}
