import { describe, it, expect, beforeEach } from 'vitest';
import { CampeonatosService } from './campeonatos.service';
import { InMemoryCampeonatoRepository } from './repositories/in-memory-campeonato.repository';

describe('CampeonatosService', () => {
  let service: CampeonatosService;
  let campeonatoRepo: InMemoryCampeonatoRepository;

  beforeEach(() => {
    campeonatoRepo = new InMemoryCampeonatoRepository();
    service = new CampeonatosService(campeonatoRepo);
  });

  describe('criar', () => {
    it('deve criar um campeonato', async () => {
      const result = await service.criar({ nome: 'Brasileirão Série A' });
      expect(result.nome).toBe('Brasileirão Série A');
      expect(result.id).toBeDefined();
      expect(campeonatoRepo.items).toHaveLength(1);
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar lista de campeonatos', async () => {
      await service.criar({ nome: 'Brasileirão Série A' });
      const result = await service.buscarTodos();
      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Brasileirão Série A');
    });
  });
});
