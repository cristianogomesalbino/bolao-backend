import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from '@src/modules/auth/auth.controller';
import { AuthService } from '@src/modules/auth/auth.service';
import { RefreshNaoFornecidoError } from '@src/common/errors/domain-errors';

const mockAuthService = {
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  solicitarRecuperacao: vi.fn(),
  resetarSenha: vi.fn(),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue('development'),
};

function criarMockResponse() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;
}

function criarMockRequest(cookies: Record<string, string> = {}) {
  return { cookies } as unknown as Request;
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController(
      mockAuthService as unknown as AuthService,
      mockConfigService as unknown as ConfigService,
    );
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve retornar apenas accessToken no body e setar refreshToken como cookie', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const res = criarMockResponse();
      const result = await controller.login(
        { email: 'joao@example.com', senha: 'senha123' },
        res,
      );

      expect(result).toEqual({ accessToken: 'token' });
      expect(result).not.toHaveProperty('refreshToken');
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'joao@example.com',
        'senha123',
        false,
      );
      const chamadasCookie = (
        res.cookie as unknown as {
          mock: { calls: Array<[unknown, unknown, { maxAge?: number }]> };
        }
      ).mock.calls;
      expect(chamadasCookie[0][2].maxAge).toBeUndefined();
    });

    it('deve persistir o cookie por 30 dias quando continuar logado', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const res = criarMockResponse();
      await controller.login(
        { email: 'joao@example.com', senha: 'senha123', continuarLogado: true },
        res,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'joao@example.com',
        'senha123',
        true,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('deve setar secure: false em ambiente de desenvolvimento', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const res = criarMockResponse();
      await controller.login({ email: 'a@b.com', senha: '123' }, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh',
        expect.objectContaining({ secure: false, sameSite: 'lax', path: '/' }),
      );
    });

    it('deve marcar o cookie como seguro em produção', async () => {
      const config = { get: vi.fn().mockReturnValue('production') };
      const prodController = new AuthController(
        mockAuthService as unknown as AuthService,
        config as unknown as ConfigService,
      );
      mockAuthService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const res = criarMockResponse();
      await prodController.login(
        { email: 'a@b.com', senha: '123', continuarLogado: true },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
    });
  });

  describe('refresh', () => {
    it('deve ler refresh token do cookie, renovar o cookie e retornar novo accessToken', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'novo-refresh',
        continuarLogado: true,
      });

      const req = criarMockRequest({ refreshToken: 'valid-cookie-token' });
      const res = criarMockResponse();
      const result = await controller.refresh(req, res);

      expect(result).toEqual({ accessToken: 'new-token' });
      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        'valid-cookie-token',
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'novo-refresh',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('não redefine o cookie quando a sessão não é persistente', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'mesmo-refresh',
        continuarLogado: false,
      });

      const req = criarMockRequest({ refreshToken: 'valid-cookie-token' });
      const res = criarMockResponse();
      const result = await controller.refresh(req, res);

      expect(result).toEqual({ accessToken: 'new-token' });
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('deve lançar RefreshNaoFornecidoError se cookie não existe', async () => {
      const req = criarMockRequest({});
      const res = criarMockResponse();

      await expect(controller.refresh(req, res)).rejects.toThrow(
        RefreshNaoFornecidoError,
      );
    });
  });

  describe('logout', () => {
    it('deve ler refresh token do cookie, chamar logout e limpar cookie', async () => {
      mockAuthService.logout.mockResolvedValue({
        mensagem: 'Logout realizado com sucesso',
      });

      const req = criarMockRequest({ refreshToken: 'valid-cookie-token' });
      const res = criarMockResponse();
      const result = await controller.logout(req, res);

      expect(result.mensagem).toBe('Logout realizado com sucesso');
      expect(mockAuthService.logout).toHaveBeenCalledWith('valid-cookie-token');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('deve lançar RefreshNaoFornecidoError se cookie não existe', async () => {
      const req = criarMockRequest({});
      const res = criarMockResponse();

      await expect(controller.logout(req, res)).rejects.toThrow(
        RefreshNaoFornecidoError,
      );
    });
  });

  describe('esqueciSenha', () => {
    it('deve chamar authService.solicitarRecuperacao com o email', async () => {
      mockAuthService.solicitarRecuperacao.mockResolvedValue({
        mensagem:
          'Se o email estiver cadastrado, você receberá as instruções de recuperação',
      });

      const result = await controller.esqueciSenha({
        email: 'joao@example.com',
      });

      expect(result.mensagem).toBe(
        'Se o email estiver cadastrado, você receberá as instruções de recuperação',
      );
      expect(mockAuthService.solicitarRecuperacao).toHaveBeenCalledWith(
        'joao@example.com',
      );
    });
  });

  describe('resetarSenha', () => {
    it('deve chamar authService.resetarSenha com token e nova senha', async () => {
      mockAuthService.resetarSenha.mockResolvedValue({
        mensagem: 'Senha alterada com sucesso',
      });

      const result = await controller.resetarSenha({
        token: 'valid-token',
        novaSenha: 'novaSenha123',
        confirmarSenha: 'novaSenha123',
      });

      expect(result.mensagem).toBe('Senha alterada com sucesso');
      expect(mockAuthService.resetarSenha).toHaveBeenCalledWith(
        'valid-token',
        'novaSenha123',
      );
    });
  });
});
