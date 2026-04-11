import {
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');
jest.mock('../../prisma/prisma.service');
jest.mock('../../common/errors/error.factory', () => ({
  ErrorFactory: {
    unauthorized: (msg: string) => new UnauthorizedException({ erros: [{ mensagens: [msg] }] }),
    notFound: (msg: string) => new NotFoundException({ erros: [{ mensagens: [msg] }] }),
  },
}));

const mockPrisma = {
  usuario: { findUnique: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockUsuario = {
  id: 'user-1',
  email: 'joao@example.com',
  senha: 'hashed',
  perfil: 'USER',
  ativo: true,
};

describe('AuthService', () => {
  let AuthService: any;
  let service: any;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./auth.service');
    AuthService = mod.AuthService;
  });

  beforeEach(() => {
    service = Object.create(AuthService.prototype);
    service.prisma = mockPrisma;
    service.jwtService = mockJwt;
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve limpar tokens antigos e retornar novos tokens', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
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
      await expect(service.login('x@x.com', '1')).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar se usuário inativo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({ ...mockUsuario, ativo: false });
      await expect(service.login('joao@example.com', '1')).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar se senha inválida', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login('joao@example.com', 'x')).rejects.toThrow(UnauthorizedException);
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
      await expect(service.refresh('')).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar se não existe', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('x')).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar se expirado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ token: 'e', usuarioId: 'user-1' });
      mockJwt.verify.mockImplementation(() => { throw new Error(); });
      await expect(service.refresh('e')).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar se usuário deletado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ token: 'v', usuarioId: 'x' });
      mockJwt.verify.mockReturnValue({});
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.refresh('v')).rejects.toThrow(NotFoundException);
    });
  });

  describe('logout', () => {
    it('deve deletar token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.logout('v');
      expect(result.mensagem).toBe('Logout realizado com sucesso');
    });

    it('deve lançar se vazio', async () => {
      await expect(service.logout('')).rejects.toThrow(UnauthorizedException);
    });
  });
});
