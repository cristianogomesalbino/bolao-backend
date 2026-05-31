import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JogoController } from '@src/modules/jogos/controllers/jogo.controller';
import { JogoPresenter } from '@src/common/presenters';

describe('JogoController', () => {
  let controller: JogoController;
  const mockJogoService = {
    criar: vi.fn(),
    atualizar: vi.fn(),
    finalizar: vi.fn(),
    buscarPorFase: vi.fn(),
    buscarPorFaseComDetalhes: vi.fn(),
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
    it('deve chamar jogoService.buscarPorFaseComDetalhes e retornar fase + jogos', async () => {
      const faseData = { id: 'fase-1', nome: 'Rodada 1', tipo: 'PONTOS_CORRIDOS', ordem: 1 };
      mockJogoService.buscarPorFaseComDetalhes.mockResolvedValue({
        fase: faseData,
        jogos: [jogoData],
      });

      const result = await controller.listar('fase-1');

      expect(mockJogoService.buscarPorFaseComDetalhes).toHaveBeenCalledWith('fase-1', undefined, undefined);
      expect(result).toEqual({
        fase: { id: 'fase-1', nome: 'Rodada 1', tipo: 'PONTOS_CORRIDOS', ordem: 1 },
        jogos: [JogoPresenter.toHttp(jogoData, 'PONTOS_CORRIDOS')],
      });
    });

    it('deve passar rodada como número quando query param informado', async () => {
      const faseData = { id: 'fase-1', nome: 'Rodada 1', tipo: 'PONTOS_CORRIDOS', ordem: 1 };
      mockJogoService.buscarPorFaseComDetalhes.mockResolvedValue({
        fase: faseData,
        jogos: [jogoData],
      });

      await controller.listar('fase-1', '3');

      expect(mockJogoService.buscarPorFaseComDetalhes).toHaveBeenCalledWith('fase-1', 3, undefined);
    });
  });

  describe('buscarPorId', () => {
    it('deve chamar jogoService.buscarPorId e retornar via JogoPresenter', async () => {
      const jogoComFase = { ...jogoData, fase: { tipo: 'PONTOS_CORRIDOS' } };
      mockJogoService.buscarPorId.mockResolvedValue(jogoComFase);

      const result = await controller.buscarPorId('jogo-1');

      expect(mockJogoService.buscarPorId).toHaveBeenCalledWith('jogo-1');
      expect(result).toEqual(JogoPresenter.toHttp(jogoComFase, 'PONTOS_CORRIDOS'));
    });
  });

  describe('importar', () => {
    it('deve chamar jogoService.importarJogos e retornar resultado', async () => {
      mockJogoService.importarJogos.mockResolvedValue({ importados: 5 });

      const dto = { season: 2026, rodada: 1, faseId: 'fase-1' };
      const user = { id: 'user-1' };
      const result = await controller.importar(dto as any, user);

      expect(mockJogoService.importarJogos).toHaveBeenCalledWith(2026, 1, 'fase-1', 'user-1');
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
      const jogoResetado = { ...jogoData, fonteResultado: 'API_EXTERNA', externoId: '12345' };
      mockJogoService.resetarFonte.mockResolvedValue(jogoResetado);

      const result = await controller.resetarFonte('jogo-1');

      expect(mockJogoService.resetarFonte).toHaveBeenCalledWith('jogo-1');
      expect(result).toEqual(JogoPresenter.toHttp(jogoResetado));
    });
  });
});
