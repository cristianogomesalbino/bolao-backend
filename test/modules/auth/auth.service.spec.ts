import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '@src/modules/auth/auth.service';
import {
  CredenciaisInvalidasError,
  RefreshNaoFornecidoError,
  RefreshInvalidoError,
  RefreshExpiradoError,
  TokenRecuperacaoInvalidoError,
  TokenRecuperacaoExpiradoError,
} from '@src/common/errors/domain-errors';
import { UsuarioNaoEncontradoError } from '@src/common/errors/domain-errors/usuarios.errors';

vi.mock('bcryptjs');

const mockUsuarioRepo = {
  buscarPorEmail: vi.fn(),
  buscarPorId: vi.fn(),
  atualizar: vi.fn(),
};

const mockRefreshTokenRepo = {
  criar: vi.fn(),
  buscarPorToken: vi.fn(),
  removerPorUsuarioId: vi.fn(),
  removerPorToken: vi.fn(),
};

const mockRecuperacaoSenhaRepo = {
  criar: vi.fn(),
  buscarPorToken: vi.fn(),
  invalidarPorUsuarioId: vi.fn(),
  marcarComoUsado: vi.fn(),
};

const mockJwt = {
  sign: vi.fn(),
  verify: vi.fn(),
};

const mockEmailService = {
  enviarRecuperacaoSenha: vi.fn(),
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
    service = new AuthService(
      mockUsuarioRepo as any,
      mockRefreshTokenRepo as any,
      mockRecuperacaoSenhaRepo as any,
      mockJwt as any,
      mockEmailService as any,
    );
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve limpar tokens antigos e retornar novos tokens', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(mockUsuario);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockRefreshTokenRepo.removerPorUsuarioId.mockResolvedValue(undefined);
      mockJwt.sign.mockReturnValueOnce('at').mockReturnValueOnce('rt');
      mockRefreshTokenRepo.criar.mockResolvedValue({});

      const result = await service.login('joao@example.com', 'senha123');

      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
      expect(mockRefreshTokenRepo.removerPorUsuarioId).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('deve lançar se usuário não existe', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(null);
      await expect(service.login('x@x.com', '1')).rejects.toThrow(
        CredenciaisInvalidasError,
      );
    });

    it('deve lançar se usuário inativo', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });
      await expect(service.login('joao@example.com', '1')).rejects.toThrow(
        CredenciaisInvalidasError,
      );
    });

    it('deve lançar se senha inválida', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(mockUsuario);
      (bcrypt.compare as any).mockResolvedValue(false);
      await expect(service.login('joao@example.com', 'x')).rejects.toThrow(
        CredenciaisInvalidasError,
      );
    });
  });

  describe('refresh', () => {
    it('deve retornar novo access token', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'v',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockReturnValue({});
      mockUsuarioRepo.buscarPorId.mockResolvedValue(mockUsuario);
      mockJwt.sign.mockReturnValue('new-at');
      expect(await service.refresh('v')).toEqual({ accessToken: 'new-at' });
    });

    it('deve lançar se vazio', async () => {
      await expect(service.refresh('')).rejects.toThrow(
        RefreshNaoFornecidoError,
      );
    });

    it('deve lançar se não existe', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue(null);
      await expect(service.refresh('x')).rejects.toThrow(RefreshInvalidoError);
    });

    it('deve lançar se expirado', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'e',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockImplementation(() => {
        throw new Error();
      });
      await expect(service.refresh('e')).rejects.toThrow(RefreshExpiradoError);
    });

    it('deve lançar se usuário deletado', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'v',
        usuarioId: 'x',
      });
      mockJwt.verify.mockReturnValue({});
      mockUsuarioRepo.buscarPorId.mockResolvedValue(null);
      await expect(service.refresh('v')).rejects.toThrow(
        UsuarioNaoEncontradoError,
      );
    });
  });

  describe('logout', () => {
    it('deve deletar token', async () => {
      mockRefreshTokenRepo.removerPorToken.mockResolvedValue(undefined);
      const result = await service.logout('v');
      expect(result.mensagem).toBe('Logout realizado com sucesso');
    });

    it('deve lançar se vazio', async () => {
      await expect(service.logout('')).rejects.toThrow(
        RefreshNaoFornecidoError,
      );
    });
  });

  describe('solicitarRecuperacao', () => {
    it('deve criar token de recuperação para usuário ativo', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(mockUsuario);
      mockRecuperacaoSenhaRepo.invalidarPorUsuarioId.mockResolvedValue(
        undefined,
      );
      mockRecuperacaoSenhaRepo.criar.mockResolvedValue({});
      mockEmailService.enviarRecuperacaoSenha.mockResolvedValue(undefined);

      const result = await service.solicitarRecuperacao('joao@example.com');

      expect(result.mensagem).toBe(
        'Se o email estiver cadastrado, você receberá as instruções de recuperação',
      );
      expect(mockRecuperacaoSenhaRepo.criar).toHaveBeenCalled();
      expect(mockEmailService.enviarRecuperacaoSenha).toHaveBeenCalledWith(
        'joao@example.com',
        expect.any(String),
      );
    });

    it('deve invalidar tokens anteriores não usados', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(mockUsuario);
      mockRecuperacaoSenhaRepo.invalidarPorUsuarioId.mockResolvedValue(
        undefined,
      );
      mockRecuperacaoSenhaRepo.criar.mockResolvedValue({});

      await service.solicitarRecuperacao('joao@example.com');

      expect(
        mockRecuperacaoSenhaRepo.invalidarPorUsuarioId,
      ).toHaveBeenCalledWith('user-1');
    });

    it('deve retornar mesma mensagem para email inexistente (sem vazar informação)', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(null);

      const result = await service.solicitarRecuperacao(
        'naoexiste@example.com',
      );

      expect(result.mensagem).toBe(
        'Se o email estiver cadastrado, você receberá as instruções de recuperação',
      );
      expect(mockRecuperacaoSenhaRepo.criar).not.toHaveBeenCalled();
      expect(mockEmailService.enviarRecuperacaoSenha).not.toHaveBeenCalled();
    });

    it('deve retornar mesma mensagem para usuário inativo (sem vazar informação)', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });

      const result = await service.solicitarRecuperacao('joao@example.com');

      expect(result.mensagem).toBe(
        'Se o email estiver cadastrado, você receberá as instruções de recuperação',
      );
      expect(mockRecuperacaoSenhaRepo.criar).not.toHaveBeenCalled();
    });
  });

  describe('resetarSenha', () => {
    const mockRecuperacao = {
      id: 'rec-1',
      token: 'valid-token',
      usuarioId: 'user-1',
      expiraEm: new Date(Date.now() + 3600000),
      usado: false,
    };

    it('deve resetar senha e invalidar token', async () => {
      mockRecuperacaoSenhaRepo.buscarPorToken.mockResolvedValue(
        mockRecuperacao,
      );
      (bcrypt.hash as any).mockResolvedValue('new-hash');
      mockUsuarioRepo.atualizar.mockResolvedValue({});
      mockRecuperacaoSenhaRepo.marcarComoUsado.mockResolvedValue(undefined);
      mockRefreshTokenRepo.removerPorUsuarioId.mockResolvedValue(undefined);

      const result = await service.resetarSenha('valid-token', 'novaSenha123');

      expect(result.mensagem).toBe('Senha alterada com sucesso');
      expect(mockUsuarioRepo.atualizar).toHaveBeenCalledWith('user-1', {
        senha: 'new-hash',
      });
      expect(mockRecuperacaoSenhaRepo.marcarComoUsado).toHaveBeenCalledWith(
        'rec-1',
      );
      expect(mockRefreshTokenRepo.removerPorUsuarioId).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('deve lançar se token não existe', async () => {
      mockRecuperacaoSenhaRepo.buscarPorToken.mockResolvedValue(null);

      await expect(service.resetarSenha('invalid', 'nova')).rejects.toThrow(
        TokenRecuperacaoInvalidoError,
      );
    });

    it('deve lançar se token já foi usado', async () => {
      mockRecuperacaoSenhaRepo.buscarPorToken.mockResolvedValue({
        ...mockRecuperacao,
        usado: true,
      });

      await expect(service.resetarSenha('used-token', 'nova')).rejects.toThrow(
        TokenRecuperacaoInvalidoError,
      );
    });

    it('deve lançar se token expirado', async () => {
      mockRecuperacaoSenhaRepo.buscarPorToken.mockResolvedValue({
        ...mockRecuperacao,
        expiraEm: new Date(Date.now() - 1000),
      });

      await expect(service.resetarSenha('expired', 'nova')).rejects.toThrow(
        TokenRecuperacaoExpiradoError,
      );
    });
  });
});
