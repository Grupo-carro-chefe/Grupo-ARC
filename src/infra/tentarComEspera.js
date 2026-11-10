'use strict';

const ESPERAS_PADRAO = [1000, 2000, 4000];

const dormirDeVerdade = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executa `operacao` e, se falhar, tenta de novo depois de esperar (1 s, 2 s, 4 s: 3 repetições,
 * 4 tentativas no total). Serve para a conexão inicial com o Neon, que pode levar alguns
 * segundos para acordar. Desiste com o último erro.
 *
 * @param {() => Promise<*>} operacao
 * @param {object} [opcoes]
 * @param {number[]} [opcoes.esperas]  espera (ms) antes de cada repetição
 * @param {(ms: number) => Promise<void>} [opcoes.dormir]  trocável nos testes
 * @param {(info: {tentativa: number, de: number, motivo: string}) => void} [opcoes.aoFalhar]
 *   chamado a cada falha com a tentativa e só o código/classe do erro (a mensagem pode ter host)
 */
async function tentarComEspera(operacao, { esperas = ESPERAS_PADRAO, dormir = dormirDeVerdade, aoFalhar } = {}) {
  for (let i = 0; ; i += 1) {
    try {
      return await operacao();
    } catch (erro) {
      if (i >= esperas.length) {
        throw erro;
      }
      aoFalhar?.({ tentativa: i + 1, de: esperas.length + 1, motivo: erro.code ?? erro.name });
      await dormir(esperas[i]);
    }
  }
}

module.exports = { tentarComEspera };
