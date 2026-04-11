import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

const mockUsuario = {
  id: 'user-1',
  nome: 'João Silva',
  email: 'joao@example.com',
  senha: '$2a$10$hashedpassword',
  perfil: 'USER',
  ativo: true,
  dataCriacao: new Date(),
  atualizadoEm: new Date(),
};

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== criar ====================

  describe('criar', () => {
    it('deve criar usuário com sucesso', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.usuario.create.mockResolvedValue(mockUsuario);

      const result = await service.criar({
        nome: 'João Silva',
        email: 'joao@example.com',
        senha: 'senha123',
      });

      expect(result.id).toBe('user-1');
      expect(result.nome).toBe('João Silva');
      expect((result as any).senha).toBeUndefined();
    });

    it('deve lançar ConflictException se email já existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);

      await expect(
        service.criar({
          nome: 'João',
          email: 'joao@example.com',
          senha: 'senha123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==================== listar ====================

  describe('listar', () => {
    it('deve retornar lista de usuários ativos', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([mockUsuario]);

      const result = await service.listar();

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('João Silva');
      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith({
        where: { ativo: true },
      });
    });
  });

  // ==================== buscarPorId ====================

  describe('buscarPorId', () => {
    it('deve retornar usuário por ID', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);

      const result = await service.buscarPorId('user-1');

      expect(result.id).toBe('user-1');
    });

    it('deve lançar NotFoundException se usuário não existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar NotFoundException se usuário está inativo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });

      await expect(service.buscarPorId('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== atualizar ====================

  describe('atualizar', () => {
    it('deve atualizar nome do usuário', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrisma.usuario.update.mockResolvedValue({
        ...mockUsuario,
        nome: 'João Atualizado',
      });

      const result = await service.atualizar('user-1', {
        nome: 'João Atualizado',
      });

      expect(result.nome).toBe('João Atualizado');
    });

    it('deve fazer hash da senha ao atualizar', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockPrisma.usuario.update.mockResolvedValue(mockUsuario);

      await service.atualizar('user-1', { senha: 'novasenha' });

      expect(bcrypt.hash).toHaveBeenCalledWith('novasenha', 10);
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          nome: undefined,
          email: undefined,
          senha: 'new-hash',
        },
      });
    });

    it('deve lançar NotFoundException se usuário não existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.atualizar('inexistente', { nome: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException se usuário está inativo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });

      await expect(
        service.atualizar('user-1', { nome: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== remover ====================

  describe('remover', () => {
    it('deve desativar usuário ativo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrisma.usuario.update.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });

      const result = await service.remover('user-1');

      expect(result.mensagem).toBe('Usuário desativado com sucesso');
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { ativo: false },
      });
    });

    it('deve retornar mensagem se já está inativo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });

      const result = await service.remover('user-1');

      expect(result.mensagem).toBe('Usuário já está inativo');
    });

    it('deve lançar NotFoundException se usuário não existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.remover('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== buscarPorEmail ====================

  describe('buscarPorEmail', () => {
    it('deve retornar usuário pelo email', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);

      const result = await service.buscarPorEmail('joao@example.com');

      expect(result).toEqual(mockUsuario);
    });

    it('deve retornar null se email não existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      const result = await service.buscarPorEmail('naoexiste@example.com');

      expect(result).toBeNull();
    });
  });
});
