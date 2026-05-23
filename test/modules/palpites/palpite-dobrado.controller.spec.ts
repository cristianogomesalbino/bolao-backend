import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PalpiteDobradoController } from '@src/modules/palpites/controllers/palpite-dobrado.controller';
import { PalpiteDobradoPresenter, TokenDobroPresenter } from '@src/common/presenters';

describe('PalpiteDobradoController', () => {
  let controller: PalpiteDobradoController;
  let mockPalpiteDobradoService: any;
  let mockTokenDobroService: any;

  const userId = 'user-1';
  const user = { id: userId };
  const grupoId = 'grupo-1';
  const jogoId = 'jogo-1';

  const dobroMock = {
    id: 'dobro-1',
    usuarioId: userId,
    jogoId,
    grupoId,
    dataCriacao: new Date(),
  };

  const tokenMock = {
    id: 'token-1',
    usuarioId: userId,
    grupoId,
    motivo: 'ACERTO_EM_CHEIO',
    referenciaId: jogoId,
    tipo: 'CONCESSAO',
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    mockPalpiteDobradoService = {
      ativarDobro: vi.fn().mockResolvedValue(dobroMock),
      desativarDobro: vi.fn().mockResolvedValue(undefined),
      atualizarConfiguracaoDobro: vi.fn().mockResolvedValue(undefined),
      listarMeusDobros: vi.fn().mockResolvedValue([dobroMock]),
    };

    mockTokenDobroService = {
      calcularSaldo: vi.fn().mockResolvedValue(3),
      listarHistorico: vi.fn().mockResolvedValue([tokenMock]),
    };

    controller = new PalpiteDobradoController(mockPalpiteDobradoService, mockTokenDobroService);
  });

  it('ativarDobro deve chamar service e retornar via presenter', async () => {
    const result = await controller.ativarDobro(grupoId, jogoId, user);

    expect(mockPalpiteDobradoService.ativarDobro).toHaveBeenCalledWith(grupoId, jogoId, userId);
    expect(result).toEqual(PalpiteDobradoPresenter.toHttp(dobroMock));
  });

  it('desativarDobro deve chamar service e retornar mensagem', async () => {
    const result = await controller.desativarDobro(grupoId, jogoId, user);

    expect(mockPalpiteDobradoService.desativarDobro).toHaveBeenCalledWith(grupoId, jogoId, userId);
    expect(result.mensagem).toBeDefined();
  });

  it('consultarSaldo deve retornar saldo', async () => {
    const result = await controller.consultarSaldo(grupoId, user);

    expect(mockTokenDobroService.calcularSaldo).toHaveBeenCalledWith(userId, grupoId);
    expect(result.saldo).toBe(3);
  });

  it('consultarHistorico deve retornar array via presenter', async () => {
    const result = await controller.consultarHistorico(grupoId, user);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(TokenDobroPresenter.toHttp(tokenMock));
  });

  it('configurarDobro deve chamar service e retornar mensagem', async () => {
    const result = await controller.configurarDobro(grupoId, { permitirPalpiteDobrado: true });

    expect(mockPalpiteDobradoService.atualizarConfiguracaoDobro).toHaveBeenCalledWith(grupoId, true);
    expect(result.mensagem).toBeDefined();
  });

  it('listarMeusDobros deve retornar array via presenter', async () => {
    const result = await controller.listarMeusDobros(grupoId, user);

    expect(mockPalpiteDobradoService.listarMeusDobros).toHaveBeenCalledWith(grupoId, userId);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(PalpiteDobradoPresenter.toHttp(dobroMock));
  });
});
