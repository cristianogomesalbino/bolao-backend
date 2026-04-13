import { describe, it, expect, beforeEach } from 'vitest';
import { CampeonatoNaoEncontradoError } from '../../common/errors/domain-errors';
import { TemporadasService } from './temporadas.service';
import { InMemoryTemporadaRepository } from './repositories/in-memory-temporada.repository';
import { InMemoryCampeonatoRepository } from '../campeonatos/repositories/in-memory-campeonato.repository';

describe('TemporadasService', () => {
  let service: TemporadasService;
  let temporadaRepo: InMemoryTemporadaRepository;
  let campeonatoRepo: InMemoryCampeonatoRepository;

  beforeEach(() => {
    temporadaRepo = new InMemoryTemporadaRepository();
    campeonatoRepo = new InMemoryCampeonatoRepository();
    service = new TemporadasService(temporadaRepo, campeonatoRepo);
  });

  describe('criar', () => {
    it('deve criar uma temporada quando campeonato existe', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });

      const result = await service.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      expect(result.ano).toBe(2026);
      expect(result.campeonatoId).toBe(campeonato.id);
      expect(result.id).toBeDefined();
      expect(temporadaRepo.items).toHaveLength(1);
    });

    it('deve lançar CampeonatoNaoEncontradoError se campeonato não existe', async () => {
      await expect(
        service.criar({ ano: 2026, campeonatoId: 'inexistente' }),
      ).rejects.toThrow(CampeonatoNaoEncontradoError);
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar temporadas com campeonato incluso', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });
      temporadaRepo.campeonatos = campeonatoRepo.items;
      await service.criar({ ano: 2026, campeonatoId: campeonato.id });

      const result = await service.buscarTodos();

      expect(result).toHaveLength(1);
      expect(result[0].campeonato.nome).toBe('Brasileirão');
    });
  });
});
