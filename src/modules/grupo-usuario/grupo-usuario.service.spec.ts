import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { GrupoUsuarioService } from './grupo-usuario.service';

const mockGrupo = {
  id: 'grupo-1',
  nome: 'Bolão da Galera',
  ativo: true,
  maxParticipantes: 50,
  codigoConvite: 'ABC12345',
  privado: true,
  temporadaId: 'temp-1',
  createdById: 'user-1',
  permitirPalpiteAutomatico: false,
  dataCriacao: new Date(),
};

const mockRegistro = {
  id: 'gu-1',
  usuarioId: 'user-1',
  grupoId: 'grupo-1',
  role: 'MEMBER' as const,
};

const mockUsuario = {
  id: 'user-2',
  nome: 'Maria',
  email: 'maria@example.com',
};

const mockPrisma = {
  grupo: {
    findUnique: vi.fn(),
  },
  usuario: {
    findUnique: vi.fn(),
  },
  grupoUsuario: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
};

describe('GrupoUsuarioService', () => {
  let service: GrupoUsuarioService;

  beforeEach(() => {
    service = new GrupoUsuarioService(mockPrisma as any);
    vi.clearAllMocks();
  });

  // ==================== entrarPorConvite ====================

  describe('entrarPorConvite', () => {
    it('deve adicionar usuário ao grupo com código válido', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(null);
      mockPrisma.grupoUsuario.count.mockResolvedValue(5);
      mockPrisma.grupoUsuario.create.mockResolvedValue({
        ...mockRegistro,
        grupo: { id: 'grupo-1', nome: 'Bolão da Galera' },
      });

      const result = await service.entrarPorConvite('ABC12345', 'user-1');

      expect(result.grupo.nome).toBe('Bolão da Galera');
      expect(mockPrisma.grupoUsuario.create).toHaveBeenCalledWith({
        data: {
          usuarioId: 'user-1',
          grupoId: 'grupo-1',
          role: 'MEMBER',
        },
        include: {
          grupo: { select: { id: true, nome: true } },
        },
      });
    });

    it('deve lançar NotFoundException se código não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(
        service.entrarPorConvite('INVALIDO', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se grupo está inativo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({
        ...mockGrupo,
        ativo: false,
      });

      await expect(
        service.entrarPorConvite('ABC12345', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar ConflictException se usuário já está no grupo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(mockRegistro);

      await expect(
        service.entrarPorConvite('ABC12345', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('deve lançar BadRequestException se grupo atingiu limite', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({
        ...mockGrupo,
        maxParticipantes: 2,
      });
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(null);
      mockPrisma.grupoUsuario.count.mockResolvedValue(2);

      await expect(
        service.entrarPorConvite('ABC12345', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== adicionarPorEmail ====================

  describe('adicionarPorEmail', () => {
    it('deve adicionar membro por email', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(null);
      mockPrisma.grupoUsuario.count.mockResolvedValue(5);
      mockPrisma.grupoUsuario.create.mockResolvedValue({
        ...mockRegistro,
        usuarioId: 'user-2',
        usuario: { id: 'user-2', nome: 'Maria', email: 'maria@example.com' },
        grupo: { id: 'grupo-1', nome: 'Bolão da Galera' },
      });

      const result = await service.adicionarPorEmail('grupo-1', 'maria@example.com');

      expect(result.usuario.nome).toBe('Maria');
      expect(result.grupo.nome).toBe('Bolão da Galera');
    });

    it('deve lançar NotFoundException se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(
        service.adicionarPorEmail('inexistente', 'maria@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se grupo está inativo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({
        ...mockGrupo,
        ativo: false,
      });

      await expect(
        service.adicionarPorEmail('grupo-1', 'maria@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException se usuário não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.adicionarPorEmail('grupo-1', 'naoexiste@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException se usuário já está no grupo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(mockRegistro);

      await expect(
        service.adicionarPorEmail('grupo-1', 'maria@example.com'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==================== listarMembros ====================

  describe('listarMembros', () => {
    it('deve retornar lista de membros do grupo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(mockGrupo);
      mockPrisma.grupoUsuario.findMany.mockResolvedValue([
        { role: 'ADMIN', usuario: { id: 'user-1', nome: 'João' } },
        { role: 'MEMBER', usuario: { id: 'user-2', nome: 'Maria' } },
      ]);

      const result = await service.listarMembros('grupo-1');

      expect(result).toHaveLength(2);
      expect(result[0].usuario.nome).toBe('João');
      expect(result[0].role).toBe('ADMIN');
    });

    it('deve lançar NotFoundException se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(service.listarMembros('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== sair ====================

  describe('sair', () => {
    it('deve permitir MEMBER sair do grupo', async () => {
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(mockRegistro);
      mockPrisma.grupoUsuario.delete.mockResolvedValue(mockRegistro);

      const result = await service.sair('grupo-1', 'user-1');

      expect(result.mensagem).toBe('Você saiu do grupo');
      expect(mockPrisma.grupoUsuario.delete).toHaveBeenCalled();
    });

    it('deve permitir ADMIN sair se houver outro admin', async () => {
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue({
        ...mockRegistro,
        role: 'ADMIN',
      });
      mockPrisma.grupoUsuario.count.mockResolvedValue(2);
      mockPrisma.grupoUsuario.delete.mockResolvedValue(mockRegistro);

      const result = await service.sair('grupo-1', 'user-1');

      expect(result.mensagem).toBe('Você saiu do grupo');
    });

    it('deve bloquear saída do único ADMIN', async () => {
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue({
        ...mockRegistro,
        role: 'ADMIN',
      });
      mockPrisma.grupoUsuario.count.mockResolvedValue(1);

      await expect(service.sair('grupo-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException se não está no grupo', async () => {
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(null);

      await expect(service.sair('grupo-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== removerMembro ====================

  describe('removerMembro', () => {
    it('deve remover membro do grupo', async () => {
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(mockRegistro);
      mockPrisma.grupoUsuario.delete.mockResolvedValue(mockRegistro);

      const result = await service.removerMembro('grupo-1', 'user-1');

      expect(result.mensagem).toBe('Usuário removido do grupo');
      expect(mockPrisma.grupoUsuario.delete).toHaveBeenCalledWith({
        where: {
          usuarioId_grupoId: { usuarioId: 'user-1', grupoId: 'grupo-1' },
        },
      });
    });

    it('deve lançar NotFoundException se usuário não está no grupo', async () => {
      mockPrisma.grupoUsuario.findUnique.mockResolvedValue(null);

      await expect(
        service.removerMembro('grupo-1', 'user-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
