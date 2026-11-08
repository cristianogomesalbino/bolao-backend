import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueSequenciaService } from '../../../../src/modules/destaques/services/destaque-sequencia.service';
import { DestaqueRecordeService } from '../../../../src/modules/destaques/services/destaque-recorde.service';
import { PontuacaoService } from '../../../../src/modules/ranking/services/pontuacao.service';
import { InMemoryRecordeRepository } from '../../../../src/modules/destaques/repositories/in-memory-recorde.repository';
import type { PalpiteRepository } from '../../../../src/modules/palpites/repositories/palpite.repository.interface';
import type { JogoRepository } from '../../../../src/modules/jogos/repositories/jogo.repository.interface';

describe('DestaqueSequenciaService', () => {
  let service: DestaqueSequenciaService;
  let recordeRepo: InMemoryRecordeRepository;
  let pontuacaoService: PontuacaoService;
  let mockPalpiteRepo: {
    buscarPorUsuarioEJogos: ReturnType<typeof vi.fn>;
    listarPorJogosEUsuarios: ReturnType<typeof vi.fn>;
  };
  let mockJogoRepo: {
    buscarPorFase: ReturnType<typeof vi.fn>;
    buscarTodosPorTemporada: ReturnType<typeof vi.fn>;
  };

  const criarJogo = (
    id: string,
    rodada: number,
    golsCasa: number,
    golsFora: number,
    dataHora?: string,
  ) => ({
    id,
    faseId: 'fase-1',
    rodada,
    status: 'FINALIZADO',
    golsCasa,
    golsFora,
    timeCasaId: 'tc',
    timeForaId: 'tf',
    dataHora: dataHora ?? new Date().toISOString(),
    timeCasa: { nome: 'Palmeiras' },
    timeFora: { nome: 'Corinthians' },
  });

  beforeEach(() => {
    recordeRepo = new InMemoryRecordeRepository();
    pontuacaoService = new PontuacaoService();
    mockPalpiteRepo = {
      buscarPorUsuarioEJogos: vi.fn().mockResolvedValue([]),
      listarPorJogosEUsuarios: vi.fn().mockResolvedValue([]),
    };
    mockJogoRepo = {
      buscarPorFase: vi.fn().mockResolvedValue([]),
      buscarTodosPorTemporada: vi.fn().mockResolvedValue([]),
    };

    service = new DestaqueSequenciaService(
      mockPalpiteRepo as unknown as PalpiteRepository,
      mockJogoRepo as unknown as JogoRepository,
      pontuacaoService,
      new DestaqueRecordeService(recordeRepo),
    );
  });

  describe('calcularSequenciaResultado', () => {
    it('deve retornar null se rodada é null', async () => {
      const resultado = await service.calcularSequenciaResultado(
        'user-1',
        'fase-1',
        null,
        'jogo-1',
      );

      expect(resultado).toBeNull();
    });

    it('deve funcionar cross-rodada (consulta rodadas anteriores)', async () => {
      const jogosRodada4 = [
        criarJogo('jogo-r4a', 4, 2, 1, '2024-01-01T10:00:00Z'),
        criarJogo('jogo-r4b', 4, 1, 0, '2024-01-01T18:00:00Z'),
      ];
      const jogosRodada5 = [
        criarJogo('jogo-r5', 5, 1, 0, '2024-01-02T10:00:00Z'),
      ];

      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) => {
          if (rodada === 5) return Promise.resolve(jogosRodada5);
          if (rodada === 4) return Promise.resolve(jogosRodada4);
          return Promise.resolve([]);
        },
      );

      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'jogo-r4a', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'jogo-r4b', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'jogo-r5', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const resultado = await service.calcularSequenciaResultado(
        'user-1',
        'fase-1',
        5,
        'jogo-r5',
      );

      expect(resultado).not.toBeNull();
      expect(resultado!.quantidade).toBe(3);
    });

    it('não publica sequência com menos de 3 jogos', async () => {
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) => {
          if (rodada === 5) {
            return Promise.resolve([
              criarJogo('jogo-r5', 5, 1, 0, '2024-01-02T10:00:00Z'),
            ]);
          }
          if (rodada === 4) {
            return Promise.resolve([
              criarJogo('jogo-r4', 4, 2, 1, '2024-01-01T10:00:00Z'),
            ]);
          }
          return Promise.resolve([]);
        },
      );
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'jogo-r4', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'jogo-r5', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const resultado = await service.calcularSequenciaResultado(
        'user-1',
        'fase-1',
        5,
        'jogo-r5',
      );

      expect(resultado).toBeNull();
    });

    it('não consulta rodada além da imediatamente anterior', async () => {
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) => {
          if (rodada === 5) {
            return Promise.resolve([
              criarJogo('jogo-r5', 5, 1, 0, '2024-01-03T10:00:00Z'),
            ]);
          }
          if (rodada === 3) {
            return Promise.resolve([
              criarJogo('jogo-r3', 3, 2, 0, '2024-01-01T10:00:00Z'),
            ]);
          }
          return Promise.resolve([]);
        },
      );
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'jogo-r3', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'jogo-r5', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const resultado = await service.calcularSequenciaResultado(
        'user-1',
        'fase-1',
        5,
        'jogo-r5',
      );

      expect(resultado).toBeNull();
      expect(mockJogoRepo.buscarPorFase).not.toHaveBeenCalledWith('fase-1', 3);
    });

    it('não atravessa um zero quando outro jogo tem o mesmo horário de início', async () => {
      const horario = '2026-11-04T22:30:00Z';
      const jogos = [
        criarJogo('int', 34, 1, 0, '2026-11-04T00:30:00Z'),
        criarJogo('a-fla', 34, 2, 1, horario),
        criarJogo('z-cap', 34, 1, 3, horario),
      ];
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) =>
          Promise.resolve(rodada === 34 ? jogos : []),
      );
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'int', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'a-fla', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'z-cap', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
      ]);

      const noFlamengo = await service.calcularSequenciaResultado(
        'user-1',
        'fase-1',
        34,
        'a-fla',
      );
      expect(noFlamengo).toBeNull();

      const melhor = await service.calcularMelhorSequenciaResultado(
        'user-1',
        'fase-1',
        34,
      );
      expect(melhor).toBeNull();
    });

    it('escolhe a maior sequência da rodada e inclui jogos do mesmo horário que pontuaram', async () => {
      const horario = '2026-11-02T20:00:00Z';
      const jogos = [
        criarJogo('cor', 33, 2, 0, '2026-10-30T23:00:00Z'),
        criarJogo('cfc', 33, 2, 0, '2026-10-31T19:00:00Z'),
        criarJogo('rbb', 34, 2, 1, horario),
        criarJogo('cha', 34, 1, 2, '2026-11-03T22:30:00Z'),
        criarJogo('int', 34, 1, 0, '2026-11-04T00:30:00Z'),
        criarJogo('a-fla', 34, 3, 1, '2026-11-04T22:30:00Z'),
        criarJogo('z-cap', 34, 1, 3, '2026-11-04T22:30:00Z'),
      ];
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) => {
          if (rodada === 34 || rodada === 33)
            return Promise.resolve(jogos.filter((j) => j.rodada === rodada));
          return Promise.resolve([]);
        },
      );
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'cor', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'cfc', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'rbb', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'cha', usuarioId: 'user-1', golsCasa: 1, golsFora: 2 },
        { jogoId: 'int', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'a-fla', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'z-cap', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
      ]);

      const melhor = await service.calcularMelhorSequenciaResultado(
        'user-1',
        'fase-1',
        34,
      );

      expect(melhor).toMatchObject({
        quantidade: 5,
        pontos: 9,
        rodadaInicio: 33,
        rodadaFim: 34,
      });
      expect(melhor!.ultimosJogos.map((jogo) => jogo.golsCasa)).toEqual([
        2, 2, 2, 1, 1,
      ]);
    });

    it('prefere a sequência só da rodada atual quando ela soma mais pontos', async () => {
      const jogos = [
        criarJogo('zero-33', 33, 1, 0, '2026-10-29T22:00:00Z'),
        criarJogo('fim-a', 33, 2, 0, '2026-10-30T23:00:00Z'),
        criarJogo('fim-b', 33, 2, 0, '2026-10-31T19:00:00Z'),
        criarJogo('ini-a', 34, 2, 1, '2026-11-02T23:00:00Z'),
        criarJogo('ini-b', 34, 1, 0, '2026-11-03T22:30:00Z'),
        criarJogo('quebra', 34, 0, 1, '2026-11-04T22:30:00Z'),
        criarJogo('solo-a', 34, 3, 1, '2026-11-05T22:30:00Z'),
        criarJogo('solo-b', 34, 2, 0, '2026-11-06T00:30:00Z'),
        criarJogo('solo-c', 34, 1, 0, '2026-11-06T19:00:00Z'),
      ];
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) =>
          Promise.resolve(jogos.filter((jogo) => jogo.rodada === rodada)),
      );
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'zero-33', usuarioId: 'user-1', golsCasa: 0, golsFora: 1 },
        { jogoId: 'fim-a', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'fim-b', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'ini-a', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'ini-b', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'quebra', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'solo-a', usuarioId: 'user-1', golsCasa: 3, golsFora: 1 },
        { jogoId: 'solo-b', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'solo-c', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const melhor = await service.calcularMelhorSequenciaResultado(
        'user-1',
        'fase-1',
        34,
      );

      expect(melhor).toMatchObject({
        quantidade: 3,
        pontos: 9,
        rodadaInicio: 34,
        rodadaFim: 34,
      });
    });

    it('mantém a sequência cruzada quando a rodada atual sozinha soma menos', async () => {
      const jogos = [
        criarJogo('fim-a', 33, 2, 0, '2026-10-30T23:00:00Z'),
        criarJogo('fim-b', 33, 2, 0, '2026-10-31T19:00:00Z'),
        criarJogo('ini-a', 34, 2, 1, '2026-11-02T23:00:00Z'),
        criarJogo('ini-b', 34, 1, 0, '2026-11-03T22:30:00Z'),
        criarJogo('quebra', 34, 0, 1, '2026-11-04T22:30:00Z'),
        criarJogo('solo-a', 34, 2, 0, '2026-11-05T22:30:00Z'),
      ];
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) =>
          Promise.resolve(jogos.filter((jogo) => jogo.rodada === rodada)),
      );
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'fim-a', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'fim-b', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'ini-a', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'ini-b', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'quebra', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'solo-a', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const melhor = await service.calcularMelhorSequenciaResultado(
        'user-1',
        'fase-1',
        34,
      );

      expect(melhor).toMatchObject({
        quantidade: 4,
        pontos: 6,
        rodadaInicio: 33,
        rodadaFim: 34,
      });
    });

    it('não menciona a rodada anterior quando o último horário dela tem zero', async () => {
      const horario = '2026-10-31T22:30:00Z';
      const jogos = [
        criarJogo('antes', 33, 2, 1, '2026-10-30T20:00:00Z'),
        criarJogo('a-fla', 33, 2, 0, horario),
        criarJogo('z-cap', 33, 1, 3, horario),
        criarJogo('r34a', 34, 2, 1, '2026-11-02T23:00:00Z'),
        criarJogo('r34b', 34, 1, 2, '2026-11-03T22:30:00Z'),
        criarJogo('r34c', 34, 1, 0, '2026-11-04T00:30:00Z'),
      ];
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) =>
          Promise.resolve(jogos.filter((jogo) => jogo.rodada === rodada)),
      );
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'antes', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'a-fla', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'z-cap', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'r34a', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'r34b', usuarioId: 'user-1', golsCasa: 1, golsFora: 2 },
        { jogoId: 'r34c', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const melhor = await service.calcularMelhorSequenciaResultado(
        'user-1',
        'fase-1',
        34,
      );

      expect(melhor).toMatchObject({
        quantidade: 3,
        pontos: 9,
        rodadaInicio: 34,
        rodadaFim: 34,
      });
    });
  });

  describe('calcularMelhoresSequenciasBatch', () => {
    it('calcula sequência por usuário em uma única carga de jogos/palpites', async () => {
      const jogos = [
        criarJogo('j1', 5, 1, 0, '2026-11-01T10:00:00Z'),
        criarJogo('j2', 5, 2, 0, '2026-11-01T14:00:00Z'),
        criarJogo('j3', 5, 1, 1, '2026-11-01T18:00:00Z'),
      ];
      mockJogoRepo.buscarPorFase.mockImplementation(
        (_faseId: string, rodada: number) =>
          Promise.resolve(rodada === 5 ? jogos : []),
      );
      mockPalpiteRepo.listarPorJogosEUsuarios.mockResolvedValue([
        { jogoId: 'j1', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'j2', usuarioId: 'user-1', golsCasa: 2, golsFora: 0 },
        { jogoId: 'j3', usuarioId: 'user-1', golsCasa: 1, golsFora: 1 },
        { jogoId: 'j1', usuarioId: 'user-2', golsCasa: 0, golsFora: 0 },
      ]);

      const mapa = await service.calcularMelhoresSequenciasBatch(
        ['user-1', 'user-2'],
        'fase-1',
        5,
      );

      expect(mapa.get('user-1')).toMatchObject({
        quantidade: 3,
        pontos: 9,
      });
      expect(mapa.get('user-2')).toBeNull();
      expect(mockPalpiteRepo.listarPorJogosEUsuarios).toHaveBeenCalledOnce();
    });

    it('retorna null por usuário quando há menos de 2 finalizados', async () => {
      mockJogoRepo.buscarPorFase.mockResolvedValue([criarJogo('j1', 5, 1, 0)]);

      const mapa = await service.calcularMelhoresSequenciasBatch(
        ['user-1'],
        'fase-1',
        5,
      );

      expect(mapa.get('user-1')).toBeNull();
    });
  });

  describe('listarEsquecidosBatch / listarCravadasDaRodada', () => {
    it('lista esquecidos em batch por usuário', async () => {
      mockJogoRepo.buscarTodosPorTemporada.mockResolvedValue([
        criarJogo('j1', 5, 1, 0, '2026-11-01T10:00:00Z'),
        criarJogo('j2', 5, 2, 1, '2026-11-01T14:00:00Z'),
      ]);
      mockPalpiteRepo.listarPorJogosEUsuarios.mockResolvedValue([
        { jogoId: 'j1', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const mapa = await service.listarEsquecidosBatch(
        ['user-1', 'user-2'],
        'temp-1',
        5,
      );

      expect(mapa.get('user-1')?.map((j) => j.jogoId)).toEqual(['j2']);
      expect(mapa.get('user-2')?.map((j) => j.jogoId)).toEqual(['j1', 'j2']);
    });

    it('lista cravadas da rodada do usuário', async () => {
      mockJogoRepo.buscarTodosPorTemporada.mockResolvedValue([
        criarJogo('j1', 5, 1, 0, '2026-11-01T10:00:00Z'),
        criarJogo('j2', 5, 2, 1, '2026-11-01T14:00:00Z'),
      ]);
      mockPalpiteRepo.buscarPorUsuarioEJogos.mockResolvedValue([
        { jogoId: 'j1', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
        { jogoId: 'j2', usuarioId: 'user-1', golsCasa: 0, golsFora: 0 },
      ]);

      const cravadas = await service.listarCravadasDaRodada(
        'user-1',
        'temp-1',
        5,
      );

      expect(cravadas).toHaveLength(1);
      expect(cravadas[0].jogoId).toBe('j1');
    });

    it('retorna vazio quando rodada é null', async () => {
      expect(
        await service.listarEsquecidosDaRodada('user-1', 'temp-1', null),
      ).toEqual([]);
      expect(
        await service.listarCravadasDaRodada('user-1', 'temp-1', null),
      ).toEqual([]);
    });
  });

  describe('atualizarRecorde', () => {
    it('deve criar novo recorde quando nenhum existe', async () => {
      const resultado = await service.atualizarRecorde(
        'grupo-1',
        'temp-1',
        'MOSCA',
        'user-1',
        3,
      );

      expect(resultado.valor).toBe(3);
      expect(resultado.ehNovoRecorde).toBe(true);
      expect(resultado.detentores).toHaveLength(1);
      expect(resultado.detentores[0].usuarioId).toBe('user-1');
    });

    it('deve atualizar quando valor é maior que recorde existente', async () => {
      await recordeRepo.criar('grupo-1', 'temp-1', 'MOSCA', 2, 'user-2');

      const resultado = await service.atualizarRecorde(
        'grupo-1',
        'temp-1',
        'MOSCA',
        'user-1',
        4,
      );

      expect(resultado.valor).toBe(4);
      expect(resultado.ehNovoRecorde).toBe(true);
      expect(resultado.detentores).toHaveLength(1);
      expect(resultado.detentores[0].usuarioId).toBe('user-1');
    });

    it('deve adicionar detentor quando empata com recorde existente', async () => {
      await recordeRepo.criar('grupo-1', 'temp-1', 'MOSCA', 3, 'user-2');

      const resultado = await service.atualizarRecorde(
        'grupo-1',
        'temp-1',
        'MOSCA',
        'user-1',
        3,
      );

      expect(resultado.valor).toBe(3);
      expect(resultado.ehNovoRecorde).toBe(false);
      expect(resultado.detentores.length).toBeGreaterThanOrEqual(2);
    });

    it('não deve alterar recorde quando valor é menor', async () => {
      await recordeRepo.criar('grupo-1', 'temp-1', 'MOSCA', 5, 'user-2');

      const resultado = await service.atualizarRecorde(
        'grupo-1',
        'temp-1',
        'MOSCA',
        'user-1',
        3,
      );

      expect(resultado.valor).toBe(5);
      expect(resultado.ehNovoRecorde).toBe(false);
      expect(resultado.detentores).toHaveLength(1);
      expect(resultado.detentores[0].usuarioId).toBe('user-2');
    });
  });
});
