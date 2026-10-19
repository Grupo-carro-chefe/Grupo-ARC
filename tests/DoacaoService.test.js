'use strict';

const { DoacaoService, PagamentoRecusadoError } = require('../src/services/DoacaoService');
const { RepositorioEmMemoria } = require('../src/infra/RepositorioEmMemoria');
const { GatewayPagamentoSimulado } = require('../src/infra/GatewayPagamentoSimulado');
const { NotificadorEmMemoria } = require('../src/infra/NotificadorEmMemoria');
const { StatusNecessidade } = require('../src/domain/Necessidade');
const { novaNecessidade } = require('./helpers');

function montar({ aprovar = true } = {}) {
  const gatewaySimulado = new GatewayPagamentoSimulado({ aprovar });
  const gateway = {
    processar: jest.fn((pedido) => gatewaySimulado.processar(pedido)),
    estornar: jest.fn((transacaoId) => gatewaySimulado.estornar(transacaoId)),
  };
  const notificador = new NotificadorEmMemoria();
  const doacoes = new RepositorioEmMemoria();
  const service = new DoacaoService({ gateway, notificador, doacoes });
  const necessidade = novaNecessidade();
  const pedido = (sobrescrever = {}) => ({
    necessidade,
    escolinhaId: 'esc-1',
    doadorId: 'doador-1',
    valor: 60,
    formaPagamento: 'PIX',
    ...sobrescrever,
  });
  return { service, gateway, notificador, doacoes, necessidade, pedido };
}

