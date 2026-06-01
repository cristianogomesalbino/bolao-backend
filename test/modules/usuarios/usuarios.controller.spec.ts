import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsuariosController } from '@src/modules/usuarios/usuarios.controller';
import { UsuarioPresenter } from '@src/common/presenters';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let mockService: any;

  const userId = 'user-1';
  const user = { id: userId };

  const usuarioMock = {
    id: userId,
    nome: 'João Silva',
    email: 'joao@example.com',
    perfil: 'USER',
    ativo: true,
    grupoFavoritoId: null,
    dataCriacao: new Date(),
    atualizadoEm: new Date(),
  };

  beforeEach(() => {
    mockService = {
      criar: vi.fn().mockResolvedValue(usuarioMock),
      buscarPorId: vi.fn().mockResolvedValue(usuarioMock),
      atualizar: vi.fn().mockResolvedValue(usuarioMock),
      remover: vi.fn().mockResolvedValue({ mensagem: 'Usuário desativado com sucesso' }),
      definirGrupoFavorito: vi.fn().mockResolvedValue({ ...usuarioMock, grupoFavoritoId: 'grupo-1' }),
    };

    controller = new UsuariosController(mockService);
  });

  it('criarUsuario deve chamar service e retornar via presenter', async () => {
    const dto = { nome: 'João', email: 'joao@example.com', senha: 'senha123' };
    const result = await controller.criarUsuario(dto as any);

    expect(mockService.criar).toHaveBeenCalledWith(dto);
    expect(result).toEqual(UsuarioPresenter.toHttp(usuarioMock));
  });

  it('buscarPerfil deve chamar service.buscarPorId com user.id', async () => {
    const result = await controller.buscarPerfil(user);

    expect(mockService.buscarPorId).toHaveBeenCalledWith(userId);
    expect(result).toEqual(UsuarioPresenter.toHttp(usuarioMock));
  });

  it('buscarPorId deve chamar service.buscarPorId com param id', async () => {
    const result = await controller.buscarPorId('user-2');

    expect(mockService.buscarPorId).toHaveBeenCalledWith('user-2');
  });

  it('atualizarUsuario deve chamar service.atualizar', async () => {
    const dto = { nome: 'João Atualizado' };
    await controller.atualizarUsuario(userId, dto as any);

    expect(mockService.atualizar).toHaveBeenCalledWith(userId, dto);
  });

  it('definirGrupoFavorito deve chamar service com grupoId do DTO', async () => {
    const dto = { grupoId: 'grupo-1' };
    const result = await controller.definirGrupoFavorito(dto, user);

    expect(mockService.definirGrupoFavorito).toHaveBeenCalledWith(userId, 'grupo-1');
    expect(result).toEqual(UsuarioPresenter.toHttp({ ...usuarioMock, grupoFavoritoId: 'grupo-1' }));
  });

  it('definirGrupoFavorito deve passar null quando grupoId é undefined', async () => {
    const dto = {};
    await controller.definirGrupoFavorito(dto as any, user);

    expect(mockService.definirGrupoFavorito).toHaveBeenCalledWith(userId, null);
  });

  it('removerUsuario deve chamar service.remover', async () => {
    const result = await controller.removerUsuario(userId);

    expect(mockService.remover).toHaveBeenCalledWith(userId);
    expect(result.mensagem).toBeDefined();
  });
});
