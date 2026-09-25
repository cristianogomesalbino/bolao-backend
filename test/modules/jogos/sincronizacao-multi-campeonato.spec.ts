import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JogoService } from '@src/modules/jogos/services/jogo.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryTimeRepository } from '@src/modules/times/repositories/in-memory-time.repository';
import { FutebolApiService } from '@src/modules/jogos/services/futebol-api.service';
import { ChaveamentoService } from '@src/modules/jogos/services/chaveamento.service';
import { COPA_FASES } from '@src/modules/jogos/jogos.constants';
import {
  FaseNaoEncontradaError,
  ApiExternaIndisponivelError,
  CampeonatoNaoSuportadoError,
} from '@src/common/errors/domain-errors';

describe('JogoService — sincronização multi-campeonato', () => {
  let service: JogoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;
  let futebolApiService: FutebolApiService;
  let buscarJogosPorRodadas: ReturnType<typeof vi.fn>;
  let buscarRodadaOficialGe: ReturnType<typeof vi.fn>;
  let normalizarJogo: ReturnType<typeof vi.fn>;
  let buscarJogosPorIds: ReturnType<typeof vi.fn>;

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

    buscarJogosPorRodadas = vi.fn().mockResolvedValue([]);
    buscarRodadaOficialGe = vi.fn().mockResolvedValue(null);
    normalizarJogo = vi.fn();
    buscarJogosPorIds = vi.fn();

    futebolApiService = {
      buscarJogosPorRodada: vi.fn(),
      buscarJogosPorIds,
      buscarJogosPorRodadas,
      buscarRodadaOficialGe,
      normalizarJogo,
      mapearStatus: vi.fn(),
    } as unknown as FutebolApiService;

    service = new JogoService(jogoRepo, faseRepo, futebolApiService, timeRepo, {
      preencherProximaFaseEliminatoria: vi.fn().mockResolvedValue(undefined),
      propagarVencedoresParaProximaFase: vi.fn().mockResolvedValue(undefined),
    } as unknown as ChaveamentoService);
  });

  function criarJogoNoBanco(overrides: Record<string, unknown> = {}) {
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
    jogoRepo.items.push(jogo as never);
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
      buscarJogosPorRodadas.mockResolvedValue([{ raw: true }]);
      normalizarJogo.mockReturnValue(jogoApiNormalizado);

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
      buscarJogosPorRodadas.mockResolvedValue([{ raw: true }]);
      normalizarJogo.mockReturnValue(jogoApiNormalizado);

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
      buscarJogosPorRodadas.mockResolvedValue([{ raw: true }]);
      normalizarJogo.mockReturnValue(jogoApiNormalizado);

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

      buscarJogosPorRodadas.mockRejectedValue(
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

  describe('auto-alinhamento com rodada oficial da GE', () => {
    it('deve ancorar sync na rodada da GE quando o banco está atrás', async () => {
      faseRepo.items = [
        {
          id: 'fase-br',
          nome: 'Fase Única',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-br',
          dataCriacao: new Date(),
        },
      ];

      // Remarcação antiga (R21) + jogo de hoje (R28)
      criarJogoNoBanco({
        faseId: 'fase-br',
        rodada: 21,
        externoId: '100',
        dataHora: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        timeCasa: { sigla: 'CAM', nome: 'Atlético' },
        timeFora: { sigla: 'RBB', nome: 'Bragantino' },
      });
      criarJogoNoBanco({
        faseId: 'fase-br',
        rodada: 28,
        externoId: '200',
        dataHora: new Date(),
        status: 'AGENDADO',
        timeCasa: { sigla: 'FLA', nome: 'Flamengo' },
        timeFora: { sigla: 'PAL', nome: 'Palmeiras' },
      });

      buscarRodadaOficialGe.mockResolvedValue(28);
      buscarJogosPorRodadas.mockResolvedValue([{ id: 200 }]);
      normalizarJogo.mockReturnValue({
        externoId: '200',
        dataHora: new Date().toISOString(),
        status: 'EM_ANDAMENTO',
        timeCasaId: '1',
        timeForaId: '2',
        golsCasa: 0,
        golsFora: 0,
        penaltisCasa: null,
        penaltisFora: null,
        timeCasa: {
          externoId: '1',
          nome: 'Flamengo',
          sigla: 'FLA',
          escudo: '',
        },
        timeFora: {
          externoId: '2',
          nome: 'Palmeiras',
          sigla: 'PAL',
          escudo: '',
        },
      });

      await service.sincronizarPlacares(
        'fase-br',
        'brasileirao',
        'fase-unica-campeonato-brasileiro-2026',
      );

      expect(buscarRodadaOficialGe).toHaveBeenCalled();
      const rodadasPedidas = buscarJogosPorRodadas.mock.calls[0][2] as number[];
      expect(rodadasPedidas).toEqual(expect.arrayContaining([27, 28, 29]));
    });
  });

  describe('atrasados na mesma passagem', () => {
    function setupFaseBrasileirao() {
      faseRepo.items = [
        {
          id: 'fase-br',
          nome: 'Fase Única',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-br',
          dataCriacao: new Date(),
        },
      ];
    }

    function normalizadoBase(overrides: Record<string, unknown> = {}) {
      return {
        externoId: '200',
        dataHora: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'AGENDADO',
        timeCasaId: '1',
        timeForaId: '2',
        golsCasa: null,
        golsFora: null,
        penaltisCasa: null,
        penaltisFora: null,
        timeCasa: {
          externoId: '1',
          nome: 'Flamengo',
          sigla: 'FLA',
          escudo: '',
        },
        timeFora: {
          externoId: '2',
          nome: 'Palmeiras',
          sigla: 'PAL',
          escudo: '',
        },
        ...overrides,
      };
    }

    it('consulta a API uma vez quando o jogo atrasado continua AGENDADO', async () => {
      setupFaseBrasileirao();
      const dataHora = new Date(Date.now() - 60 * 60 * 1000);
      criarJogoNoBanco({
        faseId: 'fase-br',
        rodada: 28,
        externoId: '200',
        dataHora,
        status: 'AGENDADO',
        timeCasa: { sigla: 'FLA', nome: 'Flamengo' },
        timeFora: { sigla: 'PAL', nome: 'Palmeiras' },
      });

      buscarRodadaOficialGe.mockResolvedValue(28);
      buscarJogosPorRodadas.mockResolvedValue([{ id: 200 }]);
      normalizarJogo.mockReturnValue(
        normalizadoBase({ dataHora: dataHora.toISOString() }),
      );

      await service.sincronizarPlacares(
        'fase-br',
        'brasileirao',
        'fase-unica-campeonato-brasileiro-2026',
      );

      expect(buscarJogosPorRodadas).toHaveBeenCalledTimes(1);
      expect(jogoRepo.items[0].status).toBe('AGENDADO');
    });

    it('finaliza o atrasado na primeira passagem quando a API encerra o jogo', async () => {
      setupFaseBrasileirao();
      criarJogoNoBanco({
        faseId: 'fase-br',
        rodada: 28,
        externoId: '200',
        dataHora: new Date(Date.now() - 60 * 60 * 1000),
        status: 'AGENDADO',
        timeCasa: { sigla: 'FLA', nome: 'Flamengo' },
        timeFora: { sigla: 'PAL', nome: 'Palmeiras' },
      });

      buscarRodadaOficialGe.mockResolvedValue(28);
      buscarJogosPorRodadas.mockResolvedValue([{ id: 200 }]);
      normalizarJogo.mockReturnValue(
        normalizadoBase({
          status: 'FINALIZADO',
          golsCasa: 1,
          golsFora: 0,
        }),
      );

      const result = await service.sincronizarPlacares(
        'fase-br',
        'brasileirao',
        'fase-unica-campeonato-brasileiro-2026',
      );

      expect(buscarJogosPorRodadas).toHaveBeenCalledTimes(1);
      expect(result.sincronizados).toBe(1);
      expect(jogoRepo.items[0].status).toBe('FINALIZADO');
    });

    it('não sincroniza atrasado de outra fase', async () => {
      setupFaseBrasileirao();
      faseRepo.items.push({
        id: 'fase-copa',
        nome: 'Grupo A',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: 'temp-copa',
        dataCriacao: new Date(),
      });

      criarJogoNoBanco({
        faseId: 'fase-br',
        rodada: 28,
        externoId: '200',
        dataHora: new Date(Date.now() - 60 * 60 * 1000),
        status: 'AGENDADO',
        timeCasa: { sigla: 'FLA', nome: 'Flamengo' },
        timeFora: { sigla: 'PAL', nome: 'Palmeiras' },
      });
      criarJogoNoBanco({
        faseId: 'fase-copa',
        rodada: 1,
        externoId: '999',
        dataHora: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'AGENDADO',
        timeCasa: { sigla: 'BRA', nome: 'Brasil' },
        timeFora: { sigla: 'ARG', nome: 'Argentina' },
      });

      let consultasApi = 0;
      buscarRodadaOficialGe.mockResolvedValue(28);
      buscarJogosPorRodadas.mockImplementation(() => {
        consultasApi += 1;
        return [{ id: 200 }];
      });
      normalizarJogo.mockReturnValue(
        normalizadoBase({
          status: 'FINALIZADO',
          golsCasa: 2,
          golsFora: 1,
        }),
      );

      await service.sincronizarPlacares(
        'fase-br',
        'brasileirao',
        'fase-unica-campeonato-brasileiro-2026',
      );

      expect(consultasApi).toBe(1);
      expect(jogoRepo.items.find((j) => j.externoId === '200')?.status).toBe(
        'FINALIZADO',
      );
      expect(jogoRepo.items.find((j) => j.externoId === '999')?.status).toBe(
        'AGENDADO',
      );
    });
  });

  describe('notificações pós-sync em série (RODADA_ENCERRADA)', () => {
    it('deve processar notificações de jogos finalizados sequencialmente', async () => {
      const ordem: string[] = [];
      const processarJogoFinalizado = vi.fn(async (jogoId: string) => {
        ordem.push(`start:${jogoId}`);
        await new Promise((resolve) => setTimeout(resolve, 15));
        ordem.push(`end:${jogoId}`);
      });

      service = new JogoService(
        jogoRepo,
        faseRepo,
        futebolApiService,
        timeRepo,
        {
          preencherProximaFaseEliminatoria: vi
            .fn()
            .mockResolvedValue(undefined),
          propagarVencedoresParaProximaFase: vi
            .fn()
            .mockResolvedValue(undefined),
        } as unknown as ChaveamentoService,
        {
          processarJogoFinalizado,
          notificarJogoLiberado: vi.fn().mockResolvedValue(undefined),
        } as never,
      );

      const jogo1 = criarJogoNoBanco({
        id: 'jogo-final-1',
        externoId: '100',
        status: 'EM_ANDAMENTO',
      });
      const jogo2 = criarJogoNoBanco({
        id: 'jogo-final-2',
        externoId: '200',
        status: 'EM_ANDAMENTO',
        timeCasaId: 'time-c',
        timeForaId: 'time-d',
      });

      buscarJogosPorRodadas.mockResolvedValue([{ id: 100 }, { id: 200 }]);
      normalizarJogo.mockImplementation(
        (raw: { id: number }): Record<string, unknown> => ({
          externoId: String(raw.id),
          dataHora: '2026-06-15T19:00:00.000Z',
          status: 'FINALIZADO',
          golsCasa: 1,
          golsFora: 0,
          penaltisCasa: null,
          penaltisFora: null,
          timeCasa: {
            externoId: '1',
            nome: 'A',
            sigla: 'AAA',
            escudo: '',
          },
          timeFora: {
            externoId: '2',
            nome: 'B',
            sigla: 'BBB',
            escudo: '',
          },
        }),
      );

      await service.sincronizarPlacares(
        'fase-sync-1',
        'copa-do-mundo-2026',
        COPA_FASES.FASE_DE_GRUPOS,
      );

      expect(processarJogoFinalizado).toHaveBeenCalledTimes(2);
      expect(ordem).toEqual([
        `start:${jogo1.id}`,
        `end:${jogo1.id}`,
        `start:${jogo2.id}`,
        `end:${jogo2.id}`,
      ]);
    });
  });
});
