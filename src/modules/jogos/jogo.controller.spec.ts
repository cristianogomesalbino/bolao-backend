import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JogoController } from './jogo.controller';
import { JogoPresenter } from '../../common/presenters';

describe('JogoController', () => {
  let controller: JogoController;
  const mockJogoService = {
    criar: vi.fn(),
    atualizar: vi.fn(),
    finalizar: vi.fn(),
    buscarPorFase: vi.fn(),
    buscarPorId: vi.fn(),
    importarJogos: vi.fn(),
    sincronizarPlacares: vi.fn(),
    resetarFonte: vi.fn(),
  };

  const jogoData = {
    id: 'jogo-1',
    faseId: 'fase-1',
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-03-15T16:00:00.000Z'),
    status: 'AGENDADO',
    golsCasa: null,
    golsFora: null,
    temProrrogacao: false,
    golsProrrogacaoCasa: null,
    golsProrrogacaoFora: null,
    temPenaltis: false,
    penaltisCasa: null,
    penaltisFora: null,
    vencedorId: null,
    ehJogoVolta: false,
    grupoIdaVolta: null,
    fonteResultado: 'MANUAL',
    externoId: null,
    criadoPor: 'user-1',
    dataCriacao: new Date(),
    atualizadoEm: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new JogoController(mockJogoService as any);
  });

  describe('criar', () => {
    it('deve chamar jogoService.criar com dto + faseId e retornar via JogoPresenter', async () => {
      mockJogoService.criar.mockResolvedValue(jogoData);

      const dto = {
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
        dataHora: '2026-03-15T16:00:00.000Z',
      };
      const user = { id: 'user-1' };
      const result = await controller.criar('fase-1', dto as any, user);

      expect(mockJogoService.criar).toHaveBeenCalledWith(
        { ...dto, faseId: 'fase-1' },
        'user-1',
      );
      expect(result).toEqual(JogoPresenter.toHttp(jogoData));
    });
  });

  describe('atualizar', () => {
    it('deve chamar jogoService.atualizar e retornar via JogoPresenter', async () => {
      mockJogoService.atualizar.mockResolvedValue(jogoData);

      const dto = { dataHora: '2026-04-01T20:00:00.000Z' };
      const result = await controller.atualizar('jogo-1', dto as any);

      expect(mockJogoService.atualizar).toHaveBeenCalledWith('jogo-1', dto);
      expect(result).toEqual(JogoPresenter.toHttp(jogoData));
    });
  });

  describe('finalizar', () => {
    it('deve chamar jogoService.finalizar e retornar via JogoPresenter', async () => {
      const jogoFinalizado = { ...jogoData, status: 'FINALIZADO', golsCasa: 2, golsFora: 1 };
      mockJogoService.finalizar.mockResolvedValue(jogoFinalizado);

      const dto = { golsCasa: 2, golsFora: 1 };
      const result = await controller.finalizar('jogo-1', dto as any);

      expect(mockJogoService.finalizar).toHaveBeenCalledWith('jogo-1', dto);
      expect(result).toEqual(JogoPresenter.toHttp(jogoFinalizado));
    });
  });

  describe('listar', () => {
    it('deve chamar jogoService.buscarPorFase e retornar array via JogoPresenter', async () => {
      mockJogoService.buscarPorFase.mockResolvedValue([jogoData]);

      const result = await controller.listar('fase-1');

      expect(mockJogoService.buscarPorFase).toHaveBeenCalledWith('fase-1');
      expect(result).toEqual([JogoPresenter.toHttp(jogoData)]);
    });
  });

  describe('buscarPorId', () => {
    it('deve chamar jogoService.buscarPorId e retornar via JogoPresenter', async () => {
      mockJogoService.buscarPorId.mockResolvedValue(jogoData);

      const result = await controller.buscarPorId('jogo-1');

      expect(mockJogoService.buscarPorId).toHaveBeenCalledWith('jogo-1');
      expect(result).toEqual(JogoPresenter.toHttp(jogoData));
    });
  });

  describe('importar', () => {
    it('deve chamar jogoService.importarJogos e retornar resultado', async () => {
      mockJogoService.importarJogos.mockResolvedValue({ importados: 5 });

      const dto = { leagueId: 71, season: 2026, faseId: 'fase-1' };
      const user = { id: 'user-1' };
      const result = await controller.importar(dto as any, user);

      expect(mockJogoService.importarJogos).toHaveBeenCalledWith(71, 2026, 'fase-1', 'user-1');
      expect(result).toEqual({ importados: 5 });
    });
  });

  describe('sincronizar', () => {
    it('deve chamar jogoService.sincronizarPlacares e retornar resultado', async () => {
      mockJogoService.sincronizarPlacares.mockResolvedValue({ sincronizados: 3 });

      const result = await controller.sincronizar('fase-1');

      expect(mockJogoService.sincronizarPlacares).toHaveBeenCalledWith('fase-1');
      expect(result).toEqual({ sincronizados: 3 });
    });
  });

  describe('resetarFonte', () => {
    it('deve chamar jogoService.resetarFonte e retornar via JogoPresenter', async () => {
      const jogoResetado = { ...jogoData, fonteResultado: 'API_FOOTBALL', externoId: '12345' };
      mockJogoService.resetarFonte.mockResolvedValue(jogoResetado);

      const result = await controller.resetarFonte('jogo-1');

      expect(mockJogoService.resetarFonte).toHaveBeenCalledWith('jogo-1');
      expect(result).toEqual(JogoPresenter.toHttp(jogoResetado));
    });
  });
});
