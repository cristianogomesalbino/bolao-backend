import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampeonatosService } from './campeonatos.service';

const mockCampeonato = {
  id: 'camp-1',
  nome: 'Brasileirão Série A',
};

const mockPrisma = {
  campeonato: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

describe('CampeonatosService', () => {
  let service: CampeonatosService;

  beforeEach(() => {
    service = new CampeonatosService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar um campeonato', async () => {
      mockPrisma.campeonato.create.mockResolvedValue(mockCampeonato);

      const result = await service.criar({ nome: 'Brasileirão Série A' });

      expect(result).toEqual(mockCampeonato);
      expect(mockPrisma.campeonato.create).toHaveBeenCalledWith({
        data: { nome: 'Brasileirão Série A' },
      });
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar lista de campeonatos', async () => {
      mockPrisma.campeonato.findMany.mockResolvedValue([mockCampeonato]);

      const result = await service.buscarTodos();

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Brasileirão Série A');
    });
  });
});
