import { Test, TestingModule } from '@nestjs/testing';
import { CampeonatosService } from './campeonatos.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockCampeonato = {
  id: 'camp-1',
  nome: 'Brasileirão Série A',
};

const mockPrisma = {
  campeonato: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('CampeonatosService', () => {
  let service: CampeonatosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampeonatosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CampeonatosService>(CampeonatosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
