import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api';
import { FORMAS_PAGAMENTO, TIPOS, dataHora, lerValor, reais } from '../formatos';
import { gsap, reduzido } from '../movimento';

const RAPIDOS = [10, 25, 50];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ICONES = {
  PIX: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l4.1 4.1a2 2 0 0 1 0 2.8L12 13.8 7.9 9.7a2 2 0 0 1 0-2.8L12 2.8zM12 21.2l-4.1-4.1a2 2 0 0 1 0-2.8L12 10.2l4.1 4.1a2 2 0 0 1 0 2.8L12 21.2z" /></svg>
  ),
  CARTAO_CREDITO: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>
  ),
  BOLETO: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20.5 5v14" /></svg>
  ),
};

/** Formulário de doação para uma necessidade (UC-08). */
export function FormularioDoacao({ necessidade, apelido, aoConcluir, aoCancelar, aoMudarValor }) {
  const restante = Math.round((necessidade.valorEstimado - necessidade.valorArrecadado) * 100) / 100;
  const [valor, setValor] = useState(String(Math.min(50, restante)).replace('.', ','));
  const [forma, setForma] = useState('PIX');
  const [doador, setDoador] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [erroValor, setErroValor] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const idBase = useId();
  const idValor = `${idBase}-valor`;
  const idEmail = `${idBase}-email`;
  const idErroValor = `${idBase}-erro-valor`;
  const idErroEmail = `${idBase}-erro-email`;
  const idFormas = `${idBase}-formas`;

  const numero = lerValor(valor);
  const valido = Number.isFinite(numero) && numero > 0;

  useEffect(() => { aoMudarValor?.(valido ? numero : 0); }, [valor]);

  function escolher(texto) {
    setValor(texto);
    setErroValor('');
    setErro('');
  }

  async function confirmar(evento) {
    evento.preventDefault();
    let falhou = false;
    if (!valido) {
      setErroValor('Informe um valor maior que zero.');
      falhou = true;
    }
    if (!doador.trim()) {
      setErroEmail('Mesmo anônimo, precisamos do seu e-mail para enviar o comprovante.');
      falhou = true;
    } else if (!EMAIL.test(doador.trim())) {
      setErroEmail('Esse e-mail parece incompleto. Use o formato ana@email.com.');
      falhou = true;
    }
    if (falhou) {
      document.getElementById(!valido ? idValor : idEmail)?.focus();
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
      setEnviando(false);
    }
  }

  // Entrada do formulário: fade + 16 px (só a aparência; a doação não muda)
  const formRef = useRef(null);
  useLayoutEffect(() => {
    if (reduzido() || !formRef.current) return undefined;
    const anim = gsap.fromTo(formRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'opacity,transform' });
    return () => { anim.kill(); gsap.set(formRef.current, { clearProps: 'opacity,transform' }); };
  }, []);

  return (
    <form className="doacao" ref={formRef} onSubmit={confirmar} noValidate>
      <h2 className="doacao__titulo">Doar para {apelido}</h2>
      <p className="doacao__alvo">
        {necessidade.descricao} <span className="etiqueta">{TIPOS[necessidade.tipo]}</span>
      </p>

      <div className="campo">
        <label className="campo__rotulo" htmlFor={idValor}>Valor</label>
        <div className="sugestoes">
          {RAPIDOS.filter((s) => s < restante).map((s) => (
            <button type="button" key={s} className="chip" aria-pressed={valido && numero === s} onClick={() => escolher(String(s))}>
              {reais(s)}
            </button>
          ))}
          <button type="button" className="chip chip--completar" aria-pressed={valido && numero === restante} onClick={() => escolher(String(restante).replace('.', ','))}>
            Completar ({reais(restante)})
          </button>
        </div>
        <div className={`moeda${erroValor ? ' moeda--erro' : ''}`}>
          <span className="moeda__prefixo" aria-hidden="true">R$</span>
          <input
            id={idValor}
            inputMode="decimal"
            autoComplete="off"
            value={valor}
            onChange={(e) => escolher(e.target.value)}
            placeholder="0,00"
            aria-invalid={erroValor ? 'true' : undefined}
            aria-describedby={erroValor ? idErroValor : undefined}
          />
        </div>
        {erroValor && <p className="campo__erro" id={idErroValor}>{erroValor}</p>}
      </div>

      <div className="campo">
        <span className="campo__rotulo" id={idFormas}>Forma de pagamento</span>
        <div className="formas" role="radiogroup" aria-labelledby={idFormas}>
          {Object.entries(FORMAS_PAGAMENTO).map(([chave, rotulo]) => (
            <label key={chave} className={`forma${forma === chave ? ' forma--marcada' : ''}`}>
              <input type="radio" name="forma" value={chave} checked={forma === chave} onChange={() => setForma(chave)} />
              <span className="forma__icone">{ICONES[chave]}</span>
              <span className="forma__nome">{rotulo}</span>
              <svg className="forma__ok" viewBox="0 0 14 11" aria-hidden="true"><path d="M1 5.5l4 4 8-8.5" /></svg>
            </label>
          ))}
        </div>
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor={idEmail}>Seu e-mail</label>
        <input
          id={idEmail}
          type="email"
          value={doador}
          onChange={(e) => { setDoador(e.target.value); setErroEmail(''); setErro(''); }}
          placeholder="ana@email.com"
          autoComplete="email"
          aria-invalid={erroEmail ? 'true' : undefined}
          aria-describedby={erroEmail ? idErroEmail : undefined}
        />
        {erroEmail && <p className="campo__erro" id={idErroEmail}>{erroEmail}</p>}
      </div>

      <label className="chave">
        <input type="checkbox" role="switch" checked={anonima} aria-checked={anonima} onChange={(e) => setAnonima(e.target.checked)} />
        <span className="chave__trilho" aria-hidden="true"><span className="chave__bolinha" /></span>
        <span>Doar sem mostrar meu nome para a escolinha</span>
      </label>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="acoes">
        <button type="submit" className="botao botao--principal" disabled={enviando} aria-busy={enviando}>
          {enviando ? 'Processando pagamento…' : `Doar${valido ? ` ${reais(numero)}` : ''}`}
        </button>
        <button type="button" className="botao botao--leve" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
      <p className="nota">Pagamento simulado nesta versão: nenhuma cobrança real é feita.</p>
    </form>
  );
}

