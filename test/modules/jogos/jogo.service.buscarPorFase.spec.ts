import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JogoService } from '@src/modules/jogos/services/jogo.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryTimeRepository } from '@src/modules/times/repositories/in-memory-time.repository';
import { FaseNaoEncontradaError } from '@src/common/errors/domain-errors';

describe('JogoService — buscarPorFaseComDetalhes com filtro de rodada', () => {
  let service: JogoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;

  const fase = {
    id: 'fase-1',
    nome: 'Brasileirão 2026',
    tipo: 'PONTOS_CORRIDOS',
    ordem: 1,
    idaVolta: false,
    temporadaId: 'temp-1',
    dataCriacao: new Date(),
  };

  const jogoRodada1 = {
    id: 'jogo-1',
    faseId: 'fase-1',
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-04-01T16:00:00.000Z'),
    status: 'AGENDADO',
    rodada: 1,
  };

  const jogoRodada1b = {
    id: 'jogo-2',
    faseId: 'fase-1',
    timeCasaId: 'time-c',
    timeForaId: 'time-d',
    dataHora: new Date('2026-04-01T18:00:00.000Z'),
    status: 'AGENDADO',
    rodada: 1,
  };

  const jogoRodada2 = {
    id: 'jogo-3',
    faseId: 'fase-1',
    timeCasaId: 'time-e',
    timeForaId: 'time-f',
    dataHora: new Date('2026-04-08T16:00:00.000Z'),
    status: 'AGENDADO',
    rodada: 2,
  };

  beforeEach(() => {
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    timeRepo = new InMemoryTimeRepository();
    faseRepo.items = [{ ...fase }];
    jogoRepo.items = [{ ...jogoRodada1 }, { ...jogoRodada1b }, { ...jogoRodada2 }];

    const futebolApiService = {
      buscarJogosPorRodada: vi.fn(),
      buscarJogosPorIds: vi.fn(),
      normalizarJogo: vi.fn(),
      mapearStatus: vi.fn(),
    } as any;

    service = new JogoService(jogoRepo, faseRepo, futebolApiService, timeRepo, { preencherProximaFaseEliminatoria: vi.fn() } as any);
  });

  describe('buscarPorFase', () => {
    it('deve retornar todos os jogos da fase sem filtro de rodada', async () => {
      const result = await service.buscarPorFase('fase-1');

      expect(result).toHaveLength(3);
    });

    it('deve retornar apenas jogos da rodada 1', async () => {
      const result = await service.buscarPorFase('fase-1', 1);

      expect(result).toHaveLength(2);
      expect(result.every((j) => j.rodada === 1)).toBe(true);
    });

    it('deve retornar apenas jogos da rodada 2', async () => {
      const result = await service.buscarPorFase('fase-1', 2);

      expect(result).toHaveLength(1);
      expect(result[0].rodada).toBe(2);
    });

    it('deve retornar vazio para rodada inexistente', async () => {
      const result = await service.buscarPorFase('fase-1', 99);

      expect(result).toHaveLength(0);
    });
  });

  describe('buscarPorFaseComDetalhes', () => {
    it('deve retornar fase + jogos filtrados por rodada', async () => {
      const result = await service.buscarPorFaseComDetalhes('fase-1', 1);

      expect(result.fase.id).toBe('fase-1');
      expect(result.fase.tipo).toBe('PONTOS_CORRIDOS');
      expect(result.jogos).toHaveLength(2);
    });

    it('deve retornar fase + todos os jogos sem filtro', async () => {
      const result = await service.buscarPorFaseComDetalhes('fase-1');

      // Sem filtro de rodada, retorna a rodada atual (rodada 1 = menor com jogos não finalizados)
      expect(result.jogos).toHaveLength(2);
      expect(result.rodadaAtual).toBe(1);
    });

    it('deve lançar FaseNaoEncontradaError se fase inexistente', async () => {
      await expect(
        service.buscarPorFaseComDetalhes('inexistente'),
      ).rejects.toThrow(FaseNaoEncontradaError);
    });
  });
});
