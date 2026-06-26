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

  const palpiteComJogoMock = {
    ...palpiteMock,
    jogo: {
      id: 'jogo-1',
      rodada: 1,
      status: 'AGENDADO',
      dataHora: new Date('2026-03-15T16:00:00.000Z'),
      golsCasa: null,
      golsFora: null,
      foiAdiado: false,
      timeCasa: { id: 'time-a', nome: 'Flamengo', sigla: 'FLA', escudo: 'url' },
      timeFora: {
        id: 'time-b',
        nome: 'Palmeiras',
        sigla: 'PAL',
        escudo: 'url',
      },
    },
  };

  beforeEach(() => {
    mockService = {
      criar: vi.fn().mockResolvedValue(palpiteMock),
      atualizar: vi.fn().mockResolvedValue({ ...palpiteMock, golsCasa: 3 }),
      remover: vi.fn().mockResolvedValue(undefined),
      buscarMeuPalpitePorJogo: vi.fn().mockResolvedValue(palpiteMock),
      buscarMeusPalpitesPorJogos: vi.fn().mockResolvedValue([palpiteMock]),
      listarMeusPalpites: vi.fn().mockResolvedValue([palpiteComJogoMock]),
      listarPorJogoNoGrupo: vi.fn().mockResolvedValue([palpiteMock]),
      buscarEstatisticasPorJogo: vi.fn().mockResolvedValue({
        total: 10,
        vitoriaCasa: 5,
        empate: 3,
        vitoriaFora: 2,
        percentualCasa: 50,
        percentualEmpate: 30,
        percentualFora: 20,
      }),
      criarLote: vi.fn(),
    };

    controller = new PalpiteController(mockService);
  });

  it('criar deve chamar service e retornar via presenter', async () => {
    const result = await controller.criar(
      'jogo-1',
      { golsCasa: 2, golsFora: 1 },
      user,
    );

    expect(mockService.criar).toHaveBeenCalledWith(
      'jogo-1',
      { golsCasa: 2, golsFora: 1 },
      userId,
    );
    expect(result).toEqual(PalpitePresenter.toHttp(palpiteMock));
  });

  it('atualizar deve chamar service e retornar via presenter', async () => {
    const result = await controller.atualizar(
      'palpite-1',
      { golsCasa: 3, golsFora: 0 },
      user,
    );

    expect(mockService.atualizar).toHaveBeenCalledWith(
      'palpite-1',
      { golsCasa: 3, golsFora: 0 },
      userId,
    );
    expect(result.golsCasa).toBe(3);
  });

  it('remover deve chamar service e retornar mensagem', async () => {
    const result = await controller.remover('palpite-1', user);

    expect(mockService.remover).toHaveBeenCalledWith('palpite-1', userId);
    expect(result.mensagem).toBeDefined();
  });

  it('buscarMeuPalpite deve chamar service e retornar via presenter', async () => {
    const result = await controller.buscarMeuPalpite('jogo-1', user);

    expect(mockService.buscarMeuPalpitePorJogo).toHaveBeenCalledWith(
      'jogo-1',
      userId,
    );
    expect(result).toEqual(PalpitePresenter.toHttp(palpiteMock));
  });

  it('buscarMeuPalpite deve retornar null se não tem palpite', async () => {
    mockService.buscarMeuPalpitePorJogo.mockResolvedValueOnce(null);

    const result = await controller.buscarMeuPalpite('jogo-1', user);

    expect(result).toBeNull();
  });

  it('buscarMeusPalpitesPorJogos deve chamar service com jogoIds do DTO', async () => {
    const dto = { jogoIds: ['jogo-1', 'jogo-2'] };
    const result = await controller.buscarMeusPalpitesPorJogos(dto, user);

    expect(mockService.buscarMeusPalpitesPorJogos).toHaveBeenCalledWith(
      ['jogo-1', 'jogo-2'],
      userId,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(PalpitePresenter.toHttp(palpiteMock));
  });

  it('listarMeusPalpites deve retornar array com jogo via presenter', async () => {
    const result = await controller.listarMeusPalpites(user);

    expect(mockService.listarMeusPalpites).toHaveBeenCalledWith(userId, {
      temporadaId: undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0].jogo).toBeDefined();
    expect(result[0].jogo.id).toBe('jogo-1');
    expect(result[0].jogo.timeCasa.sigla).toBe('FLA');
  });

  it('listarMeusPalpites deve passar temporadaId como filtro', async () => {
    await controller.listarMeusPalpites(user, 'temporada-1');

    expect(mockService.listarMeusPalpites).toHaveBeenCalledWith(userId, {
      temporadaId: 'temporada-1',
    });
  });

  it('listarPorJogoNoGrupo deve chamar service sem buscar membros', async () => {
    const result = await controller.listarPorJogoNoGrupo(
      'grupo-1',
      'jogo-1',
      user,
    );

    expect(mockService.listarPorJogoNoGrupo).toHaveBeenCalledWith(
      'jogo-1',
      'grupo-1',
      userId,
    );
    expect(result).toHaveLength(1);
  });

  it('estatisticasPorJogo deve chamar service e retornar estatísticas', async () => {
    const result = await controller.estatisticasPorJogo('grupo-1', 'jogo-1');

    expect(mockService.buscarEstatisticasPorJogo).toHaveBeenCalledWith(
      'jogo-1',
      'grupo-1',
    );
    expect(result.total).toBe(10);
    expect(result.percentualCasa).toBe(50);
    expect(result.percentualEmpate).toBe(30);
    expect(result.percentualFora).toBe(20);
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
    expect(result).toHaveLength(2);
    expect(result[0].sucesso).toBe(true);
    expect(result[0].palpite).toBeDefined();
    expect(result[1].sucesso).toBe(false);
    expect(result[1].erro).toBe('Jogo não encontrado');
  });
});
