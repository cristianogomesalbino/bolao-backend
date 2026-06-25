import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChaveamentoService } from '@src/modules/jogos/services/chaveamento.service';
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
    campeonatoId: 'copa-2026-id',
    fases: [{ slug: 'segunda-fase-copa-do-mundo-2026', tipo: 'MATA_MATA' }],
    buildFaseSlug: (slug: string) => slug,
  };

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
    } as any;

    service = new ChaveamentoService(
      jogoRepo,
      faseRepo,
      timeRepo,
      futebolApiService,
    );
  });

  function criarJogoGrupo(timeCasaId: string, timeForaId: string, golsCasa: number, golsFora: number) {
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

  function criarJogo16Avos(rodada: number, timeCasaId: string, timeForaId: string) {
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
      const jogoApiRaw = { id: 'ext-123', equipes: { mandante: { id: '999', nome_popular: 'Alemanha', sigla: 'ALE', escudo: null }, visitante: { id: '888', nome_popular: 'Bósnia', sigla: 'BOS', escudo: null } }, data_realizacao: '2026-06-29T17:30:00-03:00', transmissao: null };
      vi.mocked(futebolApiService.buscarJogosPorRodadas).mockResolvedValue([jogoApiRaw]);
      vi.mocked(futebolApiService.normalizarJogo).mockReturnValue({
        externoId: 'ext-123',
        dataHora: '2026-06-29T20:30:00.000Z',
        status: 'AGENDADO',
        timeCasa: { externoId: '999', nome: 'Alemanha', sigla: 'ALE', escudo: null },
        timeFora: { externoId: '888', nome: 'Bósnia', sigla: 'BOS', escudo: null },
        golsCasa: null,
        golsFora: null,
        penaltisCasa: null,
        penaltisFora: null,
      });

      // Criar times no repo para resolver
      timeRepo.items.push({ id: 'ale-real-id', nome: 'Alemanha', sigla: 'ALE', externoId: '999', dataCriacao: new Date(), atualizadoEm: new Date(), escudo: null });
      timeRepo.items.push({ id: 'bos-real-id', nome: 'Bósnia', sigla: 'BOS', externoId: '888', dataCriacao: new Date(), atualizadoEm: new Date(), escudo: null });

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const atualizado = jogoRepo.items.find((j) => j.id === jogo.id);
      expect(atualizado?.timeCasaId).toBe('ale-real-id');
      expect(atualizado?.timeForaId).toBe('bos-real-id');
    });

    it('faz fallback para classificação quando API falha', async () => {
      simularGrupoECompleto();
      const jogo = criarJogo16Avos(3, TBD_ID, TBD_ID);

      vi.mocked(futebolApiService.buscarJogosPorRodadas).mockRejectedValue(new Error('timeout'));

      await service.preencherProximaFaseEliminatoria(TEMPORADA_ID, config);

      const atualizado = jogoRepo.items.find((j) => j.id === jogo.id);
      // Fallback: 1ºE resolvido via classificação
      expect(atualizado?.timeCasaId).toBe('ale-id');
    });
  });
});
