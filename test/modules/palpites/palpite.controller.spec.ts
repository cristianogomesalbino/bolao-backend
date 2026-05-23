import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PalpiteController } from '@src/modules/palpites/controllers/palpite.controller';
import { PalpitePresenter } from '@src/common/presenters';

describe('PalpiteController', () => {
  let controller: PalpiteController;
  let mockService: any;

  const userId = 'user-1';
  const user = { id: userId };

  const palpiteMock = {
    id: 'palpite-1',
    golsCasa: 2,
    golsFora: 1,
    jogoId: 'jogo-1',
    usuarioId: userId,
    dataCriacao: new Date(),
    atualizadoEm: new Date(),
  };

  beforeEach(() => {
    mockService = {
      criar: vi.fn().mockResolvedValue(palpiteMock),
      atualizar: vi.fn().mockResolvedValue({ ...palpiteMock, golsCasa: 3 }),
      remover: vi.fn().mockResolvedValue(undefined),
      buscarMeuPalpitePorJogo: vi.fn().mockResolvedValue(palpiteMock),
      listarMeusPalpites: vi.fn().mockResolvedValue([palpiteMock]),
      listarPorJogoNoGrupo: vi.fn().mockResolvedValue([palpiteMock]),
      criarLote: vi.fn(),
    };

    controller = new PalpiteController(mockService);
  });

  it('criar deve chamar service e retornar via presenter', async () => {
    const result = await controller.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, user);

    expect(mockService.criar).toHaveBeenCalledWith('jogo-1', { golsCasa: 2, golsFora: 1 }, userId);
    expect(result).toEqual(PalpitePresenter.toHttp(palpiteMock));
  });

  it('atualizar deve chamar service e retornar via presenter', async () => {
    const result = await controller.atualizar('palpite-1', { golsCasa: 3, golsFora: 0 }, user);

    expect(mockService.atualizar).toHaveBeenCalledWith('palpite-1', { golsCasa: 3, golsFora: 0 }, userId);
    expect(result.golsCasa).toBe(3);
  });

  it('remover deve chamar service e retornar mensagem', async () => {
    const result = await controller.remover('palpite-1', user);

    expect(mockService.remover).toHaveBeenCalledWith('palpite-1', userId);
    expect(result.mensagem).toBeDefined();
  });

  it('buscarMeuPalpite deve chamar service e retornar via presenter', async () => {
    const result = await controller.buscarMeuPalpite('jogo-1', user);

    expect(mockService.buscarMeuPalpitePorJogo).toHaveBeenCalledWith('jogo-1', userId);
    expect(result).toEqual(PalpitePresenter.toHttp(palpiteMock));
  });

  it('listarMeusPalpites deve retornar array via presenter', async () => {
    const result = await controller.listarMeusPalpites(user);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(PalpitePresenter.toHttp(palpiteMock));
  });

  it('listarPorJogoNoGrupo deve chamar service sem buscar membros', async () => {
    const result = await controller.listarPorJogoNoGrupo('grupo-1', 'jogo-1', user);

    expect(mockService.listarPorJogoNoGrupo).toHaveBeenCalledWith('jogo-1', 'grupo-1', userId);
    expect(result).toHaveLength(1);
  });

  it('criarLote deve chamar service.criarLote e retornar resultados', async () => {
    const resultadoLote = [
      { jogoId: 'jogo-1', sucesso: true, palpite: palpiteMock },
      { jogoId: 'jogo-2', sucesso: false, erro: 'Jogo não encontrado' },
    ];
    mockService.criarLote.mockResolvedValue(resultadoLote);

    const dto = {
      palpites: [
        { jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
        { jogoId: 'jogo-2', golsCasa: 0, golsFora: 0 },
      ],
    };
    const result = await controller.criarLote(dto, user);

    expect(mockService.criarLote).toHaveBeenCalledWith(dto.palpites, userId);
    expect(result).toEqual(resultadoLote);
  });
});
