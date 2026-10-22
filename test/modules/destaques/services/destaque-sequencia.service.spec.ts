import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueSequenciaService } from '../../../../src/modules/destaques/services/destaque-sequencia.service';
import { PontuacaoService } from '../../../../src/modules/ranking/services/pontuacao.service';
import { InMemoryRecordeRepository } from '../../../../src/modules/destaques/repositories/in-memory-recorde.repository';
import type { PalpiteRepository } from '../../../../src/modules/palpites/repositories/palpite.repository.interface';
import type { JogoRepository } from '../../../../src/modules/jogos/repositories/jogo.repository.interface';

describe('DestaqueSequenciaService', () => {
  let service: DestaqueSequenciaService;
  let recordeRepo: InMemoryRecordeRepository;
  let pontuacaoService: PontuacaoService;
  let mockPalpiteRepo: { buscarPorUsuarioEJogos: ReturnType<typeof vi.fn> };
  let mockJogoRepo: { buscarPorFase: ReturnType<typeof vi.fn> };

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
    };
    mockJogoRepo = {
      buscarPorFase: vi.fn().mockResolvedValue([]),
    };

    service = new DestaqueSequenciaService(
      recordeRepo,
      mockPalpiteRepo as unknown as PalpiteRepository,
      mockJogoRepo as unknown as JogoRepository,
      pontuacaoService,
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
      // Rodada 4: 1 jogo acertado
      const jogosRodada4 = [
        criarJogo('jogo-r4', 4, 2, 1, '2024-01-01T10:00:00Z'),
      ];
      // Rodada 5: 1 jogo acertado (sequência de 2)
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
        { jogoId: 'jogo-r4', usuarioId: 'user-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'jogo-r5', usuarioId: 'user-1', golsCasa: 1, golsFora: 0 },
      ]);

      const resultado = await service.calcularSequenciaResultado(
        'user-1',
        'fase-1',
        5,
        'jogo-r5',
      );

      expect(resultado).not.toBeNull();
      expect(resultado!.quantidade).toBe(2);
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
