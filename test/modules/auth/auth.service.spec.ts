import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '@src/modules/auth/auth.service';
import type { EmailService } from '@src/modules/auth/email/email.service.interface';
import type { RecuperacaoSenhaRepository } from '@src/modules/auth/repositories/recuperacao-senha.repository.interface';
import type { RefreshTokenRepository } from '@src/modules/auth/repositories/refresh-token.repository.interface';
import type { UsuarioRepository } from '@src/modules/usuarios/repositories/usuario.repository.interface';
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
  rotacionar: vi.fn(),
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
      mockUsuarioRepo as unknown as UsuarioRepository,
      mockRefreshTokenRepo as unknown as RefreshTokenRepository,
      mockRecuperacaoSenhaRepo as unknown as RecuperacaoSenhaRepository,
      mockJwt as unknown as JwtService,
      mockEmailService as unknown as EmailService,
    );
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve limpar tokens antigos e retornar novos tokens', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(mockUsuario);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      mockRefreshTokenRepo.removerPorUsuarioId.mockResolvedValue(undefined);
      mockJwt.sign.mockReturnValueOnce('at').mockReturnValueOnce('rt');
      mockRefreshTokenRepo.criar.mockResolvedValue({});

      const result = await service.login('joao@example.com', 'senha123');

      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
      expect(mockRefreshTokenRepo.removerPorUsuarioId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          lembrar: false,
          tipo: 'refresh',
          sub: 'user-1',
        }),
        { expiresIn: '7d' },
      );
    });

    it('deve estender o refresh para 30 dias quando continuar logado', async () => {
      mockUsuarioRepo.buscarPorEmail.mockResolvedValue(mockUsuario);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('at').mockReturnValueOnce('rt');
      const antes = Date.now();

      await service.login('joao@example.com', 'senha123', true);

      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          lembrar: true,
          tipo: 'refresh',
          sub: 'user-1',
        }),
        { expiresIn: '30d' },
      );
      const chamadas = mockRefreshTokenRepo.criar.mock
        .calls as unknown as Array<[{ expiraEm: Date }]>;
      const expiraEm = chamadas[0][0].expiraEm;
      const duracao = expiraEm.getTime() - antes;
      expect(duracao).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(duracao).toBeLessThan(31 * 24 * 60 * 60 * 1000);
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
      vi.mocked(bcrypt.compare).mockResolvedValue(false);
      await expect(service.login('joao@example.com', 'x')).rejects.toThrow(
        CredenciaisInvalidasError,
      );
    });
  });

  describe('refresh', () => {
    it('deve manter o refresh quando a sessão não é persistente', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'v',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockReturnValue({ lembrar: false });
      mockUsuarioRepo.buscarPorId.mockResolvedValue(mockUsuario);
      mockJwt.sign.mockReturnValueOnce('new-at');

      await expect(service.refresh('v')).resolves.toEqual({
        accessToken: 'new-at',
        refreshToken: 'v',
        continuarLogado: false,
      });
      expect(mockRefreshTokenRepo.rotacionar).not.toHaveBeenCalled();
      expect(mockJwt.sign).toHaveBeenCalledTimes(1);
    });

    it('deve manter o refresh de tokens antigos sem o campo lembrar', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'legado',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockReturnValue({});
      mockUsuarioRepo.buscarPorId.mockResolvedValue(mockUsuario);
      mockJwt.sign.mockReturnValueOnce('new-at');

      await expect(service.refresh('legado')).resolves.toEqual({
        accessToken: 'new-at',
        refreshToken: 'legado',
        continuarLogado: false,
      });
      expect(mockRefreshTokenRepo.rotacionar).not.toHaveBeenCalled();
    });

    it('deve renovar o prazo de 30 dias quando o token era de continuar logado', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'v',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockReturnValue({ lembrar: true });
      mockUsuarioRepo.buscarPorId.mockResolvedValue(mockUsuario);
      mockJwt.sign.mockReturnValueOnce('new-at').mockReturnValueOnce('new-rt');
      let expiraEm = new Date(0);
      mockRefreshTokenRepo.rotacionar.mockImplementation(
        (
          _antigo: string,
          _graciaMs: number,
          emitir: () => { token: string; expiraEm: Date },
        ) => {
          const novo = emitir();
          expiraEm = novo.expiraEm;
          return { status: 'rotacionado', refreshToken: novo.token };
        },
      );
      const antes = Date.now();

      const result = await service.refresh('v');

      expect(result).toEqual({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        continuarLogado: true,
      });
      expect(mockRefreshTokenRepo.rotacionar.mock.calls[0][1]).toBe(60 * 1000);
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ lembrar: true, tipo: 'refresh' }),
        { expiresIn: '30d' },
      );
      const duracao = expiraEm.getTime() - antes;
      expect(duracao).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(duracao).toBeLessThan(31 * 24 * 60 * 60 * 1000);
    });

    it('deve reutilizar o refresh já emitido quando a rotação foi feita agora', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'v',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockReturnValue({ lembrar: true });
      mockUsuarioRepo.buscarPorId.mockResolvedValue(mockUsuario);
      mockJwt.sign.mockReturnValueOnce('new-at');
      mockRefreshTokenRepo.rotacionar.mockResolvedValue({
        status: 'reusado',
        refreshToken: 'ja-emitido',
      });

      await expect(service.refresh('v')).resolves.toEqual({
        accessToken: 'new-at',
        refreshToken: 'ja-emitido',
        continuarLogado: true,
      });
      expect(mockJwt.sign).toHaveBeenCalledTimes(1);
    });

    it('deve invalidar quando o token já foi substituído fora da janela', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'v',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockReturnValue({ lembrar: true });
      mockUsuarioRepo.buscarPorId.mockResolvedValue(mockUsuario);
      mockJwt.sign.mockReturnValue('new-at');
      mockRefreshTokenRepo.rotacionar.mockResolvedValue(null);

      await expect(service.refresh('v')).rejects.toThrow(RefreshInvalidoError);
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

    it('deve invalidar os tokens quando o usuário está inativo', async () => {
      mockRefreshTokenRepo.buscarPorToken.mockResolvedValue({
        token: 'v',
        usuarioId: 'user-1',
      });
      mockJwt.verify.mockReturnValue({ lembrar: true });
      mockUsuarioRepo.buscarPorId.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });

      await expect(service.refresh('v')).rejects.toThrow(RefreshInvalidoError);
      expect(mockRefreshTokenRepo.removerPorUsuarioId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(mockRefreshTokenRepo.rotacionar).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
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
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash');
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
