import { useEffect, useState } from 'react';
import { api } from '../api';
import { estados, municipios, UFS_PADRAO } from '../externo';
import { TIPOS } from '../formatos';
import { Figurinha } from '../componentes/Figurinha';

/** Busca de crianças com necessidades abertas (UC-06). */
export function Busca({ escolinhas }) {
  const [filtros, setFiltros] = useState({ uf: '', cidade: '', tipo: '' });
  const [ufs, setUfs] = useState({ lista: UFS_PADRAO, fonte: 'local' });
  const [cidades, setCidades] = useState([]);
  const [estado, setEstado] = useState({ carregando: true, erro: '', dados: null });

  useEffect(() => { estados().then(setUfs); }, []);
  useEffect(() => { municipios(filtros.uf).then(setCidades); }, [filtros.uf]);

  async function buscar(atuais = filtros) {
    setEstado((e) => ({ ...e, carregando: true, erro: '' }));
    try {
      setEstado({ carregando: false, erro: '', dados: await api.buscarCriancas(atuais) });
    } catch (e) {
      setEstado({ carregando: false, erro: e.message, dados: null });
    }
  }

  useEffect(() => { buscar(); }, []);

  const mudar = (campo) => (e) => {
    const novo = { ...filtros, [campo]: e.target.value };
    if (campo === 'uf') novo.cidade = '';
    setFiltros(novo);
    if (campo !== 'cidade') buscar(novo);
  };

  function limpar() {
    const vazio = { uf: '', cidade: '', tipo: '' };
    setFiltros(vazio);
    buscar(vazio);
  }

  const porId = Object.fromEntries(escolinhas.map((e) => [e.id, e]));
  const temFiltro = filtros.uf || filtros.cidade || filtros.tipo;

  return (
    <>
      <section className="campo-hero">
        <div className="campo-hero__conteudo">
          <h1>Uma chuteira pode manter uma criança no time.</h1>
          <p>
            Escolinhas de futebol social cadastram o que falta para cada criança treinar. Você escolhe
            um pedido, doa qualquer valor e acompanha até ele ser completado.
          </p>
        </div>
      </section>

      <form className="filtros" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
        <label className="campo">
          <span className="campo__rotulo">Estado</span>
          <select value={filtros.uf} onChange={mudar('uf')}>
            <option value="">Todos</option>
            {ufs.lista.map((u) => <option key={u.sigla} value={u.sigla}>{u.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span className="campo__rotulo">Cidade</span>
          <input list="lista-cidades" value={filtros.cidade} onChange={mudar('cidade')} placeholder={filtros.uf ? 'Digite a cidade' : 'Qualquer cidade'} />
          <datalist id="lista-cidades">
            {cidades.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="campo">
          <span className="campo__rotulo">Tipo de pedido</span>
          <select value={filtros.tipo} onChange={mudar('tipo')}>
            <option value="">Todos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <div className="filtros__acoes">
          <button type="submit" className="botao botao--principal">Buscar</button>
          {temFiltro && <button type="button" className="botao botao--leve" onClick={limpar}>Limpar filtros</button>}
        </div>
        {ufs.fonte === 'ibge' && <p className="filtros__fonte">Estados e cidades vêm da API de localidades do IBGE.</p>}
      </form>

      <section className="album" aria-live="polite">
        {estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
        {estado.dados && (
          <>
            <h2 className="album__titulo">
              {estado.dados.total === 1 ? '1 criança precisa de ajuda' : `${estado.dados.total} crianças precisam de ajuda`}
            </h2>
            {estado.dados.total === 0 ? (
              <div className="vazio">
                <p>Nenhuma criança com pedidos abertos para esses filtros.</p>
                <button type="button" className="botao botao--leve" onClick={limpar}>Ver todas as crianças</button>
              </div>
            ) : (
              <div className="album__grade">
                {estado.dados.resultados.map((c) => <Figurinha key={c.id} crianca={c} escolinha={porId[c.escolinhaId]} />)}
              </div>
            )}
          </>
        )}
        {estado.carregando && !estado.dados && <p className="carregando">Carregando crianças…</p>}
      </section>
    </>
  );
}
