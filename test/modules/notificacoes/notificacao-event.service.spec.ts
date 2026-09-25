import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificacaoEventService } from '@src/modules/notificacoes/services/notificacao-event.service';
import type { NotificacaoAcertoService } from '@src/modules/notificacoes/services/notificacao-acerto.service';
import type { NotificacaoRodadaService } from '@src/modules/notificacoes/services/notificacao-rodada.service';
import type { NotificacaoRankingService } from '@src/modules/notificacoes/services/notificacao-ranking.service';
import type { NotificacaoLembreteService } from '@src/modules/notificacoes/services/notificacao-lembrete.service';
import type { NotificacaoVencedorService } from '@src/modules/notificacoes/services/notificacao-vencedor.service';
import type { JogoRepository } from '@src/modules/jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '@src/modules/jogos/repositories/fase.repository.interface';

describe('NotificacaoEventService — processarJogoFinalizado (rodada)', () => {
  let service: NotificacaoEventService;
  let acertoService: { verificarAcertosEmCheio: ReturnType<typeof vi.fn> };
  let rodadaService: { verificarRodadaEncerrada: ReturnType<typeof vi.fn> };
  let rankingService: { verificarMudancasPosicao: ReturnType<typeof vi.fn> };
  let vencedorService: {
    verificarTemporadaEncerrada: ReturnType<typeof vi.fn>;
  };
  let jogoRepo: { buscarPorId: ReturnType<typeof vi.fn> };
  let faseRepo: { buscarPorId: ReturnType<typeof vi.fn> };

  const jogo = {
    id: 'jogo-1',
    faseId: 'fase-1',
    rodada: 10,
    status: 'FINALIZADO',
  };

  const fase = {
    id: 'fase-1',
    nome: 'Fase Única',
    tipo: 'PONTOS_CORRIDOS',
    temporadaId: 'temp-1',
  };

  beforeEach(() => {
    acertoService = {
      verificarAcertosEmCheio: vi.fn().mockResolvedValue(undefined),
    };
    rodadaService = {
      verificarRodadaEncerrada: vi.fn().mockResolvedValue(undefined),
    };
    rankingService = {
      verificarMudancasPosicao: vi.fn().mockResolvedValue(undefined),
    };
    vencedorService = {
      verificarTemporadaEncerrada: vi.fn().mockResolvedValue(undefined),
    };
    jogoRepo = { buscarPorId: vi.fn().mockResolvedValue(jogo) };
    faseRepo = { buscarPorId: vi.fn().mockResolvedValue(fase) };

    service = new NotificacaoEventService(
      acertoService as unknown as NotificacaoAcertoService,
      rodadaService as unknown as NotificacaoRodadaService,
      rankingService as unknown as NotificacaoRankingService,
      {} as unknown as NotificacaoLembreteService,
      vencedorService as unknown as NotificacaoVencedorService,
      jogoRepo as unknown as JogoRepository,
      faseRepo as unknown as FaseRepository,
    );
  });

  it('deve chamar verificação de rodada encerrada após finalizar jogo', async () => {
    await service.processarJogoFinalizado('jogo-1');

    expect(rodadaService.verificarRodadaEncerrada).toHaveBeenCalledWith(
      jogo,
      fase,
    );
  });

  it('deve chamar acerto, rodada, ranking e vencedor em sequência', async () => {
    const ordem: string[] = [];
    acertoService.verificarAcertosEmCheio.mockImplementation(async () => {
      ordem.push('acerto');
    });
    rodadaService.verificarRodadaEncerrada.mockImplementation(async () => {
      ordem.push('rodada');
    });
    rankingService.verificarMudancasPosicao.mockImplementation(async () => {
      ordem.push('ranking');
    });
    vencedorService.verificarTemporadaEncerrada.mockImplementation(async () => {
      ordem.push('vencedor');
    });

    await service.processarJogoFinalizado('jogo-1');

    expect(ordem).toEqual(['acerto', 'rodada', 'ranking', 'vencedor']);
  });

  it('não deve chamar rodada se jogo não existe', async () => {
    jogoRepo.buscarPorId.mockResolvedValue(null);

    await service.processarJogoFinalizado('inexistente');

    expect(rodadaService.verificarRodadaEncerrada).not.toHaveBeenCalled();
  });

  it('não deve chamar rodada se fase não existe', async () => {
    faseRepo.buscarPorId.mockResolvedValue(null);

    await service.processarJogoFinalizado('jogo-1');

    expect(rodadaService.verificarRodadaEncerrada).not.toHaveBeenCalled();
  });
});
