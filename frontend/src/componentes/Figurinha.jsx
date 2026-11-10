import { TIPOS, reais } from '../formatos';
import { Progresso } from './Progresso';

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

/** Cartão de uma criança na busca (UC-06), no formato de figurinha de álbum. */
export function Figurinha({ crianca, escolinha }) {
  const faltando = crianca.necessidades.reduce((soma, n) => soma + (n.valorEstimado - n.valorArrecadado), 0);
  return (
    <a className="figurinha" href={`#/crianca/${crianca.id}`}>
      <div className="figurinha__moldura">
        <div className="figurinha__topo">
          <Camisa apelido={crianca.apelido} />
          <div>
            <h3 className="figurinha__nome">{crianca.apelido}</h3>
            <p className="figurinha__meta">
              {crianca.idade} anos, {crianca.cidade}/{crianca.uf}
            </p>
            {escolinha && <p className="figurinha__escolinha">{escolinha.nome}</p>}
          </div>
        </div>
        <ul className="figurinha__lista">
          {crianca.necessidades.slice(0, 2).map((n) => (
            <li key={n.id}>
              <p className="figurinha__item">
                <span className="etiqueta">{TIPOS[n.tipo]}</span>
                {n.descricao}
              </p>
              <Progresso arrecadado={n.valorArrecadado} meta={n.valorEstimado} percentual={n.percentual} compacto />
            </li>
          ))}
        </ul>
        <p className="figurinha__rodape">
          Faltam <strong>{reais(faltando)}</strong>
          {crianca.necessidades.length > 2 && ` em ${crianca.necessidades.length} pedidos`}
        </p>
      </div>
    </a>
  );
}
