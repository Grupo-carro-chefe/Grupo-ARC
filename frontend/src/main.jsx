import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import { Busca } from './paginas/Busca';
import { Perfil } from './paginas/Perfil';
import { Escolinha } from './paginas/Escolinha';
import { gsap, iniciarRolagem, voltarAoTopo, reduzido, gravarEscolha, aplicarPreferencia } from './movimento';

/** Rotas por hash (#/, #/crianca/:id, #/escolinha): funcionam em qualquer hospedagem estática. */
function lerRota() {
  const partes = window.location.hash.replace(/^#\/?/, '').split('/');
  if (partes[0] === 'crianca' && partes[1]) return { pagina: 'perfil', id: partes[1] };
  if (partes[0] === 'escolinha') return { pagina: 'escolinha' };
  return { pagina: 'busca' };
}

function Marca() {
  return (
    <svg viewBox="0 0 32 32" className="marca__icone" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 9 l6.2 4.5 -2.4 7.3 h-7.6 l-2.4 -7.3 z" fill="currentColor" />
    </svg>
  );
}

/** Liga ou desliga as animações; a escolha vale sobre o sistema e a página recarrega para reiniciar o movimento. */
function BotaoAnimacoes() {
  const ligadas = !reduzido();
  const trocar = () => {
    gravarEscolha(ligadas ? 'desligadas' : 'ligadas');
    window.location.reload();
  };
  return (
    <button type="button" className="menu__animacoes" aria-pressed={ligadas} onClick={trocar}>
      Animações: {ligadas ? 'ligadas' : 'desligadas'}
    </button>
  );
}

function App() {
  const [rota, setRota] = useState(lerRota);
  const [escolinhas, setEscolinhas] = useState([]);

  const recarregarEscolinhas = async () => {
    try { setEscolinhas(await api.escolinhas()); } catch { /* a busca continua funcionando sem os nomes */ }
  };

  useEffect(() => {
    const aoMudar = () => { setRota(lerRota()); voltarAoTopo(); };
    window.addEventListener('hashchange', aoMudar);
    recarregarEscolinhas();
    const desligarRolagem = iniciarRolagem();
    return () => { window.removeEventListener('hashchange', aoMudar); desligarRolagem(); };
  }, []);

  // Entrada curta ao trocar de página (fade, 0,3 s); a primeira abertura fica com o hero.
  const principal = useRef(null);
  const primeira = useRef(true);
  useLayoutEffect(() => {
    if (primeira.current) { primeira.current = false; return undefined; }
    if (reduzido() || !principal.current) return undefined;
    const anim = gsap.fromTo(principal.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out', clearProps: 'opacity' });
    return () => { anim.kill(); gsap.set(principal.current, { clearProps: 'opacity' }); };
  }, [rota.pagina]);

  return (
    <>
      <header className="topo">
        <a className="marca" href="#/"><Marca /> DoaGol</a>
        <nav className="menu" aria-label="Principal">
          <a href="#/" aria-current={rota.pagina !== 'escolinha' ? 'page' : undefined}>Quero doar</a>
          <a href="#/escolinha" aria-current={rota.pagina === 'escolinha' ? 'page' : undefined}>Sou escolinha</a>
          <BotaoAnimacoes />
        </nav>
      </header>
      <main ref={principal}>
        {rota.pagina === 'busca' && <Busca escolinhas={escolinhas} />}
        {rota.pagina === 'perfil' && <Perfil id={rota.id} escolinhas={escolinhas} />}
        {rota.pagina === 'escolinha' && <Escolinha escolinhas={escolinhas} recarregarEscolinhas={recarregarEscolinhas} />}
      </main>
      <footer className="rodape">
        DoaGol, projeto de Laboratório de Engenharia de Software (Mackenzie). Dados de exemplo fictícios;
        pagamentos simulados.
      </footer>
    </>
  );
}

aplicarPreferencia();
createRoot(document.getElementById('raiz')).render(<App />);
