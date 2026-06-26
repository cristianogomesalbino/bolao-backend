import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JogoService } from '@src/modules/jogos/services/jogo.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryTimeRepository } from '@src/modules/times/repositories/in-memory-time.repository';
import { FutebolApiService } from '@src/modules/jogos/services/futebol-api.service';
import { COPA_FASES } from '@src/modules/jogos/jogos.constants';
import {
  FaseNaoEncontradaError,
  CampeonatoNaoSuportadoError,
  RodadaForaDoLimiteError,
  FaseSlugInvalidaError,
} from '@src/common/errors/domain-errors';
import { ImportarJogosDto } from '@src/modules/jogos/dto/importar-jogos.dto';

describe('JogoService — importação multi-campeonato', () => {
  let service: JogoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;
  let futebolApiService: FutebolApiService;

  const userId = 'user-admin';

  const faseBanco = {
    id: 'fase-banco-1',
    nome: 'Fase de Grupos - Grupo A',
    tipo: 'PONTOS_CORRIDOS',
    ordem: 1,
    idaVolta: false,
    temporadaId: 'temp-copa-2026',
    dataCriacao: new Date(),
  };

  const jogoApiNormalizado = {
    externoId: '99001',
    dataHora: '2026-06-15T19:00:00.000Z',
    status: 'AGENDADO',
    timeCasaId: '100',
    timeForaId: '200',
    golsCasa: null,
    golsFora: null,
    penaltisCasa: null,
    penaltisFora: null,
    timeCasa: {
      externoId: '100',
      nome: 'Brasil',
      sigla: 'BRA',
      escudo: 'url-bra',
    },
    timeFora: {
      externoId: '200',
      nome: 'Argentina',
      sigla: 'ARG',
      escudo: 'url-arg',
    },
  };

  beforeEach(() => {
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    timeRepo = new InMemoryTimeRepository();
    faseRepo.items = [{ ...faseBanco }];

    futebolApiService = {
      buscarJogosPorRodada: vi.fn().mockResolvedValue([{ id: 99001 }]),
      buscarJogosPorIds: vi.fn(),
      buscarJogosPorRodadas: vi.fn(),
      normalizarJogo: vi.fn().mockReturnValue({ ...jogoApiNormalizado }),
      mapearStatus: vi.fn(),
    } as any;

    service = new JogoService(jogoRepo, faseRepo, futebolApiService, timeRepo, {
      preencherProximaFaseEliminatoria: vi.fn(),
      propagarVencedoresParaProximaFase: vi.fn(),
    } as any);
  });

  describe('importação Copa do Mundo — fase de grupos', () => {
    it('deve importar jogos da Copa do Mundo com sucesso', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      const result = await service.importarJogos(dto, userId);

      expect(result.importados).toBe(1);
      expect(result.ignorados).toBe(0);
    });

    it('deve definir fonteResultado como API_EXTERNA', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      await service.importarJogos(dto, userId);

      expect(jogoRepo.items[0].fonteResultado).toBe('API_EXTERNA');
    });

    it('deve criar times automaticamente', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      await service.importarJogos(dto, userId);

      expect(timeRepo.items).toHaveLength(2);
      expect(timeRepo.items[0].nome).toBe('Brasil');
      expect(timeRepo.items[1].nome).toBe('Argentina');
    });

    it('deve aceitar rodadas 1-3 para fase de grupos', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 3,
        faseId: 'fase-banco-1',
      };

      const result = await service.importarJogos(dto, userId);
      expect(result.importados).toBe(1);
    });
  });

  describe('importação Copa do Mundo — fase eliminatória', () => {
    it('deve aceitar rodada 1 para oitavas de final', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.OITAVAS,
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      const result = await service.importarJogos(dto, userId);
      expect(result.importados).toBe(1);
    });

    it('deve persistir pênaltis em jogos mata-mata', async () => {
      const jogoComPenaltis = {
        ...jogoApiNormalizado,
        status: 'FINALIZADO',
        golsCasa: 1,
        golsFora: 1,
        penaltisCasa: 5,
        penaltisFora: 3,
      };
      (futebolApiService.normalizarJogo as any).mockReturnValue(
        jogoComPenaltis,
      );

      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.OITAVAS,
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      await service.importarJogos(dto, userId);

      expect(jogoRepo.items[0].temPenaltis).toBe(true);
      expect(jogoRepo.items[0].penaltisCasa).toBe(5);
      expect(jogoRepo.items[0].penaltisFora).toBe(3);
    });
  });

  describe('validações de campeonato/fase/rodada', () => {
    it('deve lançar CampeonatoNaoSuportadoError para slug inválido', async () => {
      const dto = {
        campeonatoSlug: 'invalido' as any,
        faseSlug: 'qualquer',
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      await expect(service.importarJogos(dto, userId)).rejects.toThrow(
        CampeonatoNaoSuportadoError,
      );
    });

    it('deve lançar FaseSlugInvalidaError para faseSlug inexistente no config', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: 'fase-inexistente',
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      await expect(service.importarJogos(dto, userId)).rejects.toThrow(
        FaseSlugInvalidaError,
      );
    });

    it('deve lançar RodadaForaDoLimiteError para rodada > maxRodadas (grupos)', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 4,
        faseId: 'fase-banco-1',
      };

      await expect(service.importarJogos(dto, userId)).rejects.toThrow(
        RodadaForaDoLimiteError,
      );
    });

    it('deve lançar RodadaForaDoLimiteError para rodada > 1 em eliminatória', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.OITAVAS,
        rodada: 2,
        faseId: 'fase-banco-1',
      };

      await expect(service.importarJogos(dto, userId)).rejects.toThrow(
        RodadaForaDoLimiteError,
      );
    });

    it('deve lançar RodadaForaDoLimiteError para rodada > 38 no Brasileirão', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'brasileirao',
        faseSlug: 'fase-unica-campeonato-brasileiro-2026',
        rodada: 39,
        faseId: 'fase-banco-1',
      };

      await expect(service.importarJogos(dto, userId)).rejects.toThrow(
        RodadaForaDoLimiteError,
      );
    });

    it('deve lançar FaseNaoEncontradaError para faseId inexistente no banco', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 1,
        faseId: 'fase-inexistente',
      };

      await expect(service.importarJogos(dto, userId)).rejects.toThrow(
        FaseNaoEncontradaError,
      );
    });
  });

  describe('backward compatibility — Brasileirão', () => {
    it('deve importar jogos do Brasileirão com sucesso', async () => {
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'brasileirao',
        faseSlug: 'fase-unica-campeonato-brasileiro-2026',
        rodada: 10,
        faseId: 'fase-banco-1',
      };

      const result = await service.importarJogos(dto, userId);
      expect(result.importados).toBe(1);
    });

    it('deve ignorar jogos com externoId já existente', async () => {
      // Importar pela primeira vez
      const dto: ImportarJogosDto = {
        campeonatoSlug: 'brasileirao',
        faseSlug: 'fase-unica-campeonato-brasileiro-2026',
        rodada: 10,
        faseId: 'fase-banco-1',
      };
      await service.importarJogos(dto, userId);

      // Importar novamente — mesmo externoId
      const result = await service.importarJogos(dto, userId);
      expect(result.importados).toBe(0);
      expect(result.ignorados).toBe(1);
    });
  });

  describe('tratamento de datas', () => {
    it('deve importar jogo sem data como ADIADO', async () => {
      const jogoSemData = {
        ...jogoApiNormalizado,
        dataHora: null,
        status: 'ADIADO',
      };
      (futebolApiService.normalizarJogo as any).mockReturnValue(jogoSemData);

      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      await service.importarJogos(dto, userId);

      expect(jogoRepo.items[0].status).toBe('ADIADO');
      expect(jogoRepo.items[0].dataHora).toBeNull();
    });

    it('deve importar jogo com data inválida (ano < 2020) como ADIADO', async () => {
      const jogoDataInvalida = {
        ...jogoApiNormalizado,
        dataHora: '1970-01-01T00:00:00.000Z',
        status: 'AGENDADO',
      };
      (futebolApiService.normalizarJogo as any).mockReturnValue(
        jogoDataInvalida,
      );

      const dto: ImportarJogosDto = {
        campeonatoSlug: 'copa-do-mundo-2026',
        faseSlug: COPA_FASES.FASE_DE_GRUPOS,
        rodada: 1,
        faseId: 'fase-banco-1',
      };

      await service.importarJogos(dto, userId);

      expect(jogoRepo.items[0].status).toBe('ADIADO');
      expect(jogoRepo.items[0].dataHora).toBeNull();
      expect(jogoRepo.items[0].foiAdiado).toBe(true);
    });
  });
});
