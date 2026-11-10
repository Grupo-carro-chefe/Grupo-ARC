'use strict';

const { tentarComEspera } = require('../src/infra/tentarComEspera');

describe('tentarComEspera', () => {
  test('devolve o resultado na primeira tentativa, sem esperar', async () => {
    const dormir = jest.fn();
    const operacao = jest.fn().mockResolvedValue('ok');

    expect(await tentarComEspera(operacao, { dormir })).toBe('ok');
    expect(operacao).toHaveBeenCalledTimes(1);
    expect(dormir).not.toHaveBeenCalled();
  });

  test('repete com backoff de 1 s, 2 s e 4 s e devolve quando uma tentativa funciona', async () => {
    const dormir = jest.fn().mockResolvedValue();
    const operacao = jest.fn()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockRejectedValueOnce(new Error('c'))
      .mockResolvedValue('conectou');

    expect(await tentarComEspera(operacao, { dormir })).toBe('conectou');
    expect(operacao).toHaveBeenCalledTimes(4);
    expect(dormir.mock.calls.map((c) => c[0])).toEqual([1000, 2000, 4000]);
  });

  test('depois de 3 repetições sem sucesso, desiste com o último erro', async () => {
    const dormir = jest.fn().mockResolvedValue();
    const operacao = jest.fn().mockRejectedValue(new Error('caiu'));

    await expect(tentarComEspera(operacao, { dormir })).rejects.toThrow('caiu');
    expect(operacao).toHaveBeenCalledTimes(4);
    expect(dormir).toHaveBeenCalledTimes(3);
  });

  test('informa cada falha, só com a classe e o código, e usa o relógio de verdade por padrão', async () => {
    const aoFalhar = jest.fn();
    const operacao = jest.fn().mockRejectedValueOnce(Object.assign(new Error('segredo'), { code: 'ECONNRESET' })).mockResolvedValue(1);

    await tentarComEspera(operacao, { esperas: [1], aoFalhar });

    expect(aoFalhar).toHaveBeenCalledWith({ tentativa: 1, de: 2, motivo: 'ECONNRESET' });
  });
});