describe('DoacaoService (UC-08)', () => {
  // ---------------------------------------------------------------------
  // Fluxo principal
  // ---------------------------------------------------------------------
  describe('fluxo principal', () => {
    test('caso 1: cobra, registra, atualiza a necessidade e devolve o comprovante (UC-09)', async () => {
      const { service, gateway, doacoes, necessidade, pedido } = montar();

      const comprovante = await service.realizar(pedido());

      expect(gateway.processar).toHaveBeenCalledWith({ valor: 60, formaPagamento: 'PIX' });
      expect(comprovante).toEqual({
        codigo: expect.stringMatching(/^DOA-[0-9A-F]{8}$/),
        doacaoId: expect.any(String),
        necessidadeId: necessidade.id,
        doadorId: 'doador-1',
        valor: 60,
        formaPagamento: 'PIX',
        anonima: false,
        transacaoId: expect.stringMatching(/^SIM-/),
        data: expect.any(String),
      });
      expect(necessidade.valorArrecadado).toBe(60);
      expect(doacoes.listar()).toHaveLength(1);
      expect(doacoes.buscarPorId(comprovante.doacaoId).transacaoId).toBe(comprovante.transacaoId);
    });

    test('caso 2: notifica a escolinha identificando o doador', async () => {
      const { service, notificador, necessidade, pedido } = montar();

      await service.realizar(pedido());

      expect(notificador.enviadas).toEqual([{ escolinhaId: 'esc-1', necessidadeId: necessidade.id, valor: 60, doador: 'doador-1' }]);
    });

    test('caso 3 (A2): doação anônima não revela o doador à escolinha', async () => {
      const { service, notificador, pedido } = montar();

      const comprovante = await service.realizar(pedido({ anonima: true }));

      expect(notificador.enviadas[0].doador).toBe('Doador anônimo');
      expect(comprovante.anonima).toBe(true);
      expect(comprovante.doadorId).toBe('doador-1');
    });

    test('caso 4: doar exatamente o restante deixa a necessidade ATENDIDA', async () => {
      const { service, necessidade, pedido } = montar();

      await service.realizar(pedido({ valor: 100 }));
      await service.realizar(pedido({ valor: 50 }));

      expect(necessidade.status).toBe(StatusNecessidade.ATENDIDA);
      expect(necessidade.percentualArrecadado()).toBe(100);
    });

    test('caso 5: falha na notificação não desfaz a doação já cobrada', async () => {
      const { service, doacoes, necessidade, pedido } = montar();
      service.notificador = { notificarDoacaoRecebida: jest.fn().mockRejectedValue(new Error('SMTP fora do ar')) };
      const log = jest.spyOn(console, 'error').mockImplementation(() => {});

      const comprovante = await service.realizar(pedido());

      expect(comprovante.valor).toBe(60);
      expect(doacoes.listar()).toHaveLength(1);
      expect(necessidade.valorArrecadado).toBe(60);
      expect(log).toHaveBeenCalled();
      log.mockRestore();
    });

    test('caso 6: doações simultâneas para a mesma necessidade não cobram além da meta', async () => {
      const { service, gateway, doacoes, necessidade, pedido } = montar();

      const resultados = await Promise.allSettled([
        service.realizar(pedido({ valor: 100 })),
        service.realizar(pedido({ valor: 100 })),
      ]);

      expect(resultados.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
      expect(resultados[1].reason.message).toBe('Valor da doação excede o restante da meta (R$ 50.00).');
      expect(gateway.processar).toHaveBeenCalledTimes(1);
      expect(doacoes.listar()).toHaveLength(1);
      expect(necessidade.valorArrecadado).toBe(100);
    });

    test('caso 7: uma doação que falha não trava as próximas da mesma necessidade', async () => {
      const { service, pedido } = montar();

      await expect(service.realizar(pedido({ valor: -1 }))).rejects.toThrow(/maior que zero/);
      await expect(service.realizar(pedido())).resolves.toHaveProperty('valor', 60);
    });

    test('caso 8: se o registro falhar depois da cobrança, o pagamento é estornado', async () => {
      const { service, gateway, pedido } = montar();
      service.doacoes = { salvar: () => { throw new Error('Banco fora do ar'); } };

      await expect(service.realizar(pedido())).rejects.toThrow('Banco fora do ar');

      const { transacaoId } = await gateway.processar.mock.results[0].value;
      expect(gateway.estornar).toHaveBeenCalledWith(transacaoId);
    });

    test('caso 9: falha no estorno vai para o log e o erro original é devolvido', async () => {
      const { service, gateway, pedido } = montar();
      service.doacoes = { salvar: () => { throw new Error('Banco fora do ar'); } };
      gateway.estornar.mockRejectedValue(new Error('Gateway fora do ar'));
      const log = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.realizar(pedido())).rejects.toThrow('Banco fora do ar');

      expect(log).toHaveBeenCalledWith('Falha ao estornar a cobrança', expect.stringMatching(/^SIM-/), expect.any(Error));
      log.mockRestore();
    });

    test('caso 10: cobra o mesmo valor arredondado que registra (0.1 + 0.2 vira 0.3)', async () => {
      const { service, gateway, necessidade, pedido } = montar();

      const comprovante = await service.realizar(pedido({ valor: 0.1 + 0.2 }));

      expect(gateway.processar).toHaveBeenCalledWith({ valor: 0.3, formaPagamento: 'PIX' });
      expect(comprovante.valor).toBe(0.3);
      expect(necessidade.valorArrecadado).toBe(0.3);
    });
  });

  // ---------------------------------------------------------------------
  // Fluxo alternativo A1: pagamento recusado
  // ---------------------------------------------------------------------
  describe('pagamento recusado (A1)', () => {
    test('caso 1: lança PagamentoRecusadoError', async () => {
      const { service, pedido } = montar({ aprovar: false });

      const erro = await service.realizar(pedido()).catch((e) => e);

      expect(erro).toBeInstanceOf(PagamentoRecusadoError);
      expect(erro).toBeInstanceOf(Error);
      expect(erro.name).toBe('PagamentoRecusadoError');
      expect(erro.message).toBe('Pagamento recusado pelo gateway. Nenhuma doação foi registrada.');
    });

    test('caso 2: nada é gravado, notificado nem somado à necessidade', async () => {
      const { service, gateway, notificador, doacoes, necessidade, pedido } = montar({ aprovar: false });

      await expect(service.realizar(pedido())).rejects.toThrow(PagamentoRecusadoError);

      expect(gateway.processar).toHaveBeenCalledTimes(1);
      expect(doacoes.listar()).toEqual([]);
      expect(notificador.enviadas).toEqual([]);
      expect(necessidade.valorArrecadado).toBe(0);
      expect(necessidade.status).toBe(StatusNecessidade.ABERTA);
    });
  });

  // ---------------------------------------------------------------------
  // Validações antes da cobrança: o gateway não é chamado
  // ---------------------------------------------------------------------
  describe('validação antes de cobrar', () => {
    test.each([
      ['valor zero', { valor: 0 }, /maior que zero/],
      ['valor em texto', { valor: '60' }, /maior que zero/],
      ['valor com 3 casas', { valor: 10.555 }, /duas casas decimais/],
      ['valor abaixo de 1 centavo', { valor: 5e-9 }, /pelo menos R\$ 0,01/],
      ['forma de pagamento inválida', { formaPagamento: 'CHEQUE' }, /Forma de pagamento inválida/],
      ['doador ausente', { doadorId: undefined }, /Doador é obrigatório/],
      ['anônima em texto', { anonima: 'true' }, /verdadeiro ou falso/],
      ['valor acima do restante', { valor: 150.01 }, 'Valor da doação excede o restante da meta (R$ 150.00).'],
    ])('caso inválido: %s não chega ao gateway', async (_nome, dados, erro) => {
      const { service, gateway, doacoes, notificador, pedido } = montar();

      await expect(service.realizar(pedido(dados))).rejects.toThrow(erro);

      expect(gateway.processar).not.toHaveBeenCalled();
      expect(doacoes.listar()).toEqual([]);
      expect(notificador.enviadas).toEqual([]);
    });

    test('caso inválido: necessidade encerrada não recebe doação', async () => {
      const { service, gateway, necessidade, pedido } = montar();
      necessidade.encerrar();

      await expect(service.realizar(pedido())).rejects.toThrow('Não é possível doar para uma necessidade com status ENCERRADA.');
      expect(gateway.processar).not.toHaveBeenCalled();
    });

    test('caso inválido: necessidade atendida não recebe doação', async () => {
      const { service, gateway, necessidade, pedido } = montar();
      necessidade.registrarDoacao(150);

      await expect(service.realizar(pedido())).rejects.toThrow('Não é possível doar para uma necessidade com status ATENDIDA.');
      expect(gateway.processar).not.toHaveBeenCalled();
    });

    test('caso inválido: excesso calculado em centavos, sem erro de ponto flutuante', async () => {
      const { service, necessidade, pedido } = montar();
      necessidade.registrarDoacao(149.7);

      await expect(service.realizar(pedido({ valor: 0.1 + 0.2 }))).resolves.toHaveProperty('valor', 0.3);
      expect(necessidade.status).toBe(StatusNecessidade.ATENDIDA);
    });
  });
});
