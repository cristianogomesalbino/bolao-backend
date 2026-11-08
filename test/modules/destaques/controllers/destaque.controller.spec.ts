import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueController } from '../../../../src/modules/destaques/controllers/destaque.controller';
import type { DestaqueListagemService } from '../../../../src/modules/destaques/services/destaque-listagem.service';
import type { DestaqueReactionService } from '../../../../src/modules/destaques/services/destaque-reaction.service';

describe('DestaqueController', () => {
  let controller: DestaqueController;
  const listagemService = {
    listar: vi.fn(),
    obterRodadasVisiveis: vi.fn(),
    marcarVisualizados: vi.fn(),
  };
  const reactionService = {
    mandarF: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new DestaqueController(
      listagemService as unknown as DestaqueListagemService,
      reactionService as unknown as DestaqueReactionService,
    );
  });

  it('lista destaques delegando ao listagemService', async () => {
    listagemService.listar.mockResolvedValue({
      rodadasDisponiveis: [5],
      destaques: [],
    });

    const resultado = await controller.listarDestaques(
      'grupo-1',
      { id: 'u1' },
      '5',
    );

    expect(listagemService.listar).toHaveBeenCalledWith('grupo-1', 'u1', '5');
    expect(resultado.rodadasDisponiveis).toEqual([5]);
  });

  it('manda F usando rodadas visíveis do filtro', async () => {
    listagemService.obterRodadasVisiveis.mockResolvedValue([5, 4]);
    reactionService.mandarF.mockResolvedValue(3);

    const resultado = await controller.mandarF('grupo-1', 'd-1', { id: 'u1' });

    expect(listagemService.obterRodadasVisiveis).toHaveBeenCalledWith(
      'grupo-1',
    );
    expect(reactionService.mandarF).toHaveBeenCalledWith(
      'd-1',
      'u1',
      'grupo-1',
      [5, 4],
    );
    expect(resultado).toEqual({ contadorFs: 3 });
  });

  it('marca visualizados em batch', async () => {
    listagemService.marcarVisualizados.mockResolvedValue({ registrados: 2 });

    const resultado = await controller.marcarVisualizados(
      'grupo-1',
      { destaqueIds: ['d-1', 'd-2'] },
      { id: 'u1' },
    );

    expect(listagemService.marcarVisualizados).toHaveBeenCalledWith(
      'grupo-1',
      'u1',
      ['d-1', 'd-2'],
    );
    expect(resultado).toEqual({ registrados: 2 });
  });
});
