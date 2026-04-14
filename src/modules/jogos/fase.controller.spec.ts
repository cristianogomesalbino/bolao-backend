import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaseController } from './fase.controller';
import { FasePresenter } from '../../common/presenters';

describe('FaseController', () => {
  let controller: FaseController;
  const mockFaseService = {
    criar: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
  };

  const faseData = {
    id: 'fase-1',
    nome: 'Rodada 1',
    tipo: 'PONTOS_CORRIDOS',
    ordem: 1,
    idaVolta: false,
    temporadaId: 'temp-1',
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new FaseController(mockFaseService as any);
  });

  describe('criar', () => {
    it('deve chamar faseService.criar com dto + temporadaId e retornar via FasePresenter', async () => {
      mockFaseService.criar.mockResolvedValue(faseData);

      const dto = {
        nome: 'Rodada 1',
        tipo: 'PONTOS_CORRIDOS' as const,
        ordem: 1,
      };
      const result = await controller.criar('temp-1', dto as any);

      expect(mockFaseService.criar).toHaveBeenCalledWith({
        ...dto,
        temporadaId: 'temp-1',
      });
      expect(result).toEqual(FasePresenter.toHttp(faseData));
    });
  });

  describe('listar', () => {
    it('deve chamar faseService.listar e retornar array via FasePresenter', async () => {
      mockFaseService.listar.mockResolvedValue([faseData]);

      const result = await controller.listar('temp-1');

      expect(mockFaseService.listar).toHaveBeenCalledWith('temp-1');
      expect(result).toEqual([FasePresenter.toHttp(faseData)]);
    });
  });

  describe('buscarPorId', () => {
    it('deve chamar faseService.buscarPorId e retornar via FasePresenter', async () => {
      mockFaseService.buscarPorId.mockResolvedValue(faseData);

      const result = await controller.buscarPorId('fase-1');

      expect(mockFaseService.buscarPorId).toHaveBeenCalledWith('fase-1');
      expect(result).toEqual(FasePresenter.toHttp(faseData));
    });
  });
});
