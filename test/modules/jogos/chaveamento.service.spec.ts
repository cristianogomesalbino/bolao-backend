import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChaveamentoService } from '@src/modules/jogos/services/chaveamento.service';
import type { CampeonatoConfig } from '@src/modules/jogos/jogos.constants';
import type { NotificacaoEventService } from '@src/modules/notificacoes/services/notificacao-event.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryTimeRepository } from '@src/modules/times/repositories/in-memory-time.repository';
import { FutebolApiService } from '@src/modules/jogos/services/futebol-api.service';

const TBD_ID = '00000000-0000-0000-0000-000000000001';
const TEMPORADA_ID = 'temp-copa-2026';

describe('ChaveamentoService', () => {
  let service: ChaveamentoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;
  let futebolApiService: FutebolApiService;

  const faseGrupoE = {
    id: 'fase-grupo-e',
    nome: 'Grupo E',
    tipo: 'PONTOS_CORRIDOS',
    ordem: 5,
    idaVolta: false,
    temporadaId: TEMPORADA_ID,
    dataCriacao: new Date(),
  };

  const fase16Avos = {
    id: 'fase-16-avos',
    nome: '16 Avos de Final',
    tipo: 'MATA_MATA',
    ordem: 13,
    idaVolta: false,
    temporadaId: TEMPORADA_ID,
    dataCriacao: new Date(),
  };

  const config = {
    slug: 'copa-do-mundo-2026',
    nome: 'Copa do Mundo 2026',
    tema: { corPrimaria: '#16a34a', corSecundaria: '#22c55e' },
    campeonatoId: 'copa-2026-id',
    fases: [{ slug: 'segunda-fase-copa-do-mundo-2026', tipo: 'MATA_MATA' }],
    buildFaseSlug: (slug: string) => slug,
  } as CampeonatoConfig;

  beforeEach(() => {
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    timeRepo = new InMemoryTimeRepository();
    faseRepo.items = [{ ...faseGrupoE }, { ...fase16Avos }];

    futebolApiService = {
      buscarJogosPorRodada: vi.fn().mockResolvedValue([]),
      buscarJogosPorRodadas: vi.fn().mockResolvedValue([]),
      normalizarJogo: vi.fn(),
      buscarJogosPorIds: vi.fn(),
      mapearStatus: vi.fn(),
    } as unknown as FutebolApiService;

    service = new ChaveamentoService(
      jogoRepo,
      faseRepo,
      timeRepo,
      futebolApiService,
    );
  });

  function criarJogoGrupo(
    timeCasaId: string,
    timeForaId: string,
    golsCasa: number,
    golsFora: number,
  ) {
    jogoRepo.items.push({
      id: crypto.randomUUID(),
      faseId: 'fase-grupo-e',
      timeCasaId,
      timeForaId,
      dataHora: new Date('2026-06-14T20:00:00Z'),
      rodada: 1,
      status: 'FINALIZADO',
      golsCasa,
      golsFora,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      vencedorId: null,
      fonteResultado: 'API_EXTERNA',
      externoId: crypto.randomUUID(),
      criadoPor: 'user-1',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });
  }

  function criarJogo16Avos(
    rodada: number,
    timeCasaId: string,
    timeForaId: string,
  ) {
    const jogo = {
      id: crypto.randomUUID(),
      faseId: 'fase-16-avos',
      timeCasaId,
      timeForaId,
      dataHora: new Date('2026-06-29T17:00:00Z'),
      rodada,
      status: 'AGENDADO',
      golsCasa: null,
      golsFora: null,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      vencedorId: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'user-1',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    jogoRepo.items.push(jogo);
    return jogo;
  }

  function simularGrupoECompleto() {
    // ALE (9pts), CDM (6pts), EQU (1pt), CUR (1pt)
    // Rodada 1
    criarJogoGrupo('ale-id', 'cur-id', 7, 1); // ALE 7x1 CUR
    criarJogoGrupo('cdm-id', 'equ-id', 1, 0); // CDM 1x0 EQU
    // Rodada 2
    criarJogoGrupo('ale-id', 'cdm-id', 2, 1); // ALE 2x1 CDM
    criarJogoGrupo('equ-id', 'cur-id', 0, 0); // EQU 0x0 CUR
    // Rodada 3
    criarJogoGrupo('equ-id', 'ale-id', 0, 2); // EQU 0x2 ALE
    criarJogoGrupo('cur-id', 'cdm-id', 0, 1); // CUR 0x1 CDM
  }

  describe('preencherProximaFaseEliminatoria', () => {
    it('não faz nada se não existe fase 16 avos', async () => {
      faseRepo.items = [{ ...faseGrupoE }]; // sem fase de 16 avos

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      // Nenhum jogo foi alterado (fase 16 avos não existe)
      const jogos16 = jogoRepo.items.filter((j) => j.faseId === 'fase-16-avos');
      expect(jogos16).toHaveLength(0);
    });

    it('não faz nada se todos os jogos já têm times definidos', async () => {
      criarJogo16Avos(3, 'ale-id', 'bra-id'); // sem TBD

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const jogo = jogoRepo.items.find((j) => j.faseId === 'fase-16-avos');
      expect(jogo?.timeCasaId).toBe('ale-id');
      expect(jogo?.timeForaId).toBe('bra-id');
    });

    it('preenche 1ºE via classificação quando grupo E está completo', async () => {
      simularGrupoECompleto();
      // Jogo R3 do chaveamento: 1E x 3ABCDF → casa deve ser 1ºE = ALE
      const jogo = criarJogo16Avos(3, TBD_ID, TBD_ID);

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const atualizado = jogoRepo.items.find((j) => j.id === jogo.id);
      // 1ºE = ale-id (mais pontos)
      expect(atualizado?.timeCasaId).toBe('ale-id');
      // 3ºABCDF = null (depende de API, não resolve)
      expect(atualizado?.timeForaId).toBe(TBD_ID);
    });

    it('preenche 2ºE via classificação quando grupo E está completo', async () => {
      simularGrupoECompleto();
      // Jogo R5 do chaveamento: 2E x 2I
      const jogo = criarJogo16Avos(5, TBD_ID, TBD_ID);

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const atualizado = jogoRepo.items.find((j) => j.id === jogo.id);
      // 2ºE = cdm-id (segundo no grupo E)
      expect(atualizado?.timeCasaId).toBe('cdm-id');
      // 2ºI = TBD (grupo I não existe na fixture)
      expect(atualizado?.timeForaId).toBe(TBD_ID);
    });

    it('não preenche se grupo não está completo (< 6 jogos finalizados)', async () => {
      // Apenas 4 jogos finalizados (falta rodada 3)
      criarJogoGrupo('ale-id', 'cur-id', 7, 1);
      criarJogoGrupo('cdm-id', 'equ-id', 1, 0);
      criarJogoGrupo('ale-id', 'cdm-id', 2, 1);
      criarJogoGrupo('equ-id', 'cur-id', 0, 0);

      const jogo = criarJogo16Avos(3, TBD_ID, TBD_ID);

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const atualizado = jogoRepo.items.find((j) => j.id === jogo.id);
      expect(atualizado?.timeCasaId).toBe(TBD_ID); // não preencheu
    });

    it('tenta API do GE antes da classificação', async () => {
      simularGrupoECompleto();
      const jogo = criarJogo16Avos(3, TBD_ID, TBD_ID);
      // Ajustar horário para casar com o que a API retorna
      jogo.dataHora = new Date('2026-06-29T20:30:00Z');

      // Simular API retornando jogo com time definido
      const jogoApiRaw = {
        id: 'ext-123',
        equipes: {
          mandante: {
            id: '999',
            nome_popular: 'Alemanha',
            sigla: 'ALE',
            escudo: null,
          },
          visitante: {
            id: '888',
            nome_popular: 'Bósnia',
            sigla: 'BOS',
            escudo: null,
          },
        },
        data_realizacao: '2026-06-29T17:30:00-03:00',
        transmissao: null,
      };
      vi.mocked(futebolApiService.buscarJogosPorRodadas).mockResolvedValue([
        jogoApiRaw,
      ]);
      vi.mocked(futebolApiService.normalizarJogo).mockReturnValue({
        externoId: 'ext-123',
        dataHora: '2026-06-29T20:30:00.000Z',
        status: 'AGENDADO',
        timeCasa: {
          externoId: '999',
          nome: 'Alemanha',
          sigla: 'ALE',
          escudo: null,
        },
        timeFora: {
          externoId: '888',
          nome: 'Bósnia',
          sigla: 'BOS',
          escudo: null,
        },
        golsCasa: null,
        golsFora: null,
        penaltisCasa: null,
        penaltisFora: null,
      });

      // Criar times no repo para resolver
      timeRepo.items.push({
        id: 'ale-real-id',
        nome: 'Alemanha',
        sigla: 'ALE',
        externoId: '999',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        escudo: null,
      });
      timeRepo.items.push({
        id: 'bos-real-id',
        nome: 'Bósnia',
        sigla: 'BOS',
        externoId: '888',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        escudo: null,
      });

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const atualizado = jogoRepo.items.find((j) => j.id === jogo.id);
      expect(atualizado?.timeCasaId).toBe('ale-real-id');
      expect(atualizado?.timeForaId).toBe('bos-real-id');
    });

    it('faz fallback para classificação quando API falha', async () => {
      simularGrupoECompleto();
      const jogo = criarJogo16Avos(3, TBD_ID, TBD_ID);

      vi.mocked(futebolApiService.buscarJogosPorRodadas).mockRejectedValue(
        new Error('timeout'),
      );

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const atualizado = jogoRepo.items.find((j) => j.id === jogo.id);
      // Fallback: 1ºE resolvido via classificação
      expect(atualizado?.timeCasaId).toBe('ale-id');
    });
  });
});

describe('ChaveamentoService - propagarVencedoresParaProximaFase (3º lugar e final)', () => {
  let service: ChaveamentoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;
  let futebolApiService: FutebolApiService;

  const TEMPORADA_ID = 'temp-copa-2026';

  const faseSemis = {
    id: 'fase-semis',
    nome: 'Semifinais',
    tipo: 'MATA_MATA',
    ordem: 16,
    idaVolta: false,
    temporadaId: TEMPORADA_ID,
    dataCriacao: new Date(),
  };

  const faseTerceiro = {
    id: 'fase-terceiro',
    nome: 'Disputa 3º Lugar',
    tipo: 'MATA_MATA',
    ordem: 17,
    idaVolta: false,
    temporadaId: TEMPORADA_ID,
    dataCriacao: new Date(),
  };

  const faseFinal = {
    id: 'fase-final',
    nome: 'Final',
    tipo: 'MATA_MATA',
    ordem: 18,
    idaVolta: false,
    temporadaId: TEMPORADA_ID,
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    timeRepo = new InMemoryTimeRepository();
    faseRepo.items = [{ ...faseSemis }, { ...faseTerceiro }, { ...faseFinal }];

    // Time TBD
    timeRepo.items.push({
      id: TBD_ID,
      nome: 'A Definir',
      sigla: 'TBD',
      escudo: null,
      externoId: null,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });

    futebolApiService = {
      buscarJogosPorRodada: vi.fn().mockResolvedValue([]),
      buscarJogosPorRodadas: vi.fn().mockResolvedValue([]),
      normalizarJogo: vi.fn(),
      buscarJogosPorIds: vi.fn(),
      mapearStatus: vi.fn(),
    } as unknown as FutebolApiService;

    service = new ChaveamentoService(
      jogoRepo,
      faseRepo,
      timeRepo,
      futebolApiService,
    );
  });

  function criarJogoSemifinal(
    rodada: number,
    timeCasaId: string,
    timeForaId: string,
    vencedorId: string | null,
    status = 'FINALIZADO',
  ) {
    jogoRepo.items.push({
      id: `semi-${rodada}`,
      faseId: 'fase-semis',
      timeCasaId,
      timeForaId,
      dataHora: new Date('2026-07-14T19:00:00Z'),
      rodada,
      status,
      golsCasa: vencedorId === timeCasaId ? 2 : 1,
      golsFora: vencedorId === timeForaId ? 2 : 1,
      vencedorId,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema-chaveamento',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });
  }

  it('cria jogo de 3º lugar com PERDEDORES das semifinais', async () => {
    // Semi 1: BRA vence ALE → perdedor = ALE
    criarJogoSemifinal(1, 'bra-id', 'ale-id', 'bra-id');
    // Semi 2: ARG vence FRA → perdedor = FRA
    criarJogoSemifinal(2, 'arg-id', 'fra-id', 'arg-id');

    await service.propagarVencedoresParaProximaFase(TEMPORADA_ID);

    const jogoTerceiro = jogoRepo.items.find(
      (j) => j.faseId === 'fase-terceiro',
    );
    expect(jogoTerceiro).toBeDefined();
    // Perdedores: ALE (perdeu semi 1) e FRA (perdeu semi 2)
    expect(jogoTerceiro?.timeCasaId).toBe('ale-id');
    expect(jogoTerceiro?.timeForaId).toBe('fra-id');
  });

  it('cria jogo da final com VENCEDORES das semifinais', async () => {
    // Semi 1: BRA vence ALE
    criarJogoSemifinal(1, 'bra-id', 'ale-id', 'bra-id');
    // Semi 2: ARG vence FRA
    criarJogoSemifinal(2, 'arg-id', 'fra-id', 'arg-id');

    await service.propagarVencedoresParaProximaFase(TEMPORADA_ID);

    const jogoFinal = jogoRepo.items.find((j) => j.faseId === 'fase-final');
    expect(jogoFinal).toBeDefined();
    // Vencedores: BRA (venceu semi 1) e ARG (venceu semi 2)
    expect(jogoFinal?.timeCasaId).toBe('bra-id');
    expect(jogoFinal?.timeForaId).toBe('arg-id');
  });

  it('não cria jogos se semis não estão finalizadas', async () => {
    criarJogoSemifinal(1, 'bra-id', 'ale-id', null, 'EM_ANDAMENTO');
    criarJogoSemifinal(2, 'arg-id', 'fra-id', null, 'AGENDADO');

    await service.propagarVencedoresParaProximaFase(TEMPORADA_ID);

    const jogoTerceiro = jogoRepo.items.find(
      (j) => j.faseId === 'fase-terceiro',
    );
    const jogoFinal = jogoRepo.items.find((j) => j.faseId === 'fase-final');
    expect(jogoTerceiro).toBeUndefined();
    expect(jogoFinal).toBeUndefined();
  });

  it('cria jogo parcial quando apenas 1 semi está finalizada', async () => {
    criarJogoSemifinal(1, 'bra-id', 'ale-id', 'bra-id');
    criarJogoSemifinal(2, 'arg-id', 'fra-id', null, 'AGENDADO');

    await service.propagarVencedoresParaProximaFase(TEMPORADA_ID);

    const jogoTerceiro = jogoRepo.items.find(
      (j) => j.faseId === 'fase-terceiro',
    );
    expect(jogoTerceiro).toBeDefined();
    // Perdedor da semi 1 (ALE) + TBD
    expect(jogoTerceiro?.timeCasaId).toBe('ale-id');
    expect(jogoTerceiro?.timeForaId).toBe(TBD_ID);

    const jogoFinal = jogoRepo.items.find((j) => j.faseId === 'fase-final');
    expect(jogoFinal).toBeDefined();
    // Vencedor da semi 1 (BRA) + TBD
    expect(jogoFinal?.timeCasaId).toBe('bra-id');
    expect(jogoFinal?.timeForaId).toBe(TBD_ID);
  });
});

describe('ChaveamentoService - dispararNotificacaoJogoLiberado', () => {
  let service: ChaveamentoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;
  let futebolApiService: FutebolApiService;
  let notificacaoEventService: {
    notificarJogoLiberado: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    timeRepo = new InMemoryTimeRepository();

    futebolApiService = {
      buscarJogosPorRodada: vi.fn().mockResolvedValue([]),
      buscarJogosPorRodadas: vi.fn().mockResolvedValue([]),
      normalizarJogo: vi.fn(),
      buscarJogosPorIds: vi.fn(),
      mapearStatus: vi.fn(),
    } as unknown as FutebolApiService;

    notificacaoEventService = {
      notificarJogoLiberado: vi.fn().mockResolvedValue(undefined),
    };

    service = new ChaveamentoService(
      jogoRepo,
      faseRepo,
      timeRepo,
      futebolApiService,
      notificacaoEventService as unknown as NotificacaoEventService,
    );

    // Times
    timeRepo.items.push(
      {
        id: TBD_ID,
        nome: 'A Definir',
        sigla: 'TBD',
        escudo: null,
        externoId: null,
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
      },
      {
        id: 'bra-id',
        nome: 'Brasil',
        sigla: 'BRA',
        escudo: null,
        externoId: 'ext-bra',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
      },
      {
        id: 'arg-id',
        nome: 'Argentina',
        sigla: 'ARG',
        escudo: null,
        externoId: 'ext-arg',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
      },
    );
  });

  it('não dispara notificação na propagação (notifica apenas quando externoId é vinculado)', async () => {
    // Usar semifinais → final (bracket simples: R1 vencedor = casa, R2 vencedor = fora)
    const faseSemisLocal = {
      id: 'fase-semis-local',
      nome: 'Semifinais',
      tipo: 'MATA_MATA',
      ordem: 16,
      idaVolta: false,
      temporadaId: TEMPORADA_ID,
      dataCriacao: new Date(),
    };
    const faseFinalLocal = {
      id: 'fase-final-local',
      nome: 'Final',
      tipo: 'MATA_MATA',
      ordem: 18,
      idaVolta: false,
      temporadaId: TEMPORADA_ID,
      dataCriacao: new Date(),
    };
    faseRepo.items = [faseSemisLocal, faseFinalLocal];

    // Duas semifinais finalizadas
    jogoRepo.items.push({
      id: 'semi-1',
      faseId: 'fase-semis-local',
      timeCasaId: 'bra-id',
      timeForaId: 'arg-id',
      dataHora: new Date('2026-07-14T19:00:00Z'),
      rodada: 1,
      status: 'FINALIZADO',
      vencedorId: 'bra-id',
      golsCasa: 2,
      golsFora: 1,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });
    jogoRepo.items.push({
      id: 'semi-2',
      faseId: 'fase-semis-local',
      timeCasaId: 'arg-id',
      timeForaId: 'bra-id',
      dataHora: new Date('2026-07-14T22:00:00Z'),
      rodada: 2,
      status: 'FINALIZADO',
      vencedorId: 'arg-id',
      golsCasa: 3,
      golsFora: 0,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });

    // Jogo da final com TBD (será preenchido com vencedores)
    jogoRepo.items.push({
      id: 'jogo-final',
      faseId: 'fase-final-local',
      timeCasaId: TBD_ID,
      timeForaId: TBD_ID,
      dataHora: new Date('2026-07-18T20:00:00Z'),
      rodada: 1,
      status: 'AGENDADO',
      vencedorId: null,
      golsCasa: null,
      golsFora: null,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });

    await service.propagarVencedoresParaProximaFase(TEMPORADA_ID);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Propagação preenche times mas não notifica — notificação só ocorre com externoId
    expect(
      notificacaoEventService.notificarJogoLiberado,
    ).not.toHaveBeenCalled();

    // Times devem estar preenchidos
    const jogoFinal = jogoRepo.items.find((j) => j.id === 'jogo-final');
    expect(jogoFinal?.timeCasaId).toBe('bra-id');
    expect(jogoFinal?.timeForaId).toBe('arg-id');
  });

  it('não dispara notificação se notificacaoEventService não existe', async () => {
    const serviceWithout = new ChaveamentoService(
      jogoRepo,
      faseRepo,
      timeRepo,
      futebolApiService,
      // sem notificacaoEventService
    );

    const faseOitavas = {
      id: 'fase-oitavas',
      nome: 'Oitavas de Final',
      tipo: 'MATA_MATA',
      ordem: 14,
      idaVolta: false,
      temporadaId: TEMPORADA_ID,
      dataCriacao: new Date(),
    };
    const fase16Avos = {
      id: 'fase-16avos',
      nome: '16 Avos de Final',
      tipo: 'MATA_MATA',
      ordem: 13,
      idaVolta: false,
      temporadaId: TEMPORADA_ID,
      dataCriacao: new Date(),
    };
    faseRepo.items = [fase16Avos, faseOitavas];

    jogoRepo.items.push({
      id: 'jogo-16avos-1',
      faseId: 'fase-16avos',
      timeCasaId: 'bra-id',
      timeForaId: 'arg-id',
      dataHora: new Date('2026-07-04T20:00:00Z'),
      rodada: 1,
      status: 'FINALIZADO',
      vencedorId: 'bra-id',
      golsCasa: 2,
      golsFora: 1,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });

    jogoRepo.items.push({
      id: 'jogo-oitavas-1',
      faseId: 'fase-oitavas',
      timeCasaId: TBD_ID,
      timeForaId: 'arg-id',
      dataHora: new Date('2026-07-09T20:00:00Z'),
      rodada: 1,
      status: 'AGENDADO',
      vencedorId: null,
      golsCasa: null,
      golsFora: null,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });

    // Não deve lançar erro — graceful quando service é undefined
    await expect(
      serviceWithout.propagarVencedoresParaProximaFase(TEMPORADA_ID),
    ).resolves.not.toThrow();
  });

  it('não dispara se um time ainda é TBD', async () => {
    const faseOitavas = {
      id: 'fase-oitavas',
      nome: 'Oitavas de Final',
      tipo: 'MATA_MATA',
      ordem: 14,
      idaVolta: false,
      temporadaId: TEMPORADA_ID,
      dataCriacao: new Date(),
    };
    const fase16Avos = {
      id: 'fase-16avos',
      nome: '16 Avos de Final',
      tipo: 'MATA_MATA',
      ordem: 13,
      idaVolta: false,
      temporadaId: TEMPORADA_ID,
      dataCriacao: new Date(),
    };
    faseRepo.items = [fase16Avos, faseOitavas];

    // Apenas 1 semi finalizada — destino fica com TBD em um lado
    jogoRepo.items.push({
      id: 'jogo-16avos-1',
      faseId: 'fase-16avos',
      timeCasaId: 'bra-id',
      timeForaId: 'arg-id',
      dataHora: new Date('2026-07-04T20:00:00Z'),
      rodada: 1,
      status: 'FINALIZADO',
      vencedorId: 'bra-id',
      golsCasa: 2,
      golsFora: 1,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });

    // Jogo destino: ambos TBD (segundo time vem de R2 que não finalizou)
    jogoRepo.items.push({
      id: 'jogo-oitavas-1',
      faseId: 'fase-oitavas',
      timeCasaId: TBD_ID,
      timeForaId: TBD_ID,
      dataHora: new Date('2026-07-09T20:00:00Z'),
      rodada: 1,
      status: 'AGENDADO',
      vencedorId: null,
      golsCasa: null,
      golsFora: null,
      temProrrogacao: false,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    });

    await service.propagarVencedoresParaProximaFase(TEMPORADA_ID);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Não notifica pq um time ainda é TBD
    expect(
      notificacaoEventService.notificarJogoLiberado,
    ).not.toHaveBeenCalled();
  });
});