/** Comprovante da doação (UC-09), no formato de ingresso. */
export function Comprovante({ comprovante, necessidade, apelido, aoFechar }) {
  const selo = useRef(null);
  const [copiado, setCopiado] = useState('');

  useEffect(() => {
    if (!selo.current || reduzido()) return undefined;
    const anim = gsap.fromTo(selo.current, { scale: 0 }, { scale: 1, duration: 0.7, delay: 0.15, ease: 'back.out(1.8)' });
    return () => anim.kill();
  }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(comprovante.codigo);
      setCopiado('Código copiado');
    } catch {
      setCopiado('Não deu para copiar. Selecione o código e copie.');
    }
    setTimeout(() => setCopiado(''), 2500);
  }

  return (
    <div className="ingresso" role="status">
      <div className="ingresso__corpo">
        <div className="ingresso__selo" ref={selo} aria-hidden="true">✓</div>
        <p className="ingresso__ok">Doação confirmada</p>
        <p className="ingresso__valor">{reais(comprovante.valor)}</p>
        <p>
          para <strong>{apelido}</strong>: {necessidade.descricao}
        </p>
        <dl className="ingresso__dados">
          <div><dt>Pagamento</dt><dd>{FORMAS_PAGAMENTO[comprovante.formaPagamento]}</dd></div>
          <div><dt>Data</dt><dd>{dataHora(comprovante.data)}</dd></div>
          <div><dt>Doador</dt><dd>{comprovante.anonima ? 'Anônima' : comprovante.doadorId}</dd></div>
          <div><dt>Transação</dt><dd className="quebra">{comprovante.transacaoId}</dd></div>
        </dl>
      </div>
      <div className="ingresso__canhoto">
        <span>Código do comprovante</span>
        <strong>{comprovante.codigo}</strong>
        <button type="button" className="botao botao--claro" onClick={copiar}>Copiar código</button>
        <span className="ingresso__copiado" aria-live="polite">{copiado}</span>
      </div>
      <div className="ingresso__acoes">
        <a className="botao botao--principal" href="#/">Voltar para a busca</a>
        <button type="button" className="botao botao--leve" onClick={aoFechar}>Ver o pedido</button>
      </div>
    </div>
  );
}
