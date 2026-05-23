import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GruposController } from '@src/modules/grupos/grupos.controller';
import { GrupoPresenter } from '@src/common/presenters';
import { GRUPOS } from '@src/modules/grupos/grupos.constants';

describe('GruposController', () => {
  let controller: GruposController;
  const mockService = {
    criar: vi.fn(),
    buscarTodos: vi.fn(),
    buscarPorId: vi.fn(),
    atualizar: vi.fn(),
    atualizarStatus: vi.fn(),
    remover: vi.fn(),
    regenerarCodigoConvite: vi.fn(),
  };

  const grupoData = {
    id: 'grupo-1',
    nome: 'Bolão QA',
    temporadaId: 'temp-1',
    criadoPor: 'user-1',
    privado: true,
    codigoConvite: 'ABCD1234',
    permitirPalpiteAutomatico: false,
    maxParticipantes: 50,
    ativo: true,
    permitirPalpiteDobrado: false,
    dataCriacao: new Date(),
    atualizadoEm: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new GruposController(mockService as any);
  });

  describe('criarGrupo', () => {
    it('deve chamar service.criar e retornar via presenter', async () => {
      mockService.criar.mockResolvedValue(grupoData);

      const dto = { nome: 'Bolão QA', temporadaId: 'temp-1', privado: true };
      const result = await controller.criarGrupo(dto as any, { id: 'user-1' });

      expect(mockService.criar).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(GrupoPresenter.toHttp(grupoData));
    });
  });

  describe('buscarGrupos', () => {
    it('deve retornar lista de grupos via presenter', async () => {
      mockService.buscarTodos.mockResolvedValue([grupoData]);

      const result = await controller.buscarGrupos({}, { id: 'user-1' });

      expect(mockService.buscarTodos).toHaveBeenCalledWith({}, 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(GrupoPresenter.toHttp(grupoData));
    });

    it('deve passar filtros para o service', async () => {
      mockService.buscarTodos.mockResolvedValue([]);

      await controller.buscarGrupos({ membro: true, privado: false, busca: 'bolao' }, { id: 'user-1' });

      expect(mockService.buscarTodos).toHaveBeenCalledWith(
        { membro: true, privado: false, busca: 'bolao' },
        'user-1',
      );
    });
  });

  describe('buscarGrupoPorId', () => {
    it('deve retornar grupo completo via presenter quando é membro', async () => {
      mockService.buscarPorId.mockResolvedValue({ ...grupoData, ehMembro: true });

      const result = await controller.buscarGrupoPorId('grupo-1', { id: 'user-1' });

      expect(mockService.buscarPorId).toHaveBeenCalledWith('grupo-1', 'user-1');
      expect(result).toEqual(GrupoPresenter.toHttp({ ...grupoData, ehMembro: true }));
    });

    it('deve retornar dados básicos quando não é membro', async () => {
      mockService.buscarPorId.mockResolvedValue({ ...grupoData, ehMembro: false });

      const result = await controller.buscarGrupoPorId('grupo-1', { id: 'user-2' });

      expect(result).toEqual(GrupoPresenter.toHttpBasico({ ...grupoData, ehMembro: false }));
      expect(result).not.toHaveProperty('codigoConvite');
    });
  });

  describe('atualizarGrupo', () => {
    it('deve chamar service.atualizar e retornar via presenter', async () => {
      mockService.atualizar.mockResolvedValue({ ...grupoData, nome: 'Novo Nome' });

      const result = await controller.atualizarGrupo('grupo-1', { nome: 'Novo Nome' } as any);

      expect(mockService.atualizar).toHaveBeenCalledWith('grupo-1', { nome: 'Novo Nome' });
      expect(result.nome).toBe('Novo Nome');
    });
  });

  describe('regenerarConvite', () => {
    it('deve chamar service.regenerarCodigoConvite e retornar novo código', async () => {
      mockService.regenerarCodigoConvite.mockResolvedValue({ ...grupoData, codigoConvite: 'NOVO1234' });

      const result = await controller.regenerarConvite('grupo-1');

      expect(mockService.regenerarCodigoConvite).toHaveBeenCalledWith('grupo-1');
      expect(result.codigoConvite).toBe('NOVO1234');
      expect(result.mensagem).toBe(GRUPOS.MENSAGENS.CONVITE_REGENERADO);
    });
  });

  describe('removerGrupo', () => {
    it('deve chamar service.remover', async () => {
      mockService.remover.mockResolvedValue({ mensagem: GRUPOS.MENSAGENS.GRUPO_EXCLUIDO });

      const result = await controller.removerGrupo('grupo-1');

      expect(mockService.remover).toHaveBeenCalledWith('grupo-1');
      expect(result.mensagem).toBe(GRUPOS.MENSAGENS.GRUPO_EXCLUIDO);
    });
  });
});
