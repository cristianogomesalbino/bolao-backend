import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import {
  CredenciaisInvalidasError,
  RefreshNaoFornecidoError,
  RefreshInvalidoError,
  RefreshExpiradoError,
} from '../../common/errors/domain-errors';
import { UsuarioNaoEncontradoError } from '../../common/errors/domain-errors/usuarios.errors';

vi.mock('bcryptjs');

const mockPrisma = {
  usuario: { findUnique: vi.fn() },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
};

const mockJwt = {
  sign: vi.fn(),
  verify: vi.fn(),
};

const mockUsuario = {
  id: 'user-1',
  email: 'joao@example.com',
  senha: 'hashed',
  perfil: 'USER',
  ativo: true,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockPrisma as any, mockJwt as any);
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve limpar tokens antigos e retornar novos tokens', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      mockJwt.sign.mockReturnValueOnce('at').mockReturnValueOnce('rt');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login('joao@example.com', 'senha123');

      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: 'user-1' },
      });
    });

    it('deve lançar se usuário não existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.login('x@x.com', '1')).rejects.toThrow(CredenciaisInvalidasError);
    });

    it('deve lançar se usuário inativo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({ ...mockUsuario, ativo: false });
      await expect(service.login('joao@example.com', '1')).rejects.toThrow(CredenciaisInvalidasError);
    });

    it('deve lançar se senha inválida', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as any).mockResolvedValue(false);
      await expect(service.login('joao@example.com', 'x')).rejects.toThrow(CredenciaisInvalidasError);
    });
  });

  describe('refresh', () => {
    it('deve retornar novo access token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ token: 'v', usuarioId: 'user-1' });
      mockJwt.verify.mockReturnValue({});
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockJwt.sign.mockReturnValue('new-at');
      expect(await service.refresh('v')).toEqual({ accessToken: 'new-at' });
    });

    it('deve lançar se vazio', async () => {
      await expect(service.refresh('')).rejects.toThrow(RefreshNaoFornecidoError);
    });

    it('deve lançar se não existe', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('x')).rejects.toThrow(RefreshInvalidoError);
    });

    it('deve lançar se expirado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ token: 'e', usuarioId: 'user-1' });
      mockJwt.verify.mockImplementation(() => { throw new Error(); });
      await expect(service.refresh('e')).rejects.toThrow(RefreshExpiradoError);
    });

    it('deve lançar se usuário deletado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ token: 'v', usuarioId: 'x' });
      mockJwt.verify.mockReturnValue({});
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.refresh('v')).rejects.toThrow(UsuarioNaoEncontradoError);
    });
  });

  describe('logout', () => {
    it('deve deletar token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.logout('v');
      expect(result.mensagem).toBe('Logout realizado com sucesso');
    });

    it('deve lançar se vazio', async () => {
      await expect(service.logout('')).rejects.toThrow(RefreshNaoFornecidoError);
    });
  });
});
