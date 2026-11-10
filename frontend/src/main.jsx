import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import { Busca } from './paginas/Busca';
import { Perfil } from './paginas/Perfil';
import { Escolinha } from './paginas/Escolinha';

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

function App() {
  const [rota, setRota] = useState(lerRota);
  const [escolinhas, setEscolinhas] = useState([]);

  const recarregarEscolinhas = async () => {
    try { setEscolinhas(await api.escolinhas()); } catch { /* a busca continua funcionando sem os nomes */ }
  };

  useEffect(() => {
    const aoMudar = () => { setRota(lerRota()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', aoMudar);
    recarregarEscolinhas();
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  return (
    <>
      <header className="topo">
        <a className="marca" href="#/"><Marca /> DoaGol</a>
        <nav className="menu" aria-label="Principal">
          <a href="#/" aria-current={rota.pagina !== 'escolinha' ? 'page' : undefined}>Quero doar</a>
          <a href="#/escolinha" aria-current={rota.pagina === 'escolinha' ? 'page' : undefined}>Sou escolinha</a>
        </nav>
      </header>
      <main>
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

createRoot(document.getElementById('raiz')).render(<App />);
