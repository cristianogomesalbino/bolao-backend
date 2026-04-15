import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '@src/modules/auth/auth.controller';

const mockAuthService = {
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController(mockAuthService as any);
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve chamar authService.login com email e senha', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const result = await controller.login({
        email: 'joao@example.com',
        senha: 'senha123',
      });

      expect(result.accessToken).toBe('token');
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'joao@example.com',
        'senha123',
      );
    });
  });

  describe('refresh', () => {
    it('deve chamar authService.refresh com o token', async () => {
      mockAuthService.refresh.mockResolvedValue({ accessToken: 'new-token' });
      const result = await controller.refresh({ refreshToken: 'valid' });
      expect(result.accessToken).toBe('new-token');
    });
  });

  describe('logout', () => {
    it('deve chamar authService.logout com o token', async () => {
      mockAuthService.logout.mockResolvedValue({ mensagem: 'Logout realizado com sucesso' });
      const result = await controller.logout({ refreshToken: 'valid' });
      expect(result.mensagem).toBe('Logout realizado com sucesso');
    });
  });
});
