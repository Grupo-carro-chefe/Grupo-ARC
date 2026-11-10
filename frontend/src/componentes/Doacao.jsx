import { useState } from 'react';
import { api } from '../api';
import { FORMAS_PAGAMENTO, TIPOS, dataHora, lerValor, reais } from '../formatos';

const SUGESTOES = [20, 50, 100];

/** Formulário de doação para uma necessidade (UC-08). */
export function FormularioDoacao({ necessidade, apelido, aoConcluir, aoCancelar }) {
  const restante = Math.round((necessidade.valorEstimado - necessidade.valorArrecadado) * 100) / 100;
  const [valor, setValor] = useState(String(Math.min(50, restante)).replace('.', ','));
  const [forma, setForma] = useState('PIX');
  const [doador, setDoador] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function confirmar(evento) {
    evento.preventDefault();
    const numero = lerValor(valor);
    if (!Number.isFinite(numero) || numero <= 0) {
      setErro('Informe um valor maior que zero.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      const comprovante = await api.doar(necessidade.id, {
        doadorId: doador.trim(),
        valor: numero,
        formaPagamento: forma,
        anonima,
      });
      aoConcluir(comprovante);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="doacao" onSubmit={confirmar} noValidate>
      <h3 className="doacao__titulo">Doar para {apelido}</h3>
      <p className="doacao__alvo">
        {necessidade.descricao} <span className="etiqueta">{TIPOS[necessidade.tipo]}</span>
      </p>
      <p className="doacao__restante">Faltam {reais(restante)} para completar este pedido.</p>

      <fieldset className="campo">
        <legend>Valor</legend>
        <div className="sugestoes">
          {SUGESTOES.filter((s) => s < restante).map((s) => (
            <button type="button" key={s} className="chip" aria-pressed={lerValor(valor) === s} onClick={() => setValor(String(s))}>
              {reais(s)}
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={lerValor(valor) === restante} onClick={() => setValor(String(restante).replace('.', ','))}>
            Completar ({reais(restante)})
          </button>
        </div>
        <label className="campo__moeda">
          <span>R$</span>
          <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor da doação em reais" />
        </label>
      </fieldset>

      <fieldset className="campo">
        <legend>Forma de pagamento</legend>
        <div className="opcoes">
          {Object.entries(FORMAS_PAGAMENTO).map(([chave, rotulo]) => (
            <label key={chave} className={`opcao${forma === chave ? ' opcao--marcada' : ''}`}>
              <input type="radio" name="forma" value={chave} checked={forma === chave} onChange={() => setForma(chave)} />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="campo">
        <span className="campo__rotulo">Seu nome ou e-mail</span>
        <input value={doador} onChange={(e) => setDoador(e.target.value)} placeholder="Ex.: ana@email.com" autoComplete="email" />
      </label>

      <label className="caixa">
        <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} />
        Doar anonimamente (a escolinha não vê seu nome)
      </label>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="acoes">
        <button type="submit" className="botao botao--principal" disabled={enviando}>
          {enviando ? 'Processando pagamento…' : 'Confirmar doação'}
        </button>
        <button type="button" className="botao botao--leve" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
      <p className="nota">Pagamento simulado nesta versão: nenhuma cobrança real é feita.</p>
    </form>
  );
}

/** Comprovante da doação (UC-09), no formato de ingresso. */
export function Comprovante({ comprovante, necessidade, apelido, aoFechar }) {
  return (
    <div className="ingresso" role="status">
      <div className="ingresso__corpo">
        <p className="ingresso__ok">Doação confirmada</p>
        <p className="ingresso__valor">{reais(comprovante.valor)}</p>
        <p>
          para <strong>{apelido}</strong>: {necessidade.descricao}
        </p>
        <dl className="ingresso__dados">
          <div><dt>Pagamento</dt><dd>{FORMAS_PAGAMENTO[comprovante.formaPagamento]}</dd></div>
          <div><dt>Data</dt><dd>{dataHora(comprovante.data)}</dd></div>
          <div><dt>Doador</dt><dd>{comprovante.anonima ? 'Anônimo para a escolinha' : comprovante.doadorId}</dd></div>
          <div><dt>Transação</dt><dd className="quebra">{comprovante.transacaoId}</dd></div>
        </dl>
      </div>
      <div className="ingresso__canhoto">
        <span>Comprovante</span>
        <strong>{comprovante.codigo}</strong>
      </div>
      <button type="button" className="botao botao--leve ingresso__fechar" onClick={aoFechar}>
        Voltar ao perfil
      </button>
    </div>
  );
}
