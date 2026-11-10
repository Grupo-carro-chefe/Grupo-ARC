import { reais } from '../formatos';

/** Barra de progresso da necessidade (RF08): arrecadado sobre a meta. */
export function Progresso({ arrecadado, meta, percentual, compacto = false }) {
  return (
    <div className={`progresso${compacto ? ' progresso--compacto' : ''}`}>
      <div
        className="progresso__trilho"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        aria-label={`${percentual}% arrecadado`}
      >
        <div className="progresso__barra" data-conta-barra style={{ width: `${Math.min(percentual, 100)}%` }} />
      </div>
      <p className="progresso__texto">
        <strong data-conta-rs>{reais(arrecadado)}</strong> de {reais(meta)}
        <span className="progresso__pct" data-conta-pct>{`${percentual}%`}</span>
      </p>
    </div>
  );
}
