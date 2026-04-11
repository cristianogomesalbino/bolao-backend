import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { GruposService } from './grupos.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('nanoid', () => ({
  nanoid: () => 'ABCD1234',
}));

const mockTemporada = {
  id: 'temp-1',
  ano: 2026,
  campeonatoId: 'camp-1',
};

const mockGrupo = {
  id: 'grupo-1',
  nome: 'Bolão da Galera',
  temporadaId: 'temp-1',
  privado: true,
  codigoConvite: 'ABCD1234',
  permitirPalpiteAutomatico: false,
  maxParticipantes: 50,
  ativo: true,
  createdById: 'user-1',
  dataCriacao: new Date(),
  temporada: {
    id: 'temp-1',
    ano: 2026,
    campeonatoId: 'camp-1',
    campeonato: { id: 'camp-1', nome: 'Brasileirão' },
  },
};

const mockTx = {
  grupo: {
    create: jest.fn(),
  },
  grupoUsuario: {
    create: jest.fn(),
  },
};

const mockPrisma = {
  temporada: {
    findUnique: jest.fn(),
  },
  grupo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  grupoUsuario: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockTx)),
};

describe('GruposService', () => {
  let service: GruposService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GruposService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GruposService>(GruposService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb) => cb(mockTx));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== criar ====================

  describe('criar', () => {
    it('deve criar grupo privado com código de convite', async () => {
      mockPrisma.temporada.findUnique.mockResolvedValue(mockTemporada);
      mockTx.grupo.create.mockResolvedValue(mockGrupo);
      mockTx.grupoUsuario.create.mockResolvedValue({});

      const result = await service.criar(
        {
          nome: 'Bolão da Galera',
          temporadaId: 'temp-1',
          privado: true,
        },
        'user-1',
      );

      expect(result).toEqual(mockGrupo);
      expect(mockTx.grupo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigoConvite: 'ABCD1234',
            privado: true,
            createdById: 'user-1',
          }),
        }),
      );
      expect(mockTx.grupoUsuario.create).toHaveBeenCalledWith({
        data: {
          usuarioId: 'user-1',
          grupoId: 'grupo-1',
          role: 'ADMIN',
        },
      });
    });

    it('deve criar grupo público sem código de convite', async () => {
      mockPrisma.temporada.findUnique.mockResolvedValue(mockTemporada);
      mockTx.grupo.create.mockResolvedValue({
        ...mockGrupo,
        privado: false,
        codigoConvite: null,
      });
      mockTx.grupoUsuario.create.mockResolvedValue({});

      await service.criar(
        {
          nome: 'Bolão Público',
          temporadaId: 'temp-1',
          privado: false,
        },
        'user-1',
      );

      expect(mockTx.grupo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigoConvite: null,
            privado: false,
          }),
        }),
      );
    });

    it('deve lançar NotFoundException se temporada não existe', async () => {
      mockPrisma.temporada.findUnique.mockResolvedValue(null);

      await expect(
        service.criar(
          { nome: 'Teste', temporadaId: 'inexistente', privado: true },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== buscarTodos ====================

  describe('buscarTodos', () => {
    it('deve retornar apenas grupos ativos', async () => {
      mockPrisma.grupo.findMany.mockResolvedValue([mockGrupo]);

      const result = await service.buscarTodos();

      expect(result).toHaveLength(1);
      expect(mockPrisma.grupo.findMany).toHaveBeenCalledWith({
        where: { ativo: true },
        include: expect.any(Object),
      });
    });
  });

  // ==================== buscarPorId ====================

  describe('buscarPorId', () => {
    it('deve retornar grupo por ID', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);

      const result = await service.buscarPorId('grupo-1');

      expect(result.nome).toBe('Bolão da Galera');
    });

    it('deve lançar NotFoundException se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar NotFoundException se grupo está inativo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({
        ...mockGrupo,
        ativo: false,
      });

      await expect(service.buscarPorId('grupo-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== atualizar ====================

  describe('atualizar', () => {
    it('deve atualizar nome do grupo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.grupo.update.mockResolvedValue({
        ...mockGrupo,
        nome: 'Novo Nome',
      });

      const result = await service.atualizar('grupo-1', { nome: 'Novo Nome' });

      expect(result.nome).toBe('Novo Nome');
    });

    it('deve lançar NotFoundException se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(
        service.atualizar('inexistente', { nome: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException se grupo está inativo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({
        ...mockGrupo,
        ativo: false,
      });

      await expect(
        service.atualizar('grupo-1', { nome: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== atualizarStatus ====================

  describe('atualizarStatus', () => {
    it('deve desativar grupo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.grupo.update.mockResolvedValue({
        ...mockGrupo,
        ativo: false,
      });

      const result = await service.atualizarStatus('grupo-1', { ativo: false });

      expect(result.ativo).toBe(false);
    });

    it('deve lançar NotFoundException se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(
        service.atualizarStatus('inexistente', { ativo: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== remover ====================

  describe('remover', () => {
    it('deve excluir grupo inativo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({
        ...mockGrupo,
        ativo: false,
      });
      mockPrisma.grupo.delete.mockResolvedValue({});

      const result = await service.remover('grupo-1');

      expect(result.mensagem).toBe('Grupo excluído com sucesso.');
      expect(mockPrisma.grupo.delete).toHaveBeenCalledWith({
        where: { id: 'grupo-1' },
      });
    });

    it('deve lançar BadRequestException se grupo está ativo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);

      await expect(service.remover('grupo-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(service.remover('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
