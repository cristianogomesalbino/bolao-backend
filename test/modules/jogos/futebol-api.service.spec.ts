import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FutebolApiService } from '@src/modules/jogos/services/futebol-api.service';
import {
  GE_BASE_URL,
  BRASILEIRAO_CAMPEONATO_ID,
  COPA_DO_MUNDO_CAMPEONATO_ID,
  CAMPEONATO_CONFIGS,
} from '@src/modules/jogos/jogos.constants';
import { ApiExternaIndisponivelError } from '@src/common/errors/domain-errors';

describe('FutebolApiService', () => {
  let service: FutebolApiService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FutebolApiService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buscarJogosPorRodada', () => {
    it('deve construir URL correta para Brasileirão', async () => {
      const faseSlug = 'fase-unica-campeonato-brasileiro-2025';
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.buscarJogosPorRodada(
        BRASILEIRAO_CAMPEONATO_ID,
        faseSlug,
        5,
      );

      const urlChamada = fetchMock.mock.calls[0][0];
      expect(urlChamada).toBe(
        `${GE_BASE_URL}/${BRASILEIRAO_CAMPEONATO_ID}/fase/${faseSlug}/rodada/5/jogos/`,
      );
    });

    it('deve construir URL correta para Copa do Mundo', async () => {
      const faseSlug = 'fase-de-grupos-copa-do-mundo-2026';
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.buscarJogosPorRodada(
        COPA_DO_MUNDO_CAMPEONATO_ID,
        faseSlug,
        2,
      );

      const urlChamada = fetchMock.mock.calls[0][0];
      expect(urlChamada).toBe(
        `${GE_BASE_URL}/${COPA_DO_MUNDO_CAMPEONATO_ID}/fase/${faseSlug}/rodada/2/jogos/`,
      );
    });

    it('deve retornar array de jogos quando API retorna dados', async () => {
      const jogosApi = [{ id: 1 }, { id: 2 }];
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(jogosApi),
      });

      const result = await service.buscarJogosPorRodada(
        'camp-id',
        'fase-slug',
        1,
      );

      expect(result).toEqual(jogosApi);
    });

    it('deve lançar ApiExternaIndisponivelError quando API retorna erro', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      await expect(
        service.buscarJogosPorRodada('camp-id', 'fase-slug', 1),
      ).rejects.toThrow(ApiExternaIndisponivelError);
    });

    it('deve lançar ApiExternaIndisponivelError quando fetch falha', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        service.buscarJogosPorRodada('camp-id', 'fase-slug', 1),
      ).rejects.toThrow(ApiExternaIndisponivelError);
    });
  });

  describe('buscarJogosPorIds', () => {
    it('deve retornar array vazio para ids vazio', async () => {
      const config = CAMPEONATO_CONFIGS['brasileirao'];
      const result = await service.buscarJogosPorIds([], config);
      expect(result).toEqual([]);
    });

    it('deve iterar fases e rodadas do config da Copa do Mundo', async () => {
      const config = CAMPEONATO_CONFIGS['copa-do-mundo-2026'];
      const jogoAlvo = { id: 42, nome: 'jogo-teste' };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([jogoAlvo]),
      });

      const result = await service.buscarJogosPorIds([42], config);

      expect(result).toContainEqual(jogoAlvo);
      // Deve ter parado após encontrar
      expect(fetchMock).toHaveBeenCalled();
    });

    it('deve iterar todas as fases/rodadas do Brasileirão se não encontrar', async () => {
      const config = CAMPEONATO_CONFIGS['brasileirao'];

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.buscarJogosPorIds([999], config);

      // Brasileirão tem 2 fases com 38 rodadas cada = 76
      expect(fetchMock).toHaveBeenCalledTimes(76);
    });
  });

  describe('buscarJogosPorRodadas', () => {
    it('deve retornar array vazio para rodadas vazia', async () => {
      const result = await service.buscarJogosPorRodadas('camp-id', 'fase', []);
      expect(result).toEqual([]);
    });

    it('deve buscar múltiplas rodadas em paralelo', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1 }]),
      });

      const result = await service.buscarJogosPorRodadas(
        'camp-id',
        'fase',
        [1, 2, 3],
      );

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it('deve lançar ApiExternaIndisponivelError se todas as rodadas falharem', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      await expect(
        service.buscarJogosPorRodadas('camp-id', 'fase', [1, 2]),
      ).rejects.toThrow(ApiExternaIndisponivelError);
    });
  });

  describe('normalizarJogo', () => {
    const jogoApiMock = {
      id: 12345,
      data_realizacao: '2026-06-15 16:00',
      equipes: {
        mandante: {
          id: 100,
          nome_popular: 'Brasil',
          sigla: 'BRA',
          escudo: 'url-bra',
        },
        visitante: {
          id: 200,
          nome_popular: 'Argentina',
          sigla: 'ARG',
          escudo: 'url-arg',
        },
      },
      placar_oficial_mandante: null,
      placar_oficial_visitante: null,
      placar_penaltis_mandante: null,
      placar_penaltis_visitante: null,
      transmissao: { broadcast: { id: 'AGENDADO' } },
      jogo_ja_comecou: false,
    };

    it('deve produzir objeto normalizado com todas as chaves', () => {
      const result = service.normalizarJogo(jogoApiMock);

      expect(result).toHaveProperty('externoId', '12345');
      expect(result).toHaveProperty('dataHora');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timeCasaId', '100');
      expect(result).toHaveProperty('timeForaId', '200');
      expect(result).toHaveProperty('golsCasa');
      expect(result).toHaveProperty('golsFora');
      expect(result).toHaveProperty('penaltisCasa');
      expect(result).toHaveProperty('penaltisFora');
      expect(result).toHaveProperty('timeCasa');
      expect(result).toHaveProperty('timeFora');
    });

    it('deve converter data BRT para UTC (-03:00)', () => {
      const result = service.normalizarJogo(jogoApiMock);

      // 16:00 BRT = 19:00 UTC
      expect(result.dataHora).toContain('19:00:00');
    });

    it('deve retornar dataHora null e status ADIADO para jogo sem data', () => {
      const jogoSemData = { ...jogoApiMock, data_realizacao: null };
      const result = service.normalizarJogo(jogoSemData);

      expect(result.dataHora).toBeNull();
      expect(result.status).toBe('ADIADO');
    });

    it('deve incluir dados dos times com externoId, nome, sigla, escudo', () => {
      const result = service.normalizarJogo(jogoApiMock);

      expect(result.timeCasa).toEqual({
        externoId: '100',
        nome: 'Brasil',
        sigla: 'BRA',
        escudo: 'url-bra',
      });
      expect(result.timeFora).toEqual({
        externoId: '200',
        nome: 'Argentina',
        sigla: 'ARG',
        escudo: 'url-arg',
      });
    });

    it('deve incluir pênaltis quando disponíveis', () => {
      const jogoComPenaltis = {
        ...jogoApiMock,
        placar_penaltis_mandante: 5,
        placar_penaltis_visitante: 3,
      };
      const result = service.normalizarJogo(jogoComPenaltis);

      expect(result.penaltisCasa).toBe(5);
      expect(result.penaltisFora).toBe(3);
    });
  });

  describe('mapearStatus', () => {
    it('deve retornar FINALIZADO para broadcast ENCERRADA', () => {
      const result = service.mapearStatus({
        transmissao: { broadcast: { id: 'ENCERRADA' } },
        jogo_ja_comecou: false,
      });
      expect(result).toBe('FINALIZADO');
    });

    it('deve retornar EM_ANDAMENTO para jogo_ja_comecou true', () => {
      const result = service.mapearStatus({
        transmissao: { broadcast: { id: 'QUALQUER' } },
        jogo_ja_comecou: true,
      });
      expect(result).toBe('EM_ANDAMENTO');
    });

    it('deve retornar AGENDADO por padrão', () => {
      const result = service.mapearStatus({
        transmissao: { broadcast: { id: 'QUALQUER' } },
        jogo_ja_comecou: false,
      });
      expect(result).toBe('AGENDADO');
    });
  });
});
