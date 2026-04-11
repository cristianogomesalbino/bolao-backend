import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockCampeonato = {
  id: 'camp-1',
  nome: 'Brasileirão',
};

const mockTemporada = {
  id: 'temp-1',
  ano: 2026,
  campeonatoId: 'camp-1',
  dataCriacao: new Date(),
  campeonato: mockCampeonato,
};

const mockPrisma = {
  campeonato: {
    findUnique: jest.fn(),
  },
  temporada: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('TemporadasService', () => {
  let service: TemporadasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemporadasService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TemporadasService>(TemporadasService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('criar', () => {
    it('deve criar uma temporada quando campeonato existe', async () => {
      mockPrisma.campeonato.findUnique.mockResolvedValue(mockCampeonato);
      mockPrisma.temporada.create.mockResolvedValue(mockTemporada);

      const result = await service.criar({ ano: 2026, campeonatoId: 'camp-1' });

      expect(result).toEqual(mockTemporada);
      expect(mockPrisma.campeonato.findUnique).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
      });
    });

    it('deve lançar NotFoundException se campeonato não existe', async () => {
      mockPrisma.campeonato.findUnique.mockResolvedValue(null);

      await expect(
        service.criar({ ano: 2026, campeonatoId: 'inexistente' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar temporadas com campeonato incluso', async () => {
      mockPrisma.temporada.findMany.mockResolvedValue([mockTemporada]);

      const result = await service.buscarTodos();

      expect(result).toHaveLength(1);
      expect(result[0].campeonato.nome).toBe('Brasileirão');
      expect(mockPrisma.temporada.findMany).toHaveBeenCalledWith({
        include: { campeonato: true },
      });
    });
  });
});
