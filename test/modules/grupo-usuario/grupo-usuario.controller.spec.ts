import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrupoUsuarioController } from '@src/modules/grupo-usuario/grupo-usuario.controller';
import { GRUPO_USUARIO } from '@src/modules/grupo-usuario/grupo-usuario.constants';

describe('GrupoUsuarioController', () => {
  let controller: GrupoUsuarioController;
  const mockService = {
    entrarPorConvite: vi.fn(),
    adicionarPorEmail: vi.fn(),
    listarMembros: vi.fn(),
    sair: vi.fn(),
    removerMembro: vi.fn(),
    alterarRole: vi.fn(),
  };

  const user = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new GrupoUsuarioController(mockService as any);
  });

  describe('entrar', () => {
    it('deve chamar service.entrarPorConvite', async () => {
      mockService.entrarPorConvite.mockResolvedValue({
        usuarioId: 'user-1',
        grupoId: 'grupo-1',
        role: 'MEMBER',
        grupo: { id: 'grupo-1', nome: 'Bolão' },
      });

      const result = await controller.entrar(
        { codigoConvite: 'ABC12345' },
        user,
      );

      expect(mockService.entrarPorConvite).toHaveBeenCalledWith(
        'ABC12345',
        'user-1',
      );
      expect(result.role).toBe('MEMBER');
    });
  });

  describe('adicionarMembro', () => {
    it('deve chamar service.adicionarPorEmail', async () => {
      mockService.adicionarPorEmail.mockResolvedValue({
        usuarioId: 'user-2',
        grupoId: 'grupo-1',
        role: 'MEMBER',
        usuario: { id: 'user-2', nome: 'Maria' },
      });

      const result = await controller.adicionarMembro('grupo-1', {
        email: 'maria@test.com',
      } as any);

      expect(mockService.adicionarPorEmail).toHaveBeenCalledWith(
        'grupo-1',
        'maria@test.com',
      );
      expect(result.role).toBe('MEMBER');
    });
  });

  describe('listarMembros', () => {
    it('deve retornar lista de membros', async () => {
      mockService.listarMembros.mockResolvedValue([
        { role: 'ADMIN', usuario: { id: 'user-1', nome: 'João' } },
        { role: 'MEMBER', usuario: { id: 'user-2', nome: 'Maria' } },
      ]);

      const result = await controller.listarMembros('grupo-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('sair', () => {
    it('deve chamar service.sair', async () => {
      mockService.sair.mockResolvedValue({
        mensagem: GRUPO_USUARIO.MENSAGENS.SAIU_DO_GRUPO,
      });

      const result = await controller.sair('grupo-1', user);

      expect(mockService.sair).toHaveBeenCalledWith('grupo-1', 'user-1');
      expect(result.mensagem).toBe(GRUPO_USUARIO.MENSAGENS.SAIU_DO_GRUPO);
    });
  });

  describe('removerMembro', () => {
    it('deve chamar service.removerMembro', async () => {
      mockService.removerMembro.mockResolvedValue({
        mensagem: GRUPO_USUARIO.MENSAGENS.USUARIO_REMOVIDO,
      });

      const result = await controller.removerMembro('grupo-1', 'user-2');

      expect(mockService.removerMembro).toHaveBeenCalledWith(
        'grupo-1',
        'user-2',
      );
      expect(result.mensagem).toBe(GRUPO_USUARIO.MENSAGENS.USUARIO_REMOVIDO);
    });
  });

  describe('alterarRole', () => {
    it('deve promover membro sem transferir propriedade', async () => {
      mockService.alterarRole.mockResolvedValue({
        mensagem: GRUPO_USUARIO.MENSAGENS.ROLE_ALTERADO,
      });

      const result = await controller.alterarRole(
        'grupo-1',
        'user-2',
        { role: 'ADMIN' },
        user,
        undefined,
      );

      expect(mockService.alterarRole).toHaveBeenCalledWith(
        'grupo-1',
        'user-2',
        'ADMIN',
        'user-1',
        false,
      );
      expect(result.mensagem).toBe(GRUPO_USUARIO.MENSAGENS.ROLE_ALTERADO);
    });

    it('deve promover membro com transferência de propriedade', async () => {
      mockService.alterarRole.mockResolvedValue({
        mensagem: GRUPO_USUARIO.MENSAGENS.PROPRIEDADE_TRANSFERIDA,
      });

      const result = await controller.alterarRole(
        'grupo-1',
        'user-2',
        { role: 'ADMIN' },
        user,
        'true',
      );

      expect(mockService.alterarRole).toHaveBeenCalledWith(
        'grupo-1',
        'user-2',
        'ADMIN',
        'user-1',
        true,
      );
      expect(result.mensagem).toBe(
        GRUPO_USUARIO.MENSAGENS.PROPRIEDADE_TRANSFERIDA,
      );
    });

    it('deve rebaixar membro para MEMBER', async () => {
      mockService.alterarRole.mockResolvedValue({
        mensagem: GRUPO_USUARIO.MENSAGENS.ROLE_ALTERADO,
      });

      await controller.alterarRole(
        'grupo-1',
        'user-2',
        { role: 'MEMBER' },
        user,
        undefined,
      );

      expect(mockService.alterarRole).toHaveBeenCalledWith(
        'grupo-1',
        'user-2',
        'MEMBER',
        'user-1',
        false,
      );
    });
  });
});
