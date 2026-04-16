import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RankingController } from '@src/modules/ranking/ranking.controller';
import { RankingPresenter } from '@src/common/presenters/ranking.presenter';
import { PontuacaoJogoPresenter } from '@src/common/presenters/pontuacao-jogo.presenter';
import { RANKING } from '@src/modules/ranking/ranking.constants';

describe('RankingController', () => {
  let controller: RankingController;
  let mockService: any;

  const grupoId = 'grupo-1';
  const faseId = 'fase-1';
  const jogoId = 'jogo-1';

  const rankingMock = [
    {
      posicao: 1,
      usuarioId: 'user-1',
      nomeUsuario: 'Alice',
      pontuacaoTotal: 15,
      acertosEmCheio: 1,
      acertosDeResultado: 1,
      acertosDeGolsUmTime: 0,
      errosTotais: 0,
    },
    {
      posicao: 2,
      usuarioId: 'user-2',
      nomeUsuario: 'Bob',
      pontuacaoTotal: 5,
      acertosEmCheio: 0,
      acertosDeResultado: 1,
      acertosDeGolsUmTime: 0,
      errosTotais: 0,
    },
  ];

  const detalhamentoMock = [
    {
      usuarioId: 'user-1',
      nomeUsuario: 'Alice',
      golsCasaPalpite: 2,
      golsForaPalpite: 1,
      categoriaAcerto: 'ACERTO_EM_CHEIO',
      pontosBase: 10,
      multiplicador: 1,
      pontosFinais: 10,
      dobrado: false,
    },
  ];

  beforeEach(() => {
    mockService = {
      obterRankingGeral: vi.fn().mockResolvedValue(rankingMock),
      obterRankingFase: vi.fn().mockResolvedValue(rankingMock),
      obterDetalhamentoJogo: vi.fn().mockResolvedValue(detalhamentoMock),
      processarPontuacaoJogo: vi.fn().mockResolvedValue(undefined),
    };

    controller = new RankingController(mockService as any);
  });

  describe('obterRankingGeral', () => {
    it('deve delegar para rankingService.obterRankingGeral', async () => {
      await controller.obterRankingGeral(grupoId);

      expect(mockService.obterRankingGeral).toHaveBeenCalledWith(grupoId);
    });

    it('deve aplicar RankingPresenter na resposta', async () => {
      const result = await controller.obterRankingGeral(grupoId);

      expect(result).toEqual(rankingMock.map((e) => RankingPresenter.toHttp(e)));
    });
  });

  describe('obterRankingFase', () => {
    it('deve delegar para rankingService.obterRankingFase', async () => {
      await controller.obterRankingFase(grupoId, faseId);

      expect(mockService.obterRankingFase).toHaveBeenCalledWith(grupoId, faseId);
    });

    it('deve aplicar RankingPresenter na resposta', async () => {
      const result = await controller.obterRankingFase(grupoId, faseId);

      expect(result).toEqual(rankingMock.map((e) => RankingPresenter.toHttp(e)));
    });
  });

  describe('obterDetalhamentoJogo', () => {
    it('deve delegar para rankingService.obterDetalhamentoJogo', async () => {
      await controller.obterDetalhamentoJogo(grupoId, jogoId);

      expect(mockService.obterDetalhamentoJogo).toHaveBeenCalledWith(grupoId, jogoId);
    });

    it('deve aplicar PontuacaoJogoPresenter na resposta', async () => {
      const result = await controller.obterDetalhamentoJogo(grupoId, jogoId);

      expect(result).toEqual(detalhamentoMock.map((e) => PontuacaoJogoPresenter.toHttp(e)));
    });
  });

  describe('processarPontuacaoJogo', () => {
    it('deve delegar para rankingService.processarPontuacaoJogo', async () => {
      await controller.processarPontuacaoJogo(grupoId, jogoId);

      expect(mockService.processarPontuacaoJogo).toHaveBeenCalledWith(jogoId);
    });

    it('deve retornar mensagem de sucesso', async () => {
      const result = await controller.processarPontuacaoJogo(grupoId, jogoId);

      expect(result).toEqual({ mensagem: RANKING.MENSAGENS.PONTUACAO_PROCESSADA });
    });
  });
});
