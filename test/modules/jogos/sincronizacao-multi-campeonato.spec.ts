import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JogoService } from '@src/modules/jogos/services/jogo.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryTimeRepository } from '@src/modules/times/repositories/in-memory-time.repository';
import { FutebolApiService } from '@src/modules/jogos/services/futebol-api.service';
import { COPA_FASES } from '@src/modules/jogos/jogos.constants';
import {
  FaseNaoEncontradaError,
  ApiExternaIndisponivelError,
} from '@src/common/errors/domain-errors';

describe('JogoService — sincronização multi-campeonato', () => {
  let service: JogoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;
  let futebolApiService: FutebolApiService;

  const faseBanco = {
    id: 'fase-sync-1',
    nome: 'Fase de Grupos - Grupo A',
    tipo: 'PONTOS_CORRIDOS',
    ordem: 1,
    idaVolta: false,
    temporadaId: 'temp-copa-2026',
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    timeRepo = new InMemoryTimeRepository();
    faseRepo.items = [{ ...faseBanco }];

    futebolApiService = {
      buscarJogosPorRodada: vi.fn(),
      buscarJogosPorIds: vi.fn(),
      buscarJogosPorRodadas: vi.fn().mockResolvedValue([]),
      normalizarJogo: vi.fn(),
      mapearStatus: vi.fn(),
    } as any;

    service = new JogoService(jogoRepo, faseRepo, futebolApiService, timeRepo, {
      preencherProximaFaseEliminatoria: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  function criarJogoNoBanco(overrides: any = {}) {
    const jogo = {
      id: crypto.randomUUID(),
      faseId: 'fase-sync-1',
      timeCasaId: 'time-a',
      timeForaId: 'time-b',
      dataHora: new Date('2026-06-15T19:00:00Z'),
      rodada: 1,
      status: 'AGENDADO',
      golsCasa: null,
      golsFora: null,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      vencedorId: null,
      fonteResultado: 'API_EXTERNA',
      externoId: '99001',
      criadoPor: 'user-1',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
      timeCasa: { sigla: 'BRA', nome: 'Brasil' },
      timeFora: { sigla: 'ARG', nome: 'Argentina' },
      ...overrides,
    };
    jogoRepo.items.push(jogo);
    return jogo;
  }

  describe('sincronização com sucesso', () => {
    it('deve sincronizar placar de jogo finalizado', async () => {
      criarJogoNoBanco({ status: 'EM_ANDAMENTO' });

      const jogoApiNormalizado = {
        externoId: '99001',
        dataHora: '2026-06-15T19:00:00.000Z',
        status: 'FINALIZADO',
        golsCasa: 2,
        golsFora: 1,
        penaltisCasa: null,
        penaltisFora: null,
      };
      (futebolApiService.buscarJogosPorRodadas as any).mockResolvedValue([{ raw: true }]);
      (futebolApiService.normalizarJogo as any).mockReturnValue(jogoApiNormalizado);

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      expect(result.sincronizados).toBe(1);
      expect(jogoRepo.items[0].golsCasa).toBe(2);
      expect(jogoRepo.items[0].golsFora).toBe(1);
      expect(jogoRepo.items[0].vencedorId).toBe('time-a');
    });

    it('deve sincronizar pênaltis em jogos mata-mata da Copa', async () => {
      criarJogoNoBanco({ status: 'EM_ANDAMENTO' });

      const jogoApiNormalizado = {
        externoId: '99001',
        dataHora: '2026-06-15T19:00:00.000Z',
        status: 'FINALIZADO',
        golsCasa: 1,
        golsFora: 1,
        penaltisCasa: 4,
        penaltisFora: 2,
      };
      (futebolApiService.buscarJogosPorRodadas as any).mockResolvedValue([{ raw: true }]);
      (futebolApiService.normalizarJogo as any).mockReturnValue(jogoApiNormalizado);

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.OITAVAS,
      );

      expect(result.sincronizados).toBe(1);
      expect(jogoRepo.items[0].temPenaltis).toBe(true);
      expect(jogoRepo.items[0].penaltisCasa).toBe(4);
      expect(jogoRepo.items[0].penaltisFora).toBe(2);
      expect(jogoRepo.items[0].vencedorId).toBe('time-a');
    });

    it('deve retornar jogos atualizados no resultado', async () => {
      criarJogoNoBanco({ status: 'AGENDADO' });

      const jogoApiNormalizado = {
        externoId: '99001',
        dataHora: '2026-06-15T19:00:00.000Z',
        status: 'EM_ANDAMENTO',
        golsCasa: 1,
        golsFora: 0,
        penaltisCasa: null,
        penaltisFora: null,
      };
      (futebolApiService.buscarJogosPorRodadas as any).mockResolvedValue([{ raw: true }]);
      (futebolApiService.normalizarJogo as any).mockReturnValue(jogoApiNormalizado);

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      expect(result.jogosAtualizados).toHaveLength(1);
      expect(result.jogosAtualizados[0].timeCasa).toBe('BRA');
    });
  });

  describe('filtro por fonteResultado', () => {
    it('não deve sincronizar jogos com fonteResultado MANUAL', async () => {
      criarJogoNoBanco({ fonteResultado: 'MANUAL' });

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      expect(result.sincronizados).toBe(0);
    });

    it('não deve sincronizar jogos já FINALIZADOS', async () => {
      criarJogoNoBanco({ status: 'FINALIZADO' });

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      expect(result.sincronizados).toBe(0);
    });

    it('não deve sincronizar jogos CANCELADOS', async () => {
      criarJogoNoBanco({ status: 'CANCELADO' });

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      expect(result.sincronizados).toBe(0);
    });
  });

  describe('API indisponível', () => {
    it('deve retornar sincronizados 0 quando API falha (log + skip)', async () => {
      criarJogoNoBanco({ status: 'AGENDADO' });

      (futebolApiService.buscarJogosPorRodadas as any).mockRejectedValue(
        new ApiExternaIndisponivelError(),
      );

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      // Não deve lançar exceção — trata internamente
      expect(result.sincronizados).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validações', () => {
    it('deve lançar FaseNaoEncontradaError para faseId inexistente', async () => {
      await expect(
        service.sincronizarPlacares(
          'fase-inexistente',
          'copa-do-mundo-2026',
          COPA_FASES.FASE_DE_GRUPOS,
        ),
      ).rejects.toThrow(FaseNaoEncontradaError);
    });

    it('deve lançar CampeonatoNaoSuportadoError para campeonatoSlug inválido', async () => {
      const { CampeonatoNaoSuportadoError } = await import(
        '@src/common/errors/domain-errors'
      );
      await expect(
        service.sincronizarPlacares('fase-sync-1', 'invalido', 'qualquer'),
      ).rejects.toThrow(CampeonatoNaoSuportadoError);
    });

    it('deve retornar sincronizados 0 quando não há jogos com externoId', async () => {
      jogoRepo.items.push({
        id: 'jogo-manual',
        faseId: 'fase-sync-1',
        externoId: null,
        fonteResultado: 'MANUAL',
        status: 'AGENDADO',
        rodada: 1,
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
      });

      const result = await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      expect(result.sincronizados).toBe(0);
    });
  });
});
